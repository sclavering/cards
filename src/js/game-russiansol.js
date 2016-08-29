gGameClasses.russiansol = {
  __proto__: Game,

  pileDetails: () => [
    "p", 7, WaspPile, FanDownView, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   p p p p p p p  [ffff]   >.',

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate() { return _ => true; },
};
