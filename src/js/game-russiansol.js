gGameClasses.russiansol = {
  __proto__: Game,

  pile_details: () => ({
    piles: [7, WaspPile, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5]],
    foundations: [4, KlondikeFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<   p p p p p p p  [ffff]   >.", { p: FanDownView, f: View });
  },

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: function() {
    return this.autoplay_using_predicate(_ => true);
  },
};
