const GolfBase = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 7, GolfPile, FanDownView, 0, 5,
    "f", 1, GolfFoundation, CountedView, 0, 1,
  ],

  xulTemplate: "v[3s2f3] [2p1p1p1p1p1p1p2]",

  helpId: "golf",

  getBestActionFor: function(card) {
    const f = this.foundation;
    return card.pile.mayTakeCard(card) && f.mayAddCard(card) ? new Move(card, f) : null;
  },

  isWon: function() {
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; ++i) if(ps[i].hasCards) return false;
    return true;
  }
};


Games.golf1 = {
  __proto__: GolfBase,
  init: function() {
    this.cards = makeDecksMod13(1);
  }
};


const Golf2 = Games.golf2 = {
  __proto__: GolfBase,
  init: function() {
    this.cards = makeDecksMod13(2);
  }
};
// tweak to get 8 cards dealt per pile
Golf2.pileDetails = Golf2.pileDetails.slice();
Golf2.pileDetails[11] = 8;
