const GypsyBase = {
  __proto__: Game,

  pile_details: () => ({
    stocks: [1, StockDealToPiles, 0, 0],
    piles: [8, GypsyPile, 2, 1],
    foundations: [8, KlondikeFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<   p p p p p p p p  (#<f_f><f_f><f_f><f_f>.s)   >.", { s: StockView, p: FanDownView, f: View });
  },

  helpId: "gypsy",

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: function() {
    // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations(this.foundations));
  },
};

gGameClasses.gypsy2 = {
  __proto__: GypsyBase,
  init_cards: () => make_cards(4, "SH"),
  foundation_cluster_count: 2,
};

gGameClasses.gypsy4 = {
  __proto__: GypsyBase,
  init_cards: () => make_cards(2),
  foundation_cluster_count: 4,
};
