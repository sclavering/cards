Games.russiansol = {
  __proto__: BaseCardGame,

  pileType: WaspPile,
  foundationType: FanFoundation,

  layoutTemplate: "h1p1p1p1p1p1p1p1[f f f f]1",
  dealTemplate: "p 0,1 1,5 2,5 3,5 4,5 5,5 6,5",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(!pile.hasCards) continue;
      var last = pile.lastChild, down = last.down;
      if(!down || !down.faceUp) continue;
      var downp = down.parentNode;
      if(downp!=pile && downp.isPile) this.addHint(down, pile);
    }
  },

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
