Games.simon = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["simon-easy", "simon-medium", "simon"]
};


var SimonBase = {
  __proto__: BaseCardGame,

  layout: "simon",
  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    if(!("kings" in this)) {
      var cs = this.cards;
      this.kings = [cs[12], cs[25], cs[38], cs[51]];
    }

    const ps = this.piles;
    ps[0].dealTo(cards, 0, 8);
    ps[1].dealTo(cards, 0, 8);
    for(var i = 2; i != 10; i++) ps[i].dealTo(cards, 0, 10-i);
  },

  mayTakeCardFromPile: "run down, same suit",

  mayTakeCardFromFoundation: "no",

  mayAddCardToFoundation: "13 cards",

  mayAddCardToPile: "down",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: "down and same suit, or down, or empty",

  autoplayMove: function() {
    for(var i = 0; i != 4; i++) {
      var k = this.kings[i], p = k.parentNode;
      if(!p.isNormalPile) continue;
      var n = p.childNodes.length - 13;
      if(n>=0 && p.childNodes[n]==k && k.parentNode.mayTakeCard(k)) return this.moveTo(k, this.firstEmptyFoundation);
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "->foundation": 100,
    "pile->pile": -1
  }
};


AllGames["simon-easy"] = {
  __proto__: SimonBase,
  id: "simon-easy",
  cards: [[SPADE], 4]
};


AllGames["simon-medium"] = {
  __proto__: SimonBase,
  id: "simon-medium",
  cards: [[SPADE, HEART], 2]
};


AllGames["simon"] = {
  __proto__: SimonBase,
  id: "simon"
};
