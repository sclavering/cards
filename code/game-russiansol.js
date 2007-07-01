Games.russiansol = {
  __proto__: BaseCardGame,

  layout: RussianLayout,
  pilesToBuild: "7p 4f",
  pileTypes: { p: WaspPile, f: FanFoundation },
  dealMapStr: "p 0 1  1 5  2 5  3 5  4 5  5 5  6 5",
  foundationBaseIndexes: [0, 13, 26, 39],

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
