Games.russiansol = true;

AllGames.russiansol = {
  __proto__: BaseCardGame,

  id: "russiansol",
  layout: "yukon",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    this.piles[0].dealTo(cards, 0, 1);
    for(var i = 1; i != 7; i++) this.piles[i].dealTo(cards, i, 5);
  },

  mayAddCardToPile: "onto .up",

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(!pile.hasChildNodes()) continue;
      var last = pile.lastChild, down = last.down;
      if(!down || down.faceDown) continue;
      var downp = down.parentNode;
      if(downp!=pile && downp.isNormalPile) this.addHint(down, pile);
    }
  },

  getBestMoveForCard: "to up or nearest space",

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "card-revealed": 5,
    "foundation->": -15
  }
}
