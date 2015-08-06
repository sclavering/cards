gGameClasses.whitehead = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, WhiteheadPile, FanDownView, 0, [i + 1 for(i in irange(7))],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  init: function() {
    const cs = this.allcards;
    const off = [39, 13, -13, -39]; // offsets to other suit of same colour
    for(var i = 0, k = 0; i !== 4; i++) {
      for(var j = 0; j !== 13; j++, k++) {
        var c = cs[k];
        c.on = j === 12 ? null : cs[k + off[i] + 1];
      }
    }
  },

  best_destination_for: function(card) {
    var up = card.up, on = card.on;
    if(up) {
      var p = up.pile;
      if(p.isPile && up.isLast) return p;
    }
    if(on) {
      p = on.pile;
      if(p.isPile && on.isLast) return p;
    }
    return findEmpty(this.piles);
  },

  autoplay: autoplay_default,

  getAutoplayableNumbers: function() {
    const nums = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap = { S: 'C', H: 'D', D: 'H', C: 'S' }; // other suit of same colour
    for(let f of this.foundations) {
      let c = f.lastCard;
      if(c) nums[suitmap[c.suit]] = c.upNumber;
    }
    return nums;
  },
};


const WhiteheadPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    const lst = this.lastCard;
    return !lst || lst === card.up || lst === card.on;
  }
};
