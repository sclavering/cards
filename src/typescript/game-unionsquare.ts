class UnionSquareGame extends Game {
  static create_layout() {
    return new Layout("#<   [sw]  p p p p  f   ><      p p p p  f><      p p p p  f><      p p p p  f>.", { p: UnionSquarePileView, f: UnionSquareFoundationView });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToWaste, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [16, UnionSquarePile, 0, 1],
      foundations: [4, UnionSquareFoundation, 0, 0],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A.
  autoplay() {
    const autoplayable_suits: LookupBySuit<boolean> = { S: false, H: false, D: false, C: false };
    for(let f of this.foundations) if(f.cards.length >= 12) autoplayable_suits[f.cards[0].suit] = true;
    return this.autoplay_using_predicate(card => autoplayable_suits[card.suit]);
  }
};
gGameClasses["unionsquare"] = UnionSquareGame;


class UnionSquarePile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  // Piles are built up or down in suit, but only one direction at once.
  may_add_card(card: Card): boolean {
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
class UnionSquareFoundation extends _Foundation {
  may_take(cseq: CardSequence): boolean {
    return false;
  }
  may_add_card(card: Card): boolean {
    if(!this.hasCards) return card.number === 1 && !includes_pile_starting_with_suit(this.following(), card.suit);
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit !== card.suit) return false;
    if(pos < 13) return card.number === last.number + 1;
    if(pos > 13) return card.number === last.number - 1;
    return card.number === 13;
  }
};
