gGameClasses.acesup = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 4, AcesUpPile, FanDownView, 0, 1,
    "f", 1, AcesUpFoundation, CountedView, 0, 0,
  ],

  layoutTemplate: '#<   s  p p p p  f   >.',

  init: function() {
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  },

  best_destination_for: function(card) {
    const f = this.foundation;
    if(f.mayAddCard(card)) return f;
    return findEmpty(card.pile.following());
  },

  // no autoplay for this game

  is_won: function() {
    if(this.stock.cards.length) return false;
    for(let p of this.piles) if(p.cards.length !== 1) return false;
    return true;
  },
};


const AcesUpFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: () => false,
  mayAddCard: function(card) {
    const compare = (c, d) => d ? c.suit === d.suit && c.number !== 1 && (c.number < d.number || d.number === 1) : false;
    if(compare(card, card.pile.secondToLastCard)) return true;
    for(let p of card.pile.following()) if(compare(card, p.lastCard)) return true;
    return false;
  },
};
