Games.acesup = true;

AllGames.acesup = {
  __proto__: BaseCardGame,

  id: "acesup",
  dealFromStock: "to piles",
  canMoveToPile: "isempty",

  init: function() {
    this.cards = makeCardRuns(2, 14); // aces high
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
  },

  deal: function(cards) {
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveCard: function(card) {
    var p = card.parentNode;
    return (!card.nextSibling && !p.isFoundation && !p.isStock);
  },

  canMoveToFoundation: function(card, foundation) {
    for(var i = 0; i != 4; i++) {
      var top = this.piles[i].lastChild;
      if(top==card) top = top.previousSibling; // only relevant when |card| was middle-clicked
      if(top && card.suit==top.suit && card.number<top.number) return true;
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
    if(this.stock.hasChildNodes()) return false;
    for(var i = 0; i != 4; i++) {
      var c = this.firstChild;
      if(!c.isAce || c.nextSibling) return false;
    }
    return true;
  }
}
