Games["fan"] = {
  __proto__: BaseCardGame,

  id: "fan",


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    for(var i = 0; i < 17; i++) this.dealToStack(cards, this.stacks[i], 0, 3);
    this.dealToStack(cards, this.stacks[17], 0, 1);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  rule_canMoveCard: "last-on-pile",
  rule_canMoveToPile: "descending,in-suit,kings-in-spaces",

  canMoveToFoundation: function(card, pile) {
    var last = pile.lastChild;
    return (last ? card.isConsecutiveTo(last) && card.isSameSuit(last) : card.isAce());
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < this.stacks.length; i++) {
      var card = this.stacks[i].lastChild;
      if(!card) continue;
      for(var j = 0; j < this.stacks.length; j++) {
        // don't suggest moving a king unless it's on top of something else
        if(card.isKing() && !card.previousSibling) continue;
        if(this.canMoveTo(card, this.stacks[j]))
          this.addHint(card, this.stacks[j]);
      }
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    for(var i = 0; i < this.stacks.length; i++)
      if(this.canMoveTo(card, this.stacks[i]))
        return this.stacks[i];
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  }
}
