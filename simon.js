Games.simon = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["simon-easy", "simon-medium", "simon"]
};


var SimonBase = {
  __proto__: BaseCardGame,

  layout: "simon",
  canMoveCard: "descending, in suit, not from foundation",
  canMoveToPile: "descending",
  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    if(!("kings" in this)) {
      var cs = this.cards;
      this.kings = [cs[12], cs[25], cs[38], cs[51]];
    }

    dealToPile(cards, this.piles[0], 0, 8);
    dealToPile(cards, this.piles[1], 0, 8);
    for(var i = 2; i != 10; i++) dealToPile(cards, this.piles[i], 0, 10-i);
  },

  canMoveToFoundation: "13 cards, if empty",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: "down and same suit, or down, or empty",

  autoplayMove: function() {
    for(var i = 0; i != 4; i++) {
      var k = this.kings[i], p = k.parentNode;
      if(!p.isNormalPile) continue;
      var n = p.childNodes.length - 13;
      if(n>=0 && p.childNodes[n]==k && this.canMoveCard(k)) return this.moveTo(k, this.firstEmptyFoundation);
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation": 100,
    "move-between-piles":  -1
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
