Games.acesup = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 4, AcesUpPile, FanDownView, 0, 1,
    "f", 1, AcesUpFoundation, CountedView, 0, 0,
  ],

  layoutTemplate: '#<   s  p p p p  f   >.',

  allcards: [null, null, range2(2, 15)], // aces high

  init: function() {
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  },

  getBestDestinationFor: function(card) {
    const f = this.foundation;
    if(f.mayAddCard(card)) return f;
    // return next empty pile
    for(var p = card.pile, p2 = p.next; p2 != p; p2 = p2.next)
      if(!p2.hasCards) return p2;
    return null;
  },

  // no autoplay for this game

  is_won: function() {
    if(this.stock.cards.length) return false;
    for each(let p in this.piles) if(p.cards.length != 1 || !p.cards[0].isAce) return false;
    return true;
  },
};
