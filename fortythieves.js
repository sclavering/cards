Games.fortythieves = {
  __proto__: FreeCellGame,

  layout: FortyThievesLayout,
  stockType: StockDealToWaste,
  pileType: FortyThievesPile,
  dealTemplate: "P 0,4; W 0,1",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  cards: 2,

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsForLowestMovable(this.piles[i]);
    this.addHintsFor(this.waste.lastCard);
  },

  getLowestMovableCard_helper: "descending, in suit",

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish 2deck",

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
    for(i = 1; i != 5; ++i) {
      if(counts[i] < 2) nums[i] = 1;
      else nums[i]++;
    }
    return nums;
  },

  isWon: "13 cards on each foundation"
};
