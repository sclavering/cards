const YukonBase = {
  __proto__: BaseCardGame,

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  getAutoplayableNumbers: "yukon",

  isWon: "13 cards on each foundation"
};


Games.yukon = {
  __proto__: YukonBase,
  pileDetails: [
    "p", 7, YukonPile, FanDownView, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p  [f_f_f_f]   >.',
  foundationBaseIndexes: [0, 13, 26, 39]
};


Games.sanibel = {
  __proto__: YukonBase,
  pileDetails: [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, YukonPile, FanDownView, 3, 7,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<  s w    f f f f f f f f  >.#<   p p p p p p p p p p   >.',
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  allcards: [2]
};
