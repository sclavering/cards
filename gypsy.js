Games["gypsy"] = {
  __proto__: BaseCardGame,

  id: "gypsy",
  difficultyLevels: ["easy-2suits","hard-4suits"],
  dealFromStock: "to piles",
  canMoveCard: "descending, alt colours",
  canMoveToPile: "descending, alt colours",
  getLowestMovableCard: "descending, alt colours",

  init: function() {
    this.cards = {
      1: getCardSuits(4, 4, 0, 0), // easy games - spades and hearts only
      2: getDecks(2)
    };
  },

  deal: function(cards) {
    for(var i = 0; i != 8; i++) dealToPile(cards, this.piles[i], 2, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || searchPiles(this.foundations, testCanMoveToFoundation(card));
  },

  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    if(card.isAce) return this.sendAceToFoundations(card);
    for(var i = 0; i != this.foundations.length; i++)
      if(this.attemptMove(card,this.foundations[i]))
        return true;
    return false;
  },
  sendAceToFoundations: function(ace) {
    // see if there's a matching ace, if so place this one in line with that
    for(var i = 0; i != 8; i++) {
      var f = this.foundations[i];
      if(f.firstChild && f.firstChild.isSameSuit(ace)) {
        var target = this.foundations[i<4 ? i+4 : i-4];
        if(this.attemptMove(ace, target)) return true;
      }
    }
    // otherwise put in the first empty space
    for(var j = 0; j != 8; j++)
      if(this.attemptMove(ace, this.foundations[j]))
        return true;
    return false;
  },

  autoplayMove: function() {
    for(var i = 0; i != 8; i++) {
      var last = this.piles[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  canAutoplayCard: function(card) {
    return card.isAce || card.number==2 || countCardsOnFoundations(card.altcolour,card.number-1)==4;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
