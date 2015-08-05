gGameClasses.fortythieves = {
  __proto__: FreeCellGame,

  pileDetails: [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, FanRightView, 0, 1,
    "p", 10, FortyThievesPile, FanDownView, 0, 4,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   f f f f f f f f   ><   s [w]{colspan=13}>.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  allcards: [2],

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};
