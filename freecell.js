Games.freecell = true;

AllGames.freecell = {
  __proto__: FreeCellGame,

  id: "freecell",
  canMoveCard: "descending, alt colours",
  canMoveToPile: "descending, alt colours",
  getLowestMovableCard: "descending, alt colours",

  init: function() {
    var cards = this.cards = makeDecks(1);

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    var off = [12, -14, -27, -27, 25, 25, 12, -14];
    for(i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var card = cards[k];
        card.autoplayAfterA = cards[k+off[i]];
        card.autoplayAfterB = cards[k+off[i+4]];
        card.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }

    this.foundationBases = [cards[0], cards[13], cards[26], cards[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 0, 7);
    for(i = 4; i != 8; i++) dealToPile(cards, this.piles[i], 0, 6);
  },

  // test if there are enough spaces/cells to perform a move, not just is it is legal.
  movePossible: function(card, target) {
    var spaces = this.countEmptyPiles(target);
    var cells = this.numEmptyCells;
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
        || (!card.nextSibling && (this.emptyCell
          || searchPiles(this.foundations, testCanMoveToFoundation(card))));
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
};
