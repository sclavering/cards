var FreeCell =
Games["freecell"] = {
  __proto__: FreeCellGame,

  id: "freecell"
}



///////////////////////////////////////////////////////////
//// start game
FreeCell.deal = function() {
  var cards = this.shuffleDecks(1);
  var i;
  for(i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,7);
  for(i = 4; i < 8; i++) this.dealToStack(cards,this.stacks[i],0,6);
};



///////////////////////////////////////////////////////////
//// Moving
FreeCell.canMoveCard = FreeCell.canMoveCard_DescendingAltColours;

FreeCell.canMoveToPile = function(card, target) {
  var last = target.lastChild;
  return (!last || (last.isConsecutiveTo(card) && last.notSameColour(card)));
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
//// winning, scoring, undo
FreeCell.hasBeenWon = function() {
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13) return false;
  return true;
};
