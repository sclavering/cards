Games.pileon = {
  __proto__: BaseCardGame,

  id: "pileon",

  deal: function(cards) {
    const ps = this.piles;
    for(var i = 0; i != 13; i++) ps[i].dealTo(cards, 0, 4);
  },

  // May move any group of cards all of the same rank.
  mayTakeCardFromPile: function(card) {
    var num = card.number; //, nxt = card.nextSibling;
    while((card = card.nextSibling)) if(card.number!=num) return false;
    return true;
  },

  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  mayAddCardToPile: function(card) {
    const last = this.lastChild;
    if(last && last.number!=card.number) return false;
    var num = 1;
    while((card = card.nextSibling)) ++num;
    return (this.childNodes.length + num) <= 4;
  },

  // xxx write getHints()

  getBestMoveForCard: "legal nonempty, or empty",

  // Won when each pile is either empty or holds four cards of the same rank.
  hasBeenWon: function() {
    const ps = this.piles;
    for(var i = 0; i != 15; ++i) {
      var p = ps[i], cs = p.childNodes;
      if(!cs.length) continue;
      if(cs.length!=4) return false;
      var num = cs[0].number;
      if(cs[1].number!=num || cs[2].number!=num || cs[3].number!=num) return false;
    }
    return true;
  }
}
