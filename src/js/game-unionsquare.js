gGameClasses.unionsquare = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 16, UnionSquarePile, UnionSquarePileView, 0, 1,
    "f", 4, UnionSquareFoundation, UnionSquareFoundationView, 0, 0,
  ],

  layoutTemplate: '#<   [sw]  p p p p  f   ><      p p p p  f><      p p p p  f><      p p p p  f>.',

  init_cards: () => make_cards(2),

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

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
    if(num === 1) return card.number === last.number + 1 || card.number === last.number - 1;
    return cs[0].number === cs[1].number + 1 // going down?
        ? card.number === last.number - 1
        : card.number === last.number + 1;
  }
};


// Built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right from the a->k, so that it's clear what card should be played next.
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    if(!this.hasCards) return card.isAce && !includes_pile_starting_with_suit(this.following(), card.suit);
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit !== card.suit) return false;
    if(pos < 13) return card.number === last.number + 1;
    if(pos > 13) return card.number === last.number - 1;
    return card.isKing;
  }
};
