Games.pyramid = {
  __proto__: BaseCardGame,
  pileDetails: [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, PyramidWaste, CountedView, 0, 0,
    "p", 28, PyramidPile, View, 0, 1,
    "f", 1, PyramidFoundation, CountedView, 0, 0,
  ],

  xulTemplate: "h1[s w]1[{flex=5}{class=pyramid}[1p1][4-++p1p++-4][3++p1p1p++3]"
      + "[3-+p1p1p1p+-3][2+p1p1p1p1p+2][2-p1p1p1p1p1p-2][1p1p1p1p1p1p1p1]]1f1",

  layout: { __proto__: _PyramidLayout },

  init: function() {
    const leftkid = [1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26], lknum = 21;
    const ps = this.piles;

    for(var i = 0; i != lknum; ++i) {
      var lk = leftkid[i];
      var p = ps[i], l = ps[lk], r = ps[lk+1];
      p.leftChild = l; l.rightParent = p;
      p.rightChild = r; r.leftParent = p;
    }
  },

  getBestActionFor: function(card) {
    return card.isKing && card.mayTake ? new RemovePair(card, null) : null;
  },

  // this game has no autoplay

  isWon: function() {
    // won when the tip of the pyramid has been removed
    return !this.piles[0].hasCards;
  }
};
