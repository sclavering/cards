Games["simon"] = {
  __proto__: BaseCardGame,

  id: "simon",
  difficultyLevels: ["easy-1suit","medium-2suits","hard-4suits"],
  rule_canMoveCard: "descending, in suit, not from foundation",
  rule_canMoveToPile: "descending",
  rule_getLowestMovableCard: "descending, in suit",

  deal: function() {
    var cards =
      this.difficultyLevel==1 ? this.shuffleSuits(4,0,0,0) :
      this.difficultyLevel==2 ? this.shuffleSuits(2,2,0,0) :
      this.shuffleDecks(1);
    this.dealToStack(cards,this.stacks[0],0,8);
    this.dealToStack(cards,this.stacks[1],0,8);
    for(var i = 2; i < 10; i++) this.dealToStack(cards,this.stacks[i],0,10-i);
  },

  canMoveToFoundation: function(card, stack) {
    // only a K->A run can be put on a foundation, and the foundation must be empty
    // canMoveCard() will ensure we have a run, so only need to check the ends
    return (!stack.hasChildNodes() && card.isKing() && card.parentNode.lastChild.isAce());
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = getPilesRound(card.parentNode);
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testLastIsConsecutive(card))
        || searchPiles(piles, testPileIsEmpty);
  },

  autoplayMove: function() {
    for(var i = 0; i < 10; i++) {
      var pile = this.stacks[i];
      var n = pile.childNodes.length - 13;
      if(n>=0 && this.sendToFoundations(pile.childNodes[n])) return true;
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
    "move-to-foundation": 100,
    "move-between-piles":  -1
  }
}
