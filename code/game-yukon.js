const YukonBase = {
  __proto__: BaseCardGame,

  pileTypes: { p: YukonPile },

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  isWon: "13 cards on each foundation"
};


Games.yukon = {
  __proto__: YukonBase,

  layout: YukonLayout,
  pilesToBuild: "7p 4f",
  dealTemplate: "p 0,1 1,5 2,5 3,5 4,5 5,5 6,5",
  foundationBaseIndexes: [0, 13, 26, 39],
  cards: 1,
  getAutoplayableNumbers: "klondike"
};


Games.sanibel = {
  __proto__: YukonBase,

  layout: SanibelLayout,
  pilesToBuild: "s w 8f 10p",
  pileTypes: { s: StockDealToWaste },
  dealTemplate: "P 3,7",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  cards: 2,
  getAutoplayableNumbers: "gypsy"
};
