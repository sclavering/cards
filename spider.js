// Spider, Black Widow, Grounds for Divorce, and Wasp

Games.blackwidow = Games.divorce = Games.wasp = true;

Games.spider = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["spider-easy", "spider-medium", "spider"]
};


var SpiderBase = {
  __proto__: BaseCardGame,

  dealFromStock: "to piles, if none empty",
  canMoveToPile: "descending",

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    var nonempty = filter(piles, testCanMoveToNonEmptyPile(card));
    return searchPiles(nonempty, testLastIsSuit(card.suit))
        || (nonempty.length && nonempty[0])
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i != this.piles.length; i++) {
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


// for games which use Spider's layout, where the foundations are compacted
var SpiderLayoutBase = {
  __proto__: SpiderBase,
  layout: "spider",

  moveTo: function(card, target) {
    if(target.isFoundation) target = searchPiles(this.foundations, testPileIsEmpty);
    BaseCardGame.moveTo.call(this,card,target);
    return true;
  },

  sendToFoundations: function(card) {
    // don't try and use attemptMove here, because it will break for Black Widow
    // (because we need |null| to be passed to canMoveToFoundation)
    return this.canMoveCard(card) && this.canMoveToFoundation(card, null)
        && this.moveTo(card, this.foundations[0]);
  }
};


var Spider =
  __proto__: SpiderLayoutBase,

  canMoveCard: "descending, in suit, not from foundation",
  canMoveToFoundation: "13 cards",
  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 5, 1);
    for(i = 4; i != 10; i++) dealToPile(cards, this.piles[i], 4, 1);
    dealToPile(cards, this.stock, 50, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


AllGames.spider = {
  __proto__: Spider,
  id: "spider",
  cards: 2
};


AllGames["spider-easy"] = {
  __proto__: Spider,
  id: "spider-easy",
  cards: [8, 0, 0, 0]
};


AllGames["spider-medium"] = {
  __proto__: Spider,
  id: "spider-medium",
  cards: [4, 4, 0, 0]
};


AllGames.blackwidow = {
  __proto__: SpiderLayoutBase,

  id: "blackwidow",
  cards: 2, // uses 2 decks
  canMoveCard: "descending, not from foundation",
  canMoveToFoundation: "king->ace flush",

  deal: function(cards) {
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 5, 1);
    for(i = 4; i != 10; i++) dealToPile(cards, this.piles[i], 4, 1);
    dealToPile(cards, this.stock, 50, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) {
      var card = this.piles[i].lastChild;
      while(card && card.faceUp) {
        var prv = card.previousSibling;
        if(!prv || !prv.faceUp) {
          this.addHintsFor(card);
        } else if(!prv.isConsecutiveTo(card)) {
          this.addHintsFor(card);
          break;
        } else if(!prv.isSameSuit(card)) {
          this.addHintsFor(card);
        } // otherwise it's from the same suit, so don't suggest moving
        card = prv;
      }
    }
  }
};


AllGames.divorce = {
  __proto__: SpiderLayoutBase,

  id: "divorce",
  cards: 2,
  dealFromStock: "to nonempty piles",
  canMoveCard: "descending mod13, in suit, not from foundation",
  canMoveToPile: "descending mod13",
  canMoveToFoundation: "13 cards",
  getLowestMovableCard: "descending mod13, in suit",

  deal: function(cards) {
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], 0, 5);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


AllGames.wasp = {
  __proto__: SpiderBase,

  id: "wasp",
  dealFromStock: "to piles",
  canMoveCard: "not from foundation",
  canMoveToPile: "descending, in suit",
  canMoveToFoundation: "king->ace flush",

  deal: function(cards) {
    for(var i = 0; i != 3; i++) dealToPile(cards, this.piles[i], 3, 4);
    for(i = 3; i != 7; i++) dealToPile(cards, this.piles[i], 0, 7);
    dealToPile(cards, this.stock, 3, 0);
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testPileIsEmpty);
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
  }
};
