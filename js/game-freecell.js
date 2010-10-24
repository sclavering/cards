Games.freecell = {
  __proto__: FreeCellGame,

  pileDetails: [
    "p", 8, FreeCellPile, FanDownView, 0, [7, 7, 7, 7, 6, 6, 6, 6],
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<  p p p p p p p p  >.',

  foundationBaseIndexes: [0, 13, 26, 39],

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
