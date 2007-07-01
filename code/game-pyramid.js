Games.pyramid = {
  __proto__: BaseCardGame,

  layout: PyramidLayout,
  pilesToBuild: "s w 28p f",
  pileTypes: { s: StockDealToWasteOrRefill, w: PyramidWaste, f: PyramidFoundation, p: PyramidPile },
  dealMapStr: "P 0 1",

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
