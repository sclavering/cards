Games.freecell = true;

AllGames.freecell = {
  __proto__: FreeCellGame,

  id: "freecell",
  canMoveCard: "descending, alt colours",
  canMoveToPile: "descending, alt colours",
  getLowestMovableCard: "descending, alt colours",

  init: function() {
    var cards = this.cards = getDecks(1);

    // add pointers to next card up in same suit
    for(var i = 0; i != 51; i++) cards[i].up = cards[i+1];
    cards[12].up = cards[25].up = cards[38].up = cards[51].up = null;

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    var off = [12, -14, -27, -27, 25, 25, 12, -14];
    for(i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var card = cards[k];
        card.autoplayAfterA = cards[k+off[i]];
        card.autoplayAfterB = cards[k+off[i+4]];
        card.mayAutoplay getter= function() {
          return this.autoplayAfterA.parentNode.isFoundation && this.autoplayAfterB.parentNode.isFoundation;
        };
      }
    }
    cards[1].mayAutoplay = cards[14].mayAutoplay = cards[27].mayAutoplay = cards[40].mayAutoplay = true;

    this.aces = [cards[0], cards[13], cards[26], cards[39]];
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

  autoplayMove: function() {
    var lookedForAces = false;
    for(var i = 0; i != 4; i++) {
      var f = this.foundations[i];
      if(f.hasChildNodes()) {
        var c = f.lastChild.up;
        if(c && c.faceUp && !c.nextSibling && c.mayAutoplay) return this.moveTo(c, f);
      } else if(!lookedForAces) {
        lookedForAces = true;
        for(var j = 0; j != 4; j++) {
          var a = this.aces[j];
          if(a.faceUp && !a.parentNode.isFoundation && !a.nextSibling) return this.moveTo(a, f);
        }
      }
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation"
};
