Games["fan"] = {
  __proto__: BaseCardGame,

  id: "fan",
  canMoveCard: "last on pile",
  canMoveToPile: "descending, in suit, kings in spaces",

  deal: function() {
    var cards = getShuffledDecks(1);
    for(var i = 0; i < 17; i++) this.dealToStack(cards, this.stacks[i], 0, 3);
    this.dealToStack(cards, this.stacks[17], 0, 1);
  },

  getHints: function() {
    for(var i = 0; i != this.stacks.length; i++) {
      var card = this.stacks[i].lastChild;
      // don't suggest moving kings that are not on top of anything
      if(!card || (card.isKing && !card.previousSibling)) continue;
      var pile = searchPiles(this.stacks, testCanMoveToPile(card));
      if(pile) this.addHint(card, pile);
    }
  },

  getBestMoveForCard: function(card) {
  	return searchPiles(this.stacks, testCanMoveToPile(card));
  },

  autoplayMove: function() {
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: function() {
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  }
}
