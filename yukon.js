var YukonBase = {
  __proto__: BaseCardGame,

  canMoveToPile: "descending, alt colours",

  // take a card a find another card on a different pile of opposite colour and one less in rank
  getHintsForCard: function(card) {
    if(!card) return;
    for(var i = 0; i != this.piles.length; i++) {
      var pile = this.piles[i];
      if(pile==card.parentNode) continue;
      var current = pile.lastChild;
      while(current && current.faceUp) {
        if(card.isConsecutiveTo(current) && !card.isSameColour(current)) {
          // |current| could be moved onto |card|.  test if it's not already
          // on a card consecutive and of opposite colour
          var prev = current.previousSibling;
          if(!prev || !prev.isConsecutiveTo(current) || prev.isSameColour(current))
            this.addHint(current,card.parentNode);
        }
        current = current.previousSibling;
      }
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || searchPiles(this.foundations, testCanMoveToFoundation(card));
  },

  autoplayMove: function() {
    for(var i in this.sourcePiles) {
      var last = this.sourcePiles[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
};



Games["yukon"] = {
  __proto__: YukonBase,

  id: "yukon",

  deal: function() {
    var cards = shuffle(this.cards);
    dealToPile(cards, this.piles[0], 0, 1);
    for(var i = 1; i != 7; i++) dealToPile(cards, this.piles[i], i, 5);
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each pile for targets, then find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i != 7; i++) this.getHintsForCard(this.piles[i].lastChild);
  },

  canAutoplayCard: function(card) {
    return card.isAce || countCardsOnFoundations(card.altcolour,card.number-1)==2;
  }
};



Games["sanibel"] = {
  __proto__: YukonBase,

  id: "sanibel",
  cards: 2, // use 2 decks
  dealFromStock: "to waste",

  deal: function() {
    var cards = shuffle(this.cards);
    dealToPile(cards, this.stock, 3, 0);
    dealToPile(cards, this.waste, 0, 1);
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], 3, 7);
  },

  getHints: function() {
    var i;
    var card = this.waste.lastChild;
    if(card) {
      for(i = 0; i != 10; i++)
        if(this.canMoveTo(card, this.piles[i])) this.addHint(card, this.piles[i]);
    }
    for(i = 0; i != 10; i++) this.getHintsForCard(this.piles[i].lastChild);
  },

  canAutoplayCard: function(card) {
    return card.isAce || countCardsOnFoundations(card.altcolour,card.number-1)==4;
  }
};
