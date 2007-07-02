Games.acesup = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 4, AcesUpPile, FanDownView, 0, 1,
    "f", 1, AcesUpFoundation, CountedView, 0, 0,
  ],
  xulTemplate: "h2s2p1p1p1p2f2",

  allcards: [null, null, range2(2, 14)], // aces high

  init: function() {
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  },

  getBestDestinationFor: function(card) {
    const f = this.foundation;
    if(card.pile == f) return null;
    if(f.mayAddCard(card)) return f;
    // return next empty pile
    for(var p = card.pile, p2 = p.next; p2 != p; p2 = p2.next)
      if(!p2.hasCards) return p2;
    return null;
  },

  // no autoplay for this game

  isWon: function() {
    if(this.stock.hasCards) return false;
    for(var i = 0; i != 4; i++) {
      var cs = this.piles[i].cards;
      if(cs.length != 1 || !cs[0].isAce) return false;
    }
    return true;
  }
};
