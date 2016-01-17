gGameClasses.unionsquare = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 16, UnionSquarePile, UnionSquarePileView, 0, 1,
    "f", 4, UnionSquareFoundation, UnionSquareFoundationView, 0, 0,
  ],

  layoutTemplate: '#<   [sw]  p p p p  f   ><      p p p p  f><      p p p p  f><      p p p p  f>.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  required_cards: [2],

  best_destination_for: function(card) {
    const p = card.pile, ps = p.isPile ? p.following() : this.piles;
    let empty = null;
    for(let q of ps) {
      if(q.hasCards) {
        if(q.mayAddCard(card)) return q;
      } else if(!empty) {
        empty = q;
      }
    }
    return empty;
  },

  autoplay: autoplay_default,

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A.
  autoplayable_numbers: function() {
    const rv = { S: 0, H: 0, D: 0, C: 0 }; // By default, nothing can be autoplayed.
    for(let f of this.foundations) if(f.cards.length >= 12) rv[f.cards[0].suit] = 13;
    return rv;
  },
};


const UnionSquarePile = {
  __proto__: Pile,

  isPile: true,

  mayTakeCard: ifLast,

  // Piles built up or down in suit, but not both ways at once.
  mayAddCard: function(card) {
    const cs = this.cards, num = cs.length, last = this.lastCard;
    if(!last) return true;
    if(last.suit !== card.suit) return false;
    if(num === 1) return last.number === card.upNumber || last.upNumber === card.number;
    return cs[0].number === cs[1].upNumber // going down?
        ? last.number === card.upNumber
        : last.upNumber === card.number;
  }
};

// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    if(!this.hasCards) return card.isAce && !card.twin.pile.isFoundation;
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit !== card.suit) return false;
    if(pos < 13) return last.upNumber === card.number;
    if(pos > 13) return last.number === card.upNumber;
    return card.isKing;
  }
};
