Games["towers"] = {
  __proto__: FreeCellGame,

  id: "towers",
  rule_canMoveCard: "descending, in suit",
  rule_canMoveToPile: "descending,in-suit,kings-in-spaces",
  rule_getLowestMovableCard: "descending, in suit",

  deal: function() {
    var cards = getShuffledDecks(1);
    for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],0,5);
    for(var j = 1; j < 3; j++) this.dealToStack(cards,this.cells[j],0,1);
  },

  // this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
  movePossible: function(card,target) {
    var numCanMove = 1 + this.countEmptyCells();
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    return numToMove<=numCanMove;
  },

  getHints: function() {
    var i;
    for(i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testCanMoveToEmptyPile(card))
        || (!card.nextSibling && (
             searchPiles(this.cells, testPileIsEmpty)
          || searchPiles(this.foundations, testCanMoveToFoundation(card))));
  },

  // cards are always allowed to be autoplayed in Towers
  autoplayMove: function() {
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
  },

  hasBeenWon: function() {
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13) return false;
    return true;
  }
};

