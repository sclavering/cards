Games["russiansol"] = {
  __proto__: BaseCardGame,

  id: "russiansol",
  layout: "yukon",
  rule_canMoveToPile: "descending,in-suit",

  deal: function() {
    var cards = this.shuffleDecks(1);
    this.dealToStack(cards,this.stacks[0],0,1);
    for(var i = 1; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,5);
  },

  getHints: function() {
    for(var i = 0; i < 7; i++) {
      this.getHintForCard(this.stacks[i].lastChild);
    }
  },
  // find card one greater in number and of the same suit
  getHintForCard: function(card) {
    if(!card) return;
    for(var i = 0; i < 7; i++) {
      var stack = this.stacks[i];
      if(stack==card.parentNode) continue;
      var current = stack.lastChild;
      while(current && current.faceUp()) {
        if(card.isConsecutiveTo(current) && card.isSameSuit(current))
          return this.addHint(current,card.parentNode);
        current = current.previousSibling;
      }
    }
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    // automove cards to suit stacks
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: function() {
    // game won if all 4 Foundations have 13 cards
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  },

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
