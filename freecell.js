var FreeCell = new CardGame(NO_DRAG_DROP);

FreeCell.init = function() {
  this.shortname = "freecell";
  this.initStacks(8,4,0,false,false,0,0,4);
};



///////////////////////////////////////////////////////////
//// start game
FreeCell.deal = function() {
  var cards = this.shuffleDecks(1);
  for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,7);
  for(var i = 4; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,6);
};



///////////////////////////////////////////////////////////
//// Moving
FreeCell.canMoveCard = FreeCell.canMoveCard_DescendingAltColours;


// this only checks if it is actually legal to make the move, not whether there are enough
// free cells and/or spaces to execute it
FreeCell.canMoveTo = function(card, target) {
  if(target.isCell) return (!target.hasChildNodes() && !card.nextSibling);
  var last = target.lastChild;
  if(target.isFoundation)
    return (last ? card.isSameSuit(last)&&card.isConsecutiveTo(last) : card.isAce());
  if(!last || (last.isConsecutiveTo(card) && last.notSameColour(card))) {
    if(this.movePossible(card,target)) return true;
    // XXX this obviously needs to be made localisable, and moved elsewhere.
    else alert("Insufficient free cells and/or spaces to perform the move.");
  }
  return false;
};
// this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
FreeCell.movePossible = function(card,target) {
  // XXX destinaton should be usable in moves, but the moving algorithms are slightly broken
  // count spaces, excluding the destination
  var spaces = 0;
  for(var i = 0; i < 8; i++)
    if(!this.stacks[i].hasChildNodes() && this.stacks[i]!=target) spaces++;
  // count free cells
  var cells = 0;
  for(var i = 0; i < 4; i++) if(!this.cells[i].hasChildNodes()) cells++;
  // this is the number we can move using the most complex algorithm
  var numCanMove = (cells+1) * (1 + parseInt(spaces * (spaces + 1) / 2));
  // count number of cards to move
  var numToMove = 0;
  for(var next = card; next; next = next.nextSibling) numToMove++;
  //
  return numToMove<=numCanMove;
}


FreeCell.moveTo = function(card, target) {
  var source = card.parentNode;
  var action;
  if(target.isPile) {
    action = "move-between-piles";
    FreeCellMover.move(card,target,this.getFreeCells(),this.getSpaces());
  } else {
    action = target.isCell ? "card-moved-to-cell" : "cards-moved-to-foundation";
    card.moveTo(target);
  }
  this.trackMove(action,card,source);
  return true;
};
FreeCell.getFreeCells = function() {
  var freecells = new Array();
  for(var i = 0; i < 4; i++) if(!this.cells[i].hasChildNodes()) freecells.push(this.cells[i]);
  return freecells;
};
FreeCell.getSpaces = function() {
  var spaces = new Array();
  for(var i = 0; i < 8; i++)
    if(!this.stacks[i].hasChildNodes()) spaces.push(this.stacks[i]);
  return spaces;
};



///////////////////////////////////////////////////////////
//// hint
FreeCell.getHint = function() {
  var card, hint, i;
  for(i = 0; i < 4; i++) {
    card = this.cells[i].firstChild;
    if(!card) continue;
    hint = this.getHintForCard(card);
    if(hint) return hint;
  }
  for(i = 0; i < 8; i++) {
    card = this.getLowestMoveableCard_AltColours(this.stacks[i])
    if(!card) continue;
    hint = this.getHintForCard(card);
    if(hint) return hint;
  }
  return null;
};
FreeCell.getHintForCard = function(card) {
  if(!this.canMoveCard(card)) return null;
  var targets = new Array();
  for(var i = 0; i < 8; i++) {
    var stack = this.stacks[i];
    if(this.canMoveTo(card,stack)) targets.push(stack.lastChild);
  }
  for(var i = 0; i < 4; i++) {
    var stack = this.foundations[i];
    if(this.canMoveTo(card,stack)) targets.push(stack);
  }
  if(targets.length > 0)
    return {source: card, destinations: targets};
  return null;
};



///////////////////////////////////////////////////////////
//// smartmove (moves cards clicked with middle button to best possible destination
FreeCell.smartMove = function(card) {
  // canMoveCard only returns true for last card on a stack.
  if(!this.canMoveCard(card)) return false;
  var destination = this.findMove(card);
  if(destination) this.moveTo(card,destination);
};
FreeCell.findMove = function(card) {
  // move to another stack which has cards on
  for(var i = 0; i < 8; i++)
    if(this.stacks[i].hasChildNodes() && this.canMoveTo(card,this.stacks[i]))
      return this.stacks[i];
  // move to a space
  for(var i = 0; i < 8; i++)
    if(!this.stacks[i].hasChildNodes() && this.canMoveTo(card,this.stacks[i]))
      return this.stacks[i];
  // save some needless calculation
  if(card!=card.parentNode.lastChild)
    return null;
  // move to cell
  for(var i = 0; i < 4; i++)
    if(this.canMoveTo(card,this.cells[i]))
      return this.cells[i];
  // move to foundations
  for(var i = 0; i < 4; i++)
    if(this.canMoveTo(card,this.foundations[i]))
      return this.foundations[i];
  // failed
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
FreeCell.autoplayMove = function() {
  for(var i = 0; i < 4; i++) {
    var last = this.cells[i].firstChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  for(var i = 0; i < 8; i++) {
    var last = this.stacks[i].lastChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
};
// card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
FreeCell.canAutoplayCard = function(card) {
  if(card.number()<=2) return true; // Aces and twos can always be autoplayed
  var altcolour = (card.colour()==RED) ? BLACK : RED;
  if(this.cardsOnFoundations(altcolour,card.number()-1)) return true;
  return false;
};
// if there are two stacks containing a card with number()>=number and colour() == colour, they must be
// different suits and so both cards of specified number and colour are already on suit stacks
// (hence cards of opposite colour and 1 less in number can be autoplayed)
FreeCell.cardsOnFoundations = function(colour, number) {
  var found = 0;
  for(var i = 0; i < 4; i++) {
    var top = this.foundations[i].lastChild;
    if(top && top.number()>=number && top.colour()==colour) found++;
  }
  return (found==2);
};



///////////////////////////////////////////////////////////
//// winning,
FreeCell.hasBeenWon = function() {
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13) return false;
  return true;
};


Games["FreeCell"] = FreeCell;