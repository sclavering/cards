Games["whitehead"] = {
  __proto__: BaseCardGame,

  id: "whitehead",
  layout: "klondike",
  dealFromStock: "to waste",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, same colour",
  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, i+1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: function() {
    for(var i in this.sourcePiles) {
      var last = this.sourcePiles[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  canAutoplayCard: function(card) {
    return card.isAce || card.number==2 || countCardsOnFoundations(card.altcolour,card.number-1)==2;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
