Games.towers = {
  __proto__: FreeCellGame,

  layout: TowersLayout,
  pilesToBuild: "4c 4f 10p",
  pileTypes: { p: TowersPile },
  dealMapStr: "P 0 5 ; c 0 0  0 1  0 1  0 0",
  foundationBaseIndexes: [0, 13, 26, 39],

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
};
