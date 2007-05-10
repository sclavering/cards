Games.freecell = {
  __proto__: FreeCellGame,

  layout: FreeCellLayout,
  pilesToBuild: "4c 4f 8p",
  pileTypes: { p: FreeCellPile },
  dealTemplate: "p 0,7 0,7 0,7 0,7 0,6 0,6 0,6 0,6",
  foundationBaseIndexes: [0, 13, 26, 39],
  cards: 1,

  getHints: function() {
    for(var i = 0; i != 4; ++i) this.addHintsFor(this.cells[i].firstCard);
    for(i = 0; i != 8; i++) this.addHintsForLowestMovable(this.piles[i]);
  },

  getLowestMovableCard_helper: "descending, alt colours",

  // similar to Rules.getBestDestinationFor["legal nonempty, or empty"], but must consider cells,
  // and must check there are enough spaces before moving a card to a space
  getBestDestinationFor: function(card) {
    const pr = card.pile, ps = pr.isPile ? pr.surrounding : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p.hasCards) {
        if(p.mayAddCard(card)) return p;
      } else if(!empty) {
        empty = p;
      }
    }
    return (card.isLast && !card.pile.isCell && this.emptyCell)
        || (empty && empty.mayAddCard(card) ? empty : null);
  },

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation"
};
