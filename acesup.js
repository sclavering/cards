Games.acesup = {
  __proto__: BaseCardGame,

  id: "acesup",
  dealFromStock: "to piles",

  init: function() {
    this.cards = makeCardRuns(2, 14); // aces high
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  },

  deal: function(cards) {
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, 48, 0);
  },

  mayTakeCardFromFoundation: "no",

  mayTakeCardFromPile: "single card",

  mayAddCardToFoundation: function(card) {
    const ps = Game.piles;
    for(var i = 0; i != 4; i++) {
      var top = ps[i].lastChild;
      if(top==card) top = top.previousSibling; // only relevant when |card| was middle-clicked
      if(top && card.suit==top.suit && card.number<top.number) return true;
    }
    return false;
  },

  mayAddCardToPile: "if empty",

  getHints: function() {
    const ps = this.piles, f = this.foundation;
    for(var i = 0; i != 4; i++) {
      var c = ps[i].lastChild;
      if(c && f.mayAddCard(c)) this.addHint(c, f);
    }
    const p = this.firstEmptyPile;
    if(!p) return;
    for(i = 0; i != 4; i++) {
      c = ps[i].lastChild;
      if(c) this.addHint(c, p);
    }
  },

  getBestMoveForCard: function(card) {
    const f = this.foundation;
    if(f.mayAddCard(card)) return f;
    // return next empty pile
    for(var p = card.parentNode, p2 = p.next; p2 != p; p2 = p2.next)
      if(!p2.hasChildNodes()) return p2;
    return null;
  },

  // no autoplay for this game

  hasBeenWon: function() {
    if(this.stock.hasChildNodes()) return false;
    for(var i = 0; i != 4; i++) {
      var c = this.piles[i].firstChild;
      if(!c.isAce || c.nextSibling) return false;
    }
    return true;
  }
}
