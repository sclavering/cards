gGameClasses.russiansol = {
  __proto__: Game,

  pileDetails: [
    "p", 7, WaspPile, FanDownView, range(7), [1, 5, 5, 5, 5, 5, 5],
    "f", 4, FanFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p  [ffff]   >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_card,
};
