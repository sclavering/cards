Games.yukon = Games.sanibel = true;


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
        if(card.number==current.upNumber && card.colour!=current.colour) {
          // |current| could be moved onto |card|.  test if it's not already
          // on a card consecutive and of opposite colour
          var prev = current.previousSibling;
          if(!prev || prev.number!=current.upNumber || prev.colour==current.colour)
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
    const ps = this.sourcePiles, numPs = ps.length;
    for(var i = 0; i != numPs; i++) {
      var last = ps[i].lastChild;
      if(last && last.mayAutoplay && this.sendToFoundations(last)) return true;
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


AllGames.yukon = {
  __proto__: YukonBase,

  id: "yukon",

  init: function() {
    var cs = this.cards = makeDecks(1);

    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0, n = 0; i != 4; i++) {
      n++;
      for(var j = 1; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfterA = cs[n+off[i]-1];
        c.autoplayAfterB = cs[n+off[i+4]-1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }
  },

  deal: function(cards) {
    dealToPile(cards, this.piles[0], 0, 1);
    for(var i = 1; i != 7; i++) dealToPile(cards, this.piles[i], i, 5);
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each pile for targets, then find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i != 7; i++) this.getHintsForCard(this.piles[i].lastChild);
  }
};


AllGames.sanibel = {
  __proto__: YukonBase,

  id: "sanibel",
  //cards: 2,
  dealFromStock: "to waste",

  init: function() {
    var cs = this.cards = makeDecks(2);

    const off1 = [13, 26, 13, 26, 13, 26, 13, -78];
    const off2 = [26, 39, 26, 39, 26, -65, -78, -65];
    for(var i = 0, n = 0; i != 8; i++) {
      n++;
      var o1 = off1[i], o2 = off2[i];
      for(var j = 1; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfterA = cs[n+o1-1];
        c.autoplayAfterB = cs[n+o2-1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterFourOthers);
      }
    }
  },

  deal: function(cards) {
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
  }
};
