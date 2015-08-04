Games.freecell = {
  __proto__: FreeCellGame,

  pileDetails: [
    "p", 8, FreeCellPile, FanDownView, 0, [7, 7, 7, 7, 6, 6, 6, 6],
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<  p p p p p p p p  >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: function(card) {
    const p = find_destination__nearest_legal_pile_preferring_nonempty.call(this, card);
    return p || (card.isLast ? this.emptyCell : null);
  },

  autoplay: "commonish",

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};
