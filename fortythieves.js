Games.fortythieves = {
  __proto__: FreeCellGame,

  stockType: StockDealToWaste,
  wasteLayout: FanRightLayout,
  pileType: FortyThievesPile,
  pileLayout: FanDownLayout,

  layoutTemplate: "v[2f1f1f1f1f1f1f1f2] [  [sl] w  ] [2p1p1p1p1p1p1p1p1p1p2]",

  dealTemplate: {
    piles: [0, 4],
    waste: [0, 1]
  },

  init: function() {
    const cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
    this.addHintsFor(this.waste.lastChild);
  },

  getLowestMovableCard: "descending, in suit",

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish 2deck",

  // can autoplay 5D when both 4Ds played.  can autoplay any Ace
  getAutoplayableNumbers: function() {
    const fs = this.foundations;
    const nums = [,20,20,20,20]; // suit -> min number seen on fs
    const counts = [,0,0,0,0]; // suit -> num such fs
    for(var i = 0; i != 8; ++i) {
      var c = fs[i].lastChild;
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
