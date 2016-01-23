gGameClasses.acesup = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 4, AcesUpPile, FanDownView, 0, 1,
    "f", 1, AcesUpFoundation, CountedView, 0, 0,
  ],

  layoutTemplate: '#<   s  p p p p  f   >.',

  init_cards: () => make_cards(null, null, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), // Aces are high

  init: function() {
    for(var i = 0; i !== 4; i++) this.piles[i].num = i;
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
    for(let p of this.piles) if(p.cards.length !== 1 || !p.cards[0].isAce) return false;
    return true;
  },
};


const AcesUpFoundation = {
  __proto__: NoWorryingBackFoundation,
  mayAddCard: function(card) {
    const c = card.pile.secondToLastCard;
    if(c && card.suit === c.suit && card.number < c.number) return true;
    for(let p of card.pile.following()) {
      let c = p.lastCard;
      if(c && card.suit === c.suit && card.number < c.number) return true;
    }
    return false;
  },
};
