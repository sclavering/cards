Games["freecell"] = {
  __proto__: FreeCellGame,

  id: "freecell",
  canMoveCard: "descending, alt colours",
  canMoveToPile: "descending, alt colours",
  getLowestMovableCard: "descending, alt colours",

  deal: function() {
    var cards = shuffle(this.cards);
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 0, 7);
    for(i = 4; i != 8; i++) dealToPile(cards, this.piles[i], 0, 6);
  },

  // test if there are enough spaces/cells to perform a move, not just is it is legal.
  movePossible: function(card, target) {
    // XXX destinaton should be usable in moves, but the moving algorithms are slightly broken
    // count spaces, excluding the destination
    var spaces = 0;
    for(var i = 0; i != 8; i++)
      if(!this.piles[i].hasChildNodes() && this.piles[i]!=target) spaces++;
    var cells = this.countEmptyCells();
    // this is the number we can move using the most complex algorithm
    var numCanMove = (cells+1) * (1 + (spaces * (spaces + 1) / 2));
    // count number of cards to move
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    //
    return numToMove<=numCanMove;
  },

  getHints: function() {
    var i;
    for(i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testCanMoveToEmptyPile(card))
        || (!card.nextSibling && (
             searchPiles(this.cells, testPileIsEmpty)
          || searchPiles(this.foundations, testCanMoveToFoundation(card))));
  },

  autoplayMove: function() {
    var i, last;
    for(i = 0; i != 4; i++) {
      last = this.cells[i].firstChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    for(i = 0; i != 8; i++) {
      last = this.piles[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  canAutoplayCard: function(card) {
    return card.isAce || card.number==2 || countCardsOnFoundations(card.altcolour,card.number-1)==2;
  },

  hasBeenWon: "13 cards on each foundation"
};
