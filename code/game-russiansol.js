Games.russiansol = {
  __proto__: BaseCardGame,

  layout: RussianLayout,
  pilesToBuild: "7p 4f",
  pileTypes: { p: WaspPile, f: FanFoundation },
  dealTemplate: "p 0,1 1,5 2,5 3,5 4,5 5,5 6,5",
  foundationBaseIndexes: [0, 13, 26, 39],

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(!pile.hasCards) continue;
      var last = pile.lastCard, down = last.down;
      if(!down || !down.faceUp) continue;
      var downp = down.pile;
      if(downp!=pile && downp.isPile) this.addHint(down, pile);
    }
  },

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
