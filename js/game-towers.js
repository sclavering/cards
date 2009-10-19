Games.towers = {
  __proto__: FreeCellGame,

  pileDetails: [
    "p", 10, TowersPile, FanDownView, 0, 5,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, [0, 1, 1, 0],
  ],

  xulTemplate: "v[1c1c1c1c5f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",

  foundationBaseIndexes: [0, 13, 26, 39],

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
};
