Games.fortythieves = {
  __proto__: FreeCellGame,

  pileDetails: [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, FanRightView, 0, 1,
    "p", 10, FortyThievesPile, FanDownView, 0, 4,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  xulTemplate: "v[2f1f1f1f1f1f1f1f2] [  s w] [2p1p1p1p1p1p1p1p1p1p2]",

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  cards: 2,

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  // can autoplay 5D when both 4Ds played.  can autoplay any Ace
  getAutoplayableNumbers: function() {
    const fs = this.foundations;
    const nums = { S: 20, H: 20, D: 20, C: 20}; // suit -> lowest rank seen on fs
    const counts = { S: 0, H: 0, D: 0, C: 0 }; // suit -> num of such on fs
    for(var i = 0; i != 8; ++i) {
      var c = fs[i].lastCard;
      if(!c) continue;
      var suit = c.suit, num = c.number;
      counts[suit]++;
      if(nums[suit] > num) nums[suit] = num;
    }
    for(i in counts) {
      if(counts[i] < 2) nums[i] = 1;
      else nums[i]++;
    }
    return nums;
  },

  isWon: "13 cards on each foundation"
};
