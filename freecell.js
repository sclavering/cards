var FreeCell = new CardGame(NO_DRAG_DROP);

FreeCell.init = function() {
  this.shortname = "freecell";
  this.initStacks(8,4,0,false,false,0,0,4);
  // insufficient spaces message
  this.insufficientSpacesMessage = document.documentElement.getAttribute("insufficientSpacesMessage");
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


// unlike in other games where this function returns a boolean, here we sometimes return an int.
// false==move impossible (violates rules), 0==not enough spaces for move, true==move possible
// (using 0 means the overall behaviour will match other games, but callers which do want to 
// know about an insufficent spaces result can test if the result ===0)
FreeCell.canMoveTo = function(card, target) {
  if(target.isCell) return this.canMoveToCell(card,target);
  var last = target.lastChild;
  if(target.isFoundation)
    return this.canMoveToFoundation(card, target); // inherited method
  if(!last || (last.isConsecutiveTo(card) && last.notSameColour(card))) {
    if(this.movePossible(card,target)) return true;
    return 0;
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
  var cells = this.countEmptyCells();
  // this is the number we can move using the most complex algorithm
  var numCanMove = (cells+1) * (1 + (spaces * (spaces + 1) / 2));
  // count number of cards to move
  var numToMove = 0;
  for(var next = card; next; next = next.nextSibling) numToMove++;
  //
  return numToMove<=numCanMove;
}

// must override global version to deal with oddities of canMoveTo in Freecell
FreeCell.attemptMove = function(source, target) {
  var can = Game.canMoveTo(source,target)
  if(can) {
    Game.moveTo(source,target);
    return true;
  }
  // insufficient spaces
  if(can===0) {
    // XXX: use prompt service, or thing of some completely different way
    // of informing the user (e.g. status bar, but we don't have one)
    alert(this.insufficientSpacesMessage);
  }
  return false;
}

FreeCell.moveTo = function(card, target) {
  var source = card.parentNode;
  var action;
  if(target.isPile) {
    action = "move-between-piles";
    FreeCellMover.move(card,target,this.getEmptyCells(),this.getEmptyPiles());
  } else {
    action = target.isCell ? "card-moved-to-cell" : "cards-moved-to-foundation";
    card.moveTo(target);
  }
  this.trackMove(action,card,source);
  return true;
};



///////////////////////////////////////////////////////////
//// hint
FreeCell.getHints = function() {
  var card, i;
  for(i = 0; i < 4; i++) {
    this.getHintsForCard(this.cells[i].firstChild);
  }
  for(i = 0; i < 8; i++) {
    card = this.getLowestMoveableCard_AltColours(this.stacks[i]);
    this.getHintsForCard(card);
  }
};
FreeCell.getHintsForCard = function(card) {
  if(!card) return;
  var stack, i;
  for(i = 0; i < 8; i++) {
    stack = this.stacks[i];
    if(this.canMoveTo(card,stack)) this.addHint(card,stack);
  }
  for(i = 0; i < 4; i++) {
    stack = this.foundations[i];
    if(this.canMoveTo(card,stack)) this.addHint(card,stack);
  }
};



///////////////////////////////////////////////////////////
//// smartmove
FreeCell.getBestMoveForCard = function(card) {
  var i;
  // move to another stack which has cards on
  for(i = 0; i < 8; i++)
    if(this.stacks[i].hasChildNodes() && this.canMoveTo(card,this.stacks[i]))
      return this.stacks[i];
  // move to a space
  for(i = 0; i < 8; i++)
    if(!this.stacks[i].hasChildNodes() && this.canMoveTo(card,this.stacks[i]))
      return this.stacks[i];
  // save some needless calculation
  if(card!=card.parentNode.lastChild)
    return null;
  // move to cell
  for(i = 0; i < 4; i++)
    if(this.canMoveTo(card,this.cells[i]))
      return this.cells[i];
  // move to foundations
  for(i = 0; i < 4; i++)
    if(this.canMoveTo(card,this.foundations[i]))
      return this.foundations[i];
  // failed
  return null;
};



///////////////////////////////////////////////////////////
//// Autoplay
FreeCell.autoplayMove = function() {
  var i, last;
  for(i = 0; i < 4; i++) {
    last = this.cells[i].firstChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  for(i = 0; i < 8; i++) {
    last = this.stacks[i].lastChild;
    if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
  }
  return false;
};
// card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
FreeCell.canAutoplayCard = function(card) {
  if(card.isAce() || card.number()==2) return true;
  return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
};



///////////////////////////////////////////////////////////
//// winning,
FreeCell.hasBeenWon = function() {
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13) return false;
  return true;
};


Games["FreeCell"] = FreeCell;