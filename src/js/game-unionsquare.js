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

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A.
  autoplayable_predicate: function() {
    const autoplayable_suits = { S: false, H: false, D: false, C: false };
    for(let f of this.foundations) if(f.cards.length >= 12) autoplayable_suits[f.cards[0].suit] = true;
    return card => autoplayable_suits[card.suit];
  },
};


const UnionSquarePile = {
  __proto__: Pile,

  is_pile: true,

  may_take_card: ifLast,

  // Piles built up or down in suit, but not both ways at once.
  may_add_card: function(card) {
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
  __proto__: Pile,
  is_foundation: true,
  may_take_card: _ => false,
  may_add_card: function(card) {
    if(!this.hasCards) return card.number === 1 && !includes_pile_starting_with_suit(this.following(), card.suit);
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit !== card.suit) return false;
    if(pos < 13) return card.number === last.number + 1;
    if(pos > 13) return card.number === last.number - 1;
    return card.number === 13;
  }
};
