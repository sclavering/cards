const YukonBase = {
  __proto__: BaseCardGame,

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  isWon: "13 cards on each foundation"
};


Games.yukon = {
  __proto__: YukonBase,
  pileDetails: [
    "p", 7, YukonPile, FanDownView, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],
  xulTemplate: "h1p1p1p1p1p1p1p1[f f f f]1",
  foundationBaseIndexes: [0, 13, 26, 39],
  getAutoplayableNumbers: "klondike"
};


Games.sanibel = {
  __proto__: YukonBase,
  pileDetails: [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, YukonPile, FanDownView, 3, 7,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  xulTemplate: "v[1s1w3f1f1f1f1f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  allcards: [2],
  getAutoplayableNumbers: "gypsy"
};
