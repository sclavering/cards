// Spider, Black Widow, Grounds for Divorce, and Wasp

var SpiderBase = {
  __proto__: BaseCardGame,

  rule_dealFromStock: "to-piles,if-none-empty",
  rule_canMoveToPile: "descending",

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    var nonempty = filter(piles, testCanMoveToNonEmptyPile(card));
    return searchPiles(nonempty, testLastIsSuit(card.suit()))
        || (nonempty.length && nonempty[0])
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i != this.stacks.length; i++) {
      var pile = this.stacks[i];
      var n = pile.childNodes.length - 13;
      if(n>=0 && this.sendToFoundations(pile.childNodes[n])) return true;
    }
    return false;
  },

  hasBeenWon: function() {
    for(var i = 0; i < this.foundations.length; i++)
      if(this.foundations[i].childNodes.length!=13) return false;
    return true;
  },

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



Games["spider"] = {
  __proto__: SpiderLayoutBase,

  id: "spider",
  difficultyLevels: ["easy-1suit","medium-2suits","hard-4suits"],
  rule_canMoveCard: "descending, in suit, not from foundation",
  rule_canMoveToFoundation: "13 cards",

  deal: function() {
    var cards;
    switch(this.difficultyLevel) {
     case 1: cards = this.shuffleSuits(8,0,0,0); break;
      case 2: cards = this.shuffleSuits(4,4,0,0); break;
      default: cards = this.shuffleSuits(2,2,2,2);
    }
    var i;
    for(i = 0; i < 4;  i++) this.dealToStack(cards,this.stacks[i],5,1);
    for(i = 4; i < 10; i++) this.dealToStack(cards,this.stacks[i],4,1);
    this.dealToStack(cards,this.stock,50,0);
  },

  getHints: function() {
    for(var i = 0; i < 10; i++) {
      var card = this.getLowestMoveableCard_Suit(this.stacks[i]);
      if(card) this.addHintsFor(card);
    }
  }
};



Games["blackwidow"] = {
  __proto__: SpiderLayoutBase,

  id: "blackwidow",
  rule_canMoveCard: "descending, not from foundation",
  rule_canMoveToFoundation: "king->ace flush",

  deal: function() {
    var cards = this.shuffleDecks(2);
    var i;
    for(i = 0; i < 4;  i++) this.dealToStack(cards,this.stacks[i],5,1);
    for(i = 4; i < 10; i++) this.dealToStack(cards,this.stacks[i],4,1);
    this.dealToStack(cards,this.stock,50,0);
  },

  getHints: function() {
    for(var i = 0; i < 10; i++) {
      var card = this.stacks[i].lastChild;
      while(card && card.faceUp()) {
        var prv = card.previousSibling;
        if(!prv || !prv.faceUp()) {
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



Games["divorce"] = {
  __proto__: SpiderLayoutBase,

  id: "divorce",
  rule_dealFromStock: "to-nonempty-piles",
  rule_canMoveCard: "descending mod13, in suit, not from foundation",
  rule_canMoveToPile: "descending mod13",
  rule_canMoveToFoundation: "13 cards",

  deal: function() {
    var cards = this.shuffleDecks(2);
    for(var i = 0; i != 10; i++) this.dealToStack(cards, this.stacks[i], 0, 5);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) {
      var card = this.stacks[i].lastChild;
      if(!card) continue;
      var prv = card.previousSibling;
      while(prv && prv.isSameSuit(card) && prv.isConsecutiveMod13To(card))
        card = prv, prv = prv.previousSibling;
      this.addHintsFor(card);
    }
  }
};



Games["wasp"] = {
  __proto__: SpiderBase,

  id: "wasp",
  rule_dealFromStock: "to-piles",
  rule_canMoveCard: "not from foundation",
  rule_canMoveToPile: "descending, in suit",
  rule_canMoveToFoundation: "king->ace flush",

  deal: function() {
    var cards = this.shuffleDecks(1);
    for(var i = 0; i != 3; i++) this.dealToStack(cards, this.stacks[i], 3, 4);
    for(i = 3; i != 7; i++) this.dealToStack(cards, this.stacks[i], 0, 7);
    this.dealToStack(cards, this.stock, 3, 0);
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  getHints: function() {
    for(var i = 0; i < 7; i++) {
      var pile = this.stacks[i];
      if(pile.hasChildNodes()) this.getHintForPile(pile);
    }
  },
  getHintForPile: function(pile) {
    for(var i = 0; i < 7; i++) {
      var p = this.stacks[i];
      if(p==pile) continue;
      for(var card = p.lastChild; card && card.faceUp(); card = card.previousSibling) {
        if(!this.canMoveTo(card, pile)) continue;
        this.addHint(card, pile);
        return;
      }
    }
  }
};
