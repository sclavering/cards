Games.towers = {
  __proto__: FreeCellGame,

  pileDetails: [
    "p", 10, TowersPile, FanDownView, 0, 5,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, [0, 1, 1, 0],
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: find_destination__nearest_legal_pile_or_cell,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_card,
};
