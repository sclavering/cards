Games["acesup"] = {
  __proto__: BaseCardGame,

  id: "acesup",
  acesHigh: true,
  dealFromStock: "to piles",
  canMoveToPile: "isempty",

  init: function() {
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
  },

  deal: function() {
    var cards = shuffle(this.cards);
    // If the four cards at the bottom of the stock are all different suits the
    // game is impossible. Check if this has happened and reshuffle if so
    // xxx this isn't true any more, because the rules have been relaxed
    while(this.allDifferentSuits(cards)) cards = shuffle(cards);
    // deal the cards
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },
  allDifferentSuits: function(cards) {
    // the cards which end up at the bottom of the stock are 44-48
    for(var i = 44; i != 48; i++)
      for(var j = 44; j != i; j++)
        if(cards[i].isSameSuit(cards[j])) return false;
    return true;
  },

  canMoveCard: function(card) {
    var p = card.parentNode;
    return (!card.nextSibling && !p.isFoundation && !p.isStock);
  },

  canMoveToFoundation: function(card, foundation) {
    for(var i = 0; i != 4; i++) {
      var top = this.piles[i].lastChild;
      if(top==card) top = top.previousSibling; // only relevant when |card| was middle-clicked
      if(top && card.isSameSuit(top) && card.number<top.number) return true;
    }
    return false;
  },

  // no hints for this game

  getBestMoveForCard: function(card) {
    if(this.canMoveToFoundation(card)) return this.foundation;
    // find the next empty pile
    var num = card.parentNode.num;
    for(var i = 1; i != 4; i++) {
      var next = this.piles[(i+num) % 4];
      if(!next.hasChildNodes()) return next;
    }
    return null;
  },

  // no autoplay for this game

  hasBeenWon: function() {
    if(this.stock.childNodes.length!=0) return false;
    for(var i = 0; i != 4; i++) {
      var s = this.piles[i];
      if(s.childNodes.length!=1 || !s.lastChild.isAce) return false;
    }
    return true;
  }
}
