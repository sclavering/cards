const GypsyBase = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 8, GypsyPile, FanDownView, 2, 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p p  (#<f_f><f_f><f_f><f_f>.s)   >.',

  helpId: "gypsy",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
  },

  getBestDestinationFor: "legal nonempty, or empty",

  getFoundationDestinationFor: function(card) {
    if(!card.isLast) return null;
    if(card.isAce) {
      var twinp = card.twin.pile;
      return twinp.isFoundation && !twinp.twin.hasCards ? twinp.twin : this.firstEmptyFoundation;
    }
    var down = card.down, c = down;
    do {
      var p = c.pile;
      if(p.isFoundation && c.isLast) return p;
      c = c.twin;
    } while(c != down);
    return null;
  },

  autoplay: function() {
    const ps = this.piles;
    const nums = this.getAutoplayableNumbers();
    for(var i = 0; i != 8; i++) {
      var last = ps[i].lastCard;
      if(!last || last.number > nums[last.suit]) continue;
      var act = this.getFoundationMoveFor(last);
      if(act) return act;
    }
    return null;
  },

  getAutoplayableNumbers: "gypsy",

  isWon: "13 cards on each foundation"
};

Games.gypsy2 = {
  __proto__: GypsyBase,
  allcards: [4, "SH"]
};

Games.gypsy4 = {
  __proto__: GypsyBase,
  allcards: [2]
};
