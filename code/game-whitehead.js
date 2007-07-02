Games.whitehead = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, WhiteheadPile, FanDownView, 0, [i + 1 for(i in irange(7))],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  xulTemplate: "v[2s1w3f1f1f1f2] [1p1p1p1p1p1p1p1]",

  foundationBaseIndexes: [0, 13, 26, 39],

  init: function() {
    const cs = this.allcards;
    const off = [39, 13, -13, -39]; // offsets to other suit of same colour
    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var c = cs[k];
        c.on = j==12 ? null : cs[k+off[i]+1];
      }
    }
  },

  getBestDestinationFor: function(card) {
    var up = card.up, on = card.on;
    if(up) {
      var p = up.pile;
      if(p.isPile && up.isLast) return p;
    }
    if(on) {
      p = on.pile;
      if(p.isPile && on.isLast) return p;
    }
    return this.firstEmptyPile;
  },

  autoplay: "commonish",

  getAutoplayableNumbers: function() {
    const nums = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap = { S: CLUB, H: DIAMOND, D: HEART, C: SPADE }; // other suit of same colour
    const fs = this.foundations;
    for(var i = 0; i != 4; ++i) {
      var c = fs[i].lastCard;
      if(c) nums[suitmap[c.suit]] = c.upNumber;
    }
    return nums;
  },

  isWon: "13 cards on each foundation"
};
