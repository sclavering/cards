// Spider, BlackWidow, Wasp, and Grounds for Divorce

var BaseSpiderGame = {
  __proto__: BaseCardGame,

  rule_dealFromStock: "to-piles,if-none-empty",
  rule_canMoveToPile: "descending",

  moveTo: function(card, target) {
    if(target.isFoundation) target = this.getFirstEmptyFoundation();
    BaseCardGame.moveTo.call(this,card,target);
    return true;
  },
  getFirstEmptyFoundation: function() {
    for(var i = 0; i < this.foundations.length; i++)
      if(!this.foundations[i].hasChildNodes()) return this.foundations[i];
    return null;
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testLastIsConsecutive(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    // remove completed suits
    for(var i = 0; i != this.stacks.length; i++) {
      var stack = this.stacks[i];
      var length = stack.childNodes.length;
      if(length>=13) {
        var card = stack.childNodes[length-13];
        // note that it's irrelevant which foundation we try to move to, moveTo will pick the right one
        if(card.isKing() && this.canMoveCard(card) && this.canMoveToFoundation(card,null)) {
          return this.moveTo(card,this.foundations[0]);
        }
      }
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



Games["spider"] = {
  __proto__: BaseSpiderGame,

  id: "spider",
  difficultyLevels: ["easy-1suit","medium-2suits","hard-4suits"],
  rule_canMoveCard: "descending, in suit",
  rule_canMoveToFoundation: "king->ace flush, quick",

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
      if(!card) continue;
      for(var j = 0; j < 10; j++) {
        var stack = this.stacks[j];
        if(stack.hasChildNodes() && this.canMoveTo(card,stack))
          this.addHint(card,stack);
      }
    }
  }
};



Games["blackwidow"] = {
  __proto__: BaseSpiderGame,

  id: "blackwidow",
  layout: "spider",
  rule_canMoveCard: "descending",
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
      var card = this.getLowestMoveableCard_Suit(this.stacks[i]);
      if(!card) continue;
      for(var j = 0; j < 10; j++) {
        var stack = this.stacks[j];
        if(stack.hasChildNodes() && this.canMoveTo(card,stack))
          this.addHint(card,stack);
      }
    }
  }
};



Games["wasp"] = {
  __proto__: BaseSpiderGame,

  id: "wasp",
  rule_dealFromStock: "to-piles",
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



Games["divorce"] = {
  __proto__: BaseSpiderGame,

  id: "divorce",
  layout: "spider",
  rule_dealFromStock: "to-nonempty-piles",
  rule_canMoveCard: "descending mod13, in suit",
  rule_canMoveToPile: "descending mod13",

  deal: function() {
    var cards = this.shuffleDecks(2);
    for(var i = 0; i != 10; i++) this.dealToStack(cards, this.stacks[i], 0, 5);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },

  canMoveToFoundation: function(card, pile) {
    return card.parentNode.lastChild.isConsecutiveMod13To(card);
  },

//  getBestMoveForCard: function(card) {
//    return null;
//  },

  getHints: function() {
  }
};
