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
    dealToPile(cards, this.piles[0], 0, 8);
    dealToPile(cards, this.piles[1], 0, 8);
    for(var i = 2; i != 10; i++) dealToPile(cards, this.piles[i], 0, 10-i);
  },

  canMoveToFoundation: "13 cards, if empty",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testLastIsConsecutive(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i != 10; i++) {
      var pile = this.piles[i];
      var n = pile.childNodes.length - 13;
      if(n>=0 && this.sendToFoundations(pile.childNodes[n])) return true;
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
  cards: [4, 0, 0, 0]
};


AllGames["simon-medium"] = {
  __proto__: SimonBase,
  id: "simon-medium",
  cards: [2, 2, 0, 0]
};


AllGames["simon"] = {
  __proto__: SimonBase,
  id: "simon"
};
