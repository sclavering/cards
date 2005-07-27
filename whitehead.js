Games.whitehead = {
  __proto__: BaseCardGame,

  stockType: StockDealToWaste,
  foundationType: KlondikeFoundation,
  pileType: WhiteheadPile,

  layoutTemplate: "v[1s1w1#1f1f1f1f1] [1p1p1p1p1p1p1p1]",

  dealTemplate: { piles: [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]] },

  init: function() {
    var cs = this.cards = makeDecks(1);

    const off = [39, 13, -13, -39]; // offsets to other suit of same colour
    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var c = cs[k];
        c.on = j==12 ? null : cs[k+off[i]+1];
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, in suit",

  getBestDestinationFor: function(card) {
    var up = card.up, on = card.on;
    if(up) {
      var p = up.parentNode;
      if(p.isPile && !up.nextSibling) return p;
    }
    if(on) {
      p = on.parentNode;
      if(p.isPile && !on.nextSibling) return p;
    }
    return this.firstEmptyPile;
  },

  autoplay: "commonish",

  getAutoplayableNumbers: function() {
    const nums = [,2,2,2,2]; // can always play an Ace or two
    const suitmap = [,CLUB,DIAMOND,HEART,SPADE]; // other suit of same colour
    const fs = this.foundations;
    for(var i = 0; i != 4; ++i) {
      var c = fs[i].lastChild;
      if(c) nums[suitmap[c.suit]] = c.upNumber;
    }
    return nums;
  },

  isWon: "13 cards on each foundation"
};
