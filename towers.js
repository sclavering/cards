Games.towers = {
  __proto__: FreeCellGame,

  layout: TowersLayout,
  pileType: TowersPile,
  dealTemplate: "P 0,5; c 0 0,1 0,1 0",
  foundationBaseIndexes: [0, 13, 26, 39],

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstCard);
    for(i = 0; i != 10; i++) this.addHintsForLowestMovable(this.piles[i]);
  },

  getLowestMovableCard_helper: "descending, in suit",

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
};
