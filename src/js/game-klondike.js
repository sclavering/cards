const KlondikeBase = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, KlondikePile, FanDownView, [0,1,2,3,4,5,6], 1,
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,

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
    if(s.isWaste && d.isFoundation) {
      for(let p of this.piles)
        if(p.mayAddCard(c))
          return 15;
      return 10;
    }
    if(d.isFoundation) return s.isFoundation ? 0 : 10;
    if(s.isFoundation) return -15;
    return s.isWaste ? 5 : 0;
  },
};

gGameClasses.klondike1 = {
  __proto__: KlondikeBase,
  helpId: "klondike",
  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',
};


gGameClasses.klondike3 = {
  __proto__: KlondikeBase,
  pileDetails: function() {
    const rv = KlondikeBase.pileDetails();
    rv[2] = Deal3OrRefillStock; // Stock pile
    rv[9] = Deal3HWasteView; // Waste view
    return rv;
  },
  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',
};


gGameClasses.doubleklondike = {
  __proto__: KlondikeBase,
  pileDetails: () => [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, KlondikePile, FanDownView, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<   s w   f f f f f f f f   >.#<   p p p p p p p p p p   >.',

  init_cards: () => make_cards(2),
  foundation_cluster_count: 4,

  // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
  autoplayable_numbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};
