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
    const autoplayable_suits: LookupBySuit<boolean> = { [Suit.S]: false, [Suit.H]: false, [Suit.D]: false, [Suit.C]: false };
    for(let f of this.foundations) if(f.cards.length >= 12) autoplayable_suits[card_suit(f.cards[0])] = true;
    return this.autoplay_using_predicate(cseq => autoplayable_suits[card_suit(cseq.first)]);
  }
};
g_game_classes["unionsquare"] = UnionSquareGame;


class UnionSquarePile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  // Piles are built up or down in suit, but only one direction at once.
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    const cs = this.cards, num = cs.length, last = this.last_card;
    if(!last) return true;
    if(card_suit(last) !== card_suit(card)) return false;
    if(num === 1) return card_number(card) === card_number(last) + 1 || card_number(card) === card_number(last) - 1;
    return card_number(cs[0]) === card_number(cs[1]) + 1 // going down?
        ? card_number(card) === card_number(last) - 1
        : card_number(card) === card_number(last) + 1;
  }
};


// Built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right from the a->k, so that it's clear what card should be played next.
class UnionSquareFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    if(!this.cards.length) return card_number(card) === 1 && !includes_pile_starting_with_suit(this.following(), card_suit(card));
    const last = this.last_card, pos = this.cards.length;
    if(card_suit(last) !== card_suit(card)) return false;
    if(pos < 13) return card_number(card) === card_number(last) + 1;
    if(pos > 13) return card_number(card) === card_number(last) - 1;
    return card_number(card) === 13;
  }
};
