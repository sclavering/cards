const GypsyBase = {
  __proto__: Game,

  pileDetails: function() [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 8, GypsyPile, FanDownView, 2, 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p p  (#<f_f><f_f><f_f><f_f>.s)   >.',

  helpId: "gypsy",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i + 4], fs[i + 4].twin = fs[i];
  },

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  getFoundationDestinationFor: function(card) {
    if(!card.isLast) return null;
    if(card.isAce) {
      var twinp = card.twin.pile;
      return twinp.isFoundation && !twinp.twin.hasCards ? twinp.twin : findEmpty(this.foundations);
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

  // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};

gGameClasses.gypsy2 = {
  __proto__: GypsyBase,
  allcards: [4, "SH"]
};

gGameClasses.gypsy4 = {
  __proto__: GypsyBase,
  allcards: [2]
};
