Games.freecell = {
  __proto__: FreeCellGame,

  id: "freecell",
  getLowestMovableCard: "descending, alt colours",

  init: function() {
    var cards = this.cards = makeDecks(1);

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    var off = [12, -14, -27, -27, 25, 25, 12, -14];
    for(var i = 0; i != 4; i++) {
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
    const ps = this.piles;
    for(var i = 0; i != 4; i++) ps[i].dealTo(cards, 0, 7);
    for(i = 4; i != 8; i++) ps[i].dealTo(cards, 0, 6);
    /* a predictable (and illegal) deal for debugging FreeCellMover
    cards = this.cardsAsDealt = this.cards.slice(0);
    const is = [12, 24, 10, 22, 8, 20, 6, 18, 4, 16, 2, 14];
    for(var i = 0; i != is.length; i++) ps[0].addCard(cards[is[i]].setFaceUp());
    for(i = 0; i != 4; i++) this.cells[i].appendChild(cards[51-i]);
    */
  },

  mayTakeCardFromPile: "run down, alt colours",

  mayAddCardToPile: function(card) {
    var last = this.lastChild;
    if(last && (last.colour==card.colour || last.number!=card.upNumber)) return false

    // check there are enough cells+spaces to perform the move

    if(!card.nextSibling) return true;

    var spaces = Game.countEmptyPiles(this, card.parentNode.source);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    var canMove = (Game.numEmptyCells + 1) * (spaces + 1);
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    return (numToMove <= canMove) ? true : 0;
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  // similar to Rules.getBestMoveForCard["legal nonempty, or empty"], but must consider cells,
  // and must check there are enough spaces before moving a card to a space
  getBestMoveForCard: function(card) {
    const pr = card.parentNode, ps = pr.isPile ? pr.surrounding : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p.hasChildNodes()) {
        if(p.mayAddCard(card)) return p;
      } else if(!empty) {
        empty = p;
      }
    }
    return (!card.nextSibling && !card.parentNode.isCell && this.emptyCell)
        || (empty && empty.mayAddCard(card) ? empty : null);
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
};
