const KlondikeBase = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, KlondikePile, FanDownView, [0,1,2,3,4,5,6], 1,
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  foundationBaseIndexes: [0, 13, 26, 39],

  getBestDestinationFor: "legal",

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation",

  hasScoring: true,

  getScoreFor: function(act) {
    if(act instanceof RefillStock) return -100;
    if(!(act instanceof Move)) return 0;
    const c = act.card, s = act.source, d = act.destination, ps = this.piles;
    // If a card on the waste *could* be moved down to the playing piles (for 5 points)
    // then award those points event when moving it directly to the foundations.
    if(s.isWaste && d.isFoundation) {
      for(var i = 0; i != ps.length; ++i)
        if(ps[i].mayAddCard(c)) 
          return 15;
      return 10;
    }
    if(d.isFoundation) return s.isFoundation ? 0 : 10;
    if(s.isFoundation) return -15;
    return s.isWaste ? 5 : 0;
  },

  scoreForRevealing: 5
};

Games.klondike1 = {
  __proto__: KlondikeBase,
  helpId: "klondike",
  xulTemplate: "v[2s1w3f1f1f1f2] [1p1p1p1p1p1p1p1]"
};


const Klondike3 = Games.klondike3 = {
  __proto__: KlondikeBase,
  pileDetails: KlondikeBase.pileDetails.slice(), // copy
  xulTemplate: "v[2s1w2f1f1f1f2] [1p1p1p1p1p1p1p1]"
};
Klondike3.pileDetails[2] = Deal3OrRefillStock; // Stock impl
Klondike3.pileDetails[9] = Deal3HWasteView;    // Waste view


Games.doubleklondike = {
  __proto__: KlondikeBase,
  pileDetails: [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, KlondikePile, FanDownView, range(10), 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  xulTemplate: "v[1s1w4f1f1f1f1f1f1f1f1] [1p1p1p1p1p1p1p1p1p1p1]",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  allcards: [2],
  numPreferredFoundationsPerSuit: 2, // == num foundations of a given suit
  getAutoplayableNumbers: "gypsy"
};
