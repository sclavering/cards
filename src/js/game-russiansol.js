gGameClasses.russiansol = {
  __proto__: Game,

  pileDetails: () => [
    "p", 7, WaspPile, FanDownView, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5],
    "f", 4, FanFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p  [ffff]   >.',

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_card,
};
