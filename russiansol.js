Games["russiansol"] = {
  __proto__: BaseCardGame,

  id: "russiansol",
  layout: "yukon",
  canMoveToPile: "descending, in suit",

  deal: function() {
    var cards = shuffle(this.cards);
    dealToPile(cards, this.piles[0], 0, 1);
    for(var i = 1; i != 7; i++) dealToPile(cards, this.piles[i], i, 5);
  },

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(pile.hasChildNodes()) this.getHintForPile(pile);
    }
  },
  getHintForPile: function(pile) {
    for(var i = 0; i != 7; i++) {
      var p = this.piles[i];
      if(p==pile) continue;
      for(var card = p.lastChild; card && card.faceUp; card = card.previousSibling) {
        if(!this.canMoveTo(card, pile)) continue;
        this.addHint(card, pile);
        return;
      }
    }
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var last = this.piles[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
