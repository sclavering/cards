const GypsyBase = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 8, GypsyPile, FanDownView, 2, 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p p  (#<f_f><f_f><f_f><f_f>.s)   >.',

  helpId: "gypsy",

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: function() {
    const nums = this.autoplayable_numbers();
    for(let p of this.piles) {
      let c = p.lastCard;
      if(!c || c.number > nums[c.suit]) continue;
      if(c.isAce) return new Move(c, this.foundation_for_ace(c));
      let act = this.foundation_action_for(c);
      if(act) return act;
    }
    return null;
  },

  // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
  autoplayable_numbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};

gGameClasses.gypsy2 = {
  __proto__: GypsyBase,
  required_cards: [4, "SH"],
  foundation_cluster_count: 2,
};

gGameClasses.gypsy4 = {
  __proto__: GypsyBase,
  required_cards: [2],
  foundation_cluster_count: 4,
};
