const KlondikeBase = {
  __proto__: Game,

  best_destination_for: best_destination_for__nearest_legal_pile,

  autoplay: autoplay_default,

  autoplayable_predicate: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,

  hasScoring: true,

  getScoreFor: function(act) {
    if(act instanceof RefillStock) return -100;
    if(!(act instanceof Move)) return 0;
    return this._get_score(act) + (act.revealed_card ? 5 : 0);
  },

  _get_score: function(act) {
    const c = act.card, s = act.source, d = act.destination;
    // If a card on the waste *could* be moved down to the playing piles (for 5 points)
    // then award those points event when moving it directly to the foundations.
    if(s.is_waste && d.is_foundation) {
      for(let p of this.piles)
        if(p.may_add_card(c))
          return 15;
      return 10;
    }
    if(d.is_foundation) return s.is_foundation ? 0 : 10;
    if(s.is_foundation) return -15;
    return s.is_waste ? 5 : 0;
  },
};


gGameClasses.klondike1 = {
  __proto__: KlondikeBase,
  helpId: "klondike",
  pile_details: () => ({
    stocks: [1, StockDealToWasteOrRefill, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
    foundations: [4, KlondikeFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.");
  },
};


gGameClasses.klondike3 = {
  __proto__: KlondikeBase,
  pile_details: () => ({
    stocks: [1, StockDeal3OrRefill, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
    foundations: [4, KlondikeFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.", { w: Deal3HWasteView });
  },
};


gGameClasses.doubleklondike = {
  __proto__: KlondikeBase,
  pile_details: () => ({
    stocks: [1, StockDealToWasteOrRefill, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [10, KlondikePile, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1],
    foundations: [8, KlondikeFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<   s w   f f f f f f f f   >.#<   p p p p p p p p p p   >.");
  },

  init_cards: () => make_cards(2),
  foundation_cluster_count: 4,

  // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
  autoplayable_predicate: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};
