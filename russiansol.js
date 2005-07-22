Games.russiansol = {
  __proto__: BaseCardGame,

  pileType: WaspPile,
  foundationType: FanFoundation,

  layoutTemplate: "h1p1p1p1p1p1p1p1[f f f f]1",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    this.piles[0].dealTo(cards, 0, 1);
    for(var i = 1; i != 7; i++) this.piles[i].dealTo(cards, i, 5);
  },

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(!pile.hasChildNodes()) continue;
      var last = pile.lastChild, down = last.down;
      if(!down || down.faceDown) continue;
      var downp = down.parentNode;
      if(downp!=pile && downp.isPile) this.addHint(down, pile);
    }
  },

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10
  },

  scoreForRevealing: 5
}
