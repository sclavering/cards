Games["towers"] = {
  __proto__: FreeCellGame,

  id: "towers",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, in suit, kings in spaces",
  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], 0, 5);
    for(i = 1; i != 3; i++) dealToPile(cards, this.cells[i], 0, 1);
  },

  // this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
  movePossible: function(card,target) {
    var numCanMove = 1 + this.countEmptyCells();
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    return numToMove<=numCanMove;
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testCanMoveToEmptyPile(card))
        || (!card.nextSibling && (
             searchPiles(this.cells, testPileIsEmpty)
          || searchPiles(this.foundations, testCanMoveToFoundation(card))));
  },

  // cards are always allowed to be autoplayed in Towers
  autoplayMove: function() {
    var i, last;
    for(i = 0; i != 10; i++) {
      last = this.piles[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    for(i = 0; i != 4; i++) {
      last = this.cells[i].firstChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation"
};
