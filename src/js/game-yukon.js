const YukonBase = {
  __proto__: Game,

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  // Keeping a 2 down so you can put an Ace on it can be useful if the Ace has other junk on top of it.
  autoplayable_numbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};


gGameClasses.yukon = {
  __proto__: YukonBase,
  pileDetails: () => [
    "p", 7, YukonPile, FanDownView, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p  [f_f_f_f]   >.',
};


gGameClasses.sanibel = {
  __proto__: YukonBase,
  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, YukonPile, FanDownView, 3, 7,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<  s w    f f f f f f f f  >.#<   p p p p p p p p p p   >.',
  init_cards: () => make_cards(2),
  foundation_cluster_count: 4,
};


const YukonPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddToGypsyPile,
  getHintSources: function() {
    return [for(c of this.cards) if(c.faceUp) c];
  },
};
