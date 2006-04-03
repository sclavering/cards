Games.freecell = {
  __proto__: FreeCellGame,

  pileType: FreeCellPile,

  layoutTemplate: "v[1c1c1c1c3f1f1f1f1] [2p1p1p1p1p1p1p1p2]",
  dealTemplate: "p 0,7 0,7 0,7 0,7 0,6 0,6 0,6 0,6",

  init: function() {
    const cards = this.cards = makeDecks(1);
    this.foundationBases = [cards[0], cards[13], cards[26], cards[39]];
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 8; i++) this.addHintsForLowestMovable(this.piles[i]);
  },

  getLowestMovableCard_helper: "descending, alt colours",

  // similar to Rules.getBestDestinationFor["legal nonempty, or empty"], but must consider cells,
  // and must check there are enough spaces before moving a card to a space
  getBestDestinationFor: function(card) {
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

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation"
};
