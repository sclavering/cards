Games["simon"] = {
  __proto__: BaseCardGame,

  id: "simon",
  difficultyLevels: ["easy-1suit","medium-2suits","hard-4suits"],
  canMoveCard: "descending, in suit, not from foundation",
  canMoveToPile: "descending",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cards = this.cards = [];
    cards[1] = getCardSuits(4, 0, 0, 0); // for easy games
    cards[2] = getCardSuits(2, 2, 0, 0); // medium games
    cards[3] = getDecks(1);              // hard games
  },

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
}
