// both Spider and BlackWidow (a spider variant)

var BaseSpiderGame = {
  __proto__: BaseCardGame,

  id: "spider",
  
  rule_dealFromStock: "to-stacks,if-none-empty",
  rule_canMoveToPile: "descending",

  moveTo: function(card, target) {
    if(target.isFoundation) target = this.getFirstEmptyFoundation();
    BaseCardGame.moveTo.call(this,card,target);
    return true; // xxx unnecessary?
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
    for(var i = 0; i < 10; i++) {
      var stack = this.stacks[i];
      var length = stack.childNodes.length;
      if(length>=13) {
        var card = stack.childNodes[length-13];
        // note that it's irrelevant which foundation we try to move to, moveTo will pick the right one
        if(card.isKing() && this.canMoveCard(card) && this.canMoveToFoundation(card,null)) {
          this.moveTo(card,this.foundations[0]);
          return true;
        }
      }
    }
    return false;
  },

  hasBeenWon: function() {
    for(var i = 0; i < 8; i++)
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

  difficultyLevels: ["easy-1suit","medium-2suits","hard-4suits"],
  rule_canMoveCard: "descending,in-suit",

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

  canMoveToFoundation: function(card, pile) {
    // canMoveCard will ensure that this is a running flush, so we just nee this simple check.
    // We shouldn't check the foundation is empty because in Spider the foundations overlap,
    // so moveTo chooses which foundation to actually use, and there will always be a foundation
    // that's empty unless the game has already been won.
    return(card.isKing() && card.parentNode.lastChild.isAce());
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

  rule_canMoveCard: "descending",

  deal: function() {
    var cards = this.shuffleDecks(2);
    var i;
    for(i = 0; i < 4;  i++) this.dealToStack(cards,this.stacks[i],5,1);
    for(i = 4; i < 10; i++) this.dealToStack(cards,this.stacks[i],4,1);
    this.dealToStack(cards,this.stock,50,0);
  },

  canMoveToFoundation: function(card, pile) {
    if(!(card.isKing() && card.parentNode.lastChild.isAce())) return false;
    var next = card.nextSibling;
    while(next && card.isSameSuit(next) && card.isConsecutiveTo(next)) card = next, next = next.nextSibling;
    return !next; // all cards should be part of the run
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
