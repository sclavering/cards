var Towers = {
  __proto__: FreeCellGame,
  
  shortname: "towers"
}



///////////////////////////////////////////////////////////
//// start game
Towers.deal = function() {
  var cards = this.shuffleDecks(1);
  for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],0,5);
  for(var j = 1; j < 3; j++) this.dealToStack(cards,this.cells[j],0,1);
};



///////////////////////////////////////////////////////////
//// Moving
Towers.canMoveCard = Towers.canMoveCard_DescendingInSuit;

Towers.canMoveToPile = function(card, target) {
  var last = target.lastChild;
  return (last ? (last.isConsecutiveTo(card) && last.isSameSuit(card)) : card.isKing());
};

// this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
Towers.movePossible = function(card,target) {
  var numCanMove = 1 + this.countEmptyCells();
  var numToMove = 0;
  for(var next = card; next; next = next.nextSibling) numToMove++;
  return numToMove<=numCanMove;
}



///////////////////////////////////////////////////////////
//// hint
Towers.getHints = function() {
  var card, i;
  for(i = 0; i < 4; i++) {
    this.getHintsForCard(this.cells[i].firstChild);
  }
  for(i = 0; i < 10; i++) {
    card = this.getLowestMoveableCard_Suit(this.stacks[i]);
    this.getHintsForCard(card);
  }
};
Towers.getHintsForCard = function(card) {
  if(!card) return;
  var stack, i;
  for(i = 0; i < 10; i++) {
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
Towers.getBestMoveForCard = function(card) {
  var i;
  // move to another stack which has cards on
  for(i = 0; i < 10; i++)
    if(this.stacks[i].hasChildNodes() && this.canMoveTo(card,this.stacks[i]))
      return this.stacks[i];
  // move to a space
  for(i = 0; i < 10; i++)
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
// cards are always allowed to be autoplayed in Towers
Towers.autoplayMove = function() {
  var i, last;
  for(i = 0; i < 10; i++) {
    last = this.stacks[i].lastChild;
    if(last && this.sendToFoundations(last)) return true;
  }
  for(i = 0; i < 4; i++) {
    last = this.cells[i].firstChild;
    if(last && this.sendToFoundations(last)) return true;
  }
  return false;
};



///////////////////////////////////////////////////////////
//// winning,
Towers.hasBeenWon = function() {
  for(var i = 0; i < 4; i++)
    if(this.foundations[i].childNodes.length!=13) return false;
  return true;
};


Games["Towers"] = Towers;