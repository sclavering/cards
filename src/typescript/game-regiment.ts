class RegimentGame extends Game {
  private ace_foundations: RegimentAceFoundation[];
  private king_foundations: RegimentKingFoundation[];

  static create_layout() {
    return new Layout("#<    a a a a   k k k k    >.#<   p p p p p p p p   ><   r r r r r r r r><   p p p p p p p p>.", { p: RegimentPileView, r: RegimentSlideView, a: RegimentSlideView, k: RegimentSlideView });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      piles: [16, RegimentPile, 0, 1],
      reserves: [8, RegimentReserve, 10, 1],
      ace_foundations: [4, RegimentAceFoundation, 0, 0],
      king_foundations: [4, RegimentKingFoundation, 0, 0],
    };
  }

  protected init() {
    this.foundations = [].concat(this.ace_foundations, this.king_foundations);
    const rs = this.reserves as RegimentReserve[];
    for(let i = 0; i !== 8; i++) rs[i].regiment_column = i;
    const ps = this.piles as RegimentPile[];
    for(let i = 0; i !== 16; i++) {
      let p = ps[i];
      p.regiment_column = i % 8;
      p.regiment_reserve = rs[p.regiment_column];
    }
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const ps = cseq.source instanceof Pile ? cseq.source.following() : this.piles;
    for(let p of ps) if(p.cards.length && p.may_add_maybe_from_self(cseq)) return p;

    if(cseq.source instanceof Reserve) for(let p of this.piles) if(!p.cards.length && p.may_add_maybe_from_self(cseq)) return p;
    return null;
  }

  autoplay(): Action {
    for(let pile of this.piles as RegimentPile[])
      if(!pile.cards.length && this.reserves[pile.regiment_column].cards.length)
        return new Move(this.reserves[pile.regiment_column].cseq_at_negative(-1), pile);

    // If the ace- and king-foundation for a suit have reached the same number it's fine to autoplay anything to both of them.  Otherwise nothing is autoplayable.  (The edge case, where e.g. the ace-foundation is up to a 10 and the king-foundation down to a jack, is not autoplayable because e.g. the user might want to move the 10 across in order to put up the other 9.)
    const ace_nums: LookupBySuit<number> = { [Suit.S]: 0, [Suit.H]: 0, [Suit.D]: 0, [Suit.C]: 0 };
    const king_nums: LookupBySuit<number> = { [Suit.S]: 14, [Suit.H]: 14, [Suit.D]: 14, [Suit.C]: 14 };
    for_each_top_card(this.ace_foundations, c => ace_nums[c.suit] = card_number(c));
    for_each_top_card(this.king_foundations, c => king_nums[c.suit] = card_number(c));
    const autoplayable_suits: LookupBySuit<boolean> = { [Suit.S]: false, [Suit.H]: false, [Suit.D]: false, [Suit.C]: false };
    for(let k in autoplayable_suits) if(ace_nums[k] > 0 && king_nums[k] < 14 && ace_nums[k] >= king_nums[k]) autoplayable_suits[k] = true;
    return this.autoplay_using_predicate(cseq => autoplayable_suits[cseq.first.suit]);
  }
};
g_game_classes["regiment"] = RegimentGame;


class RegimentReserve extends Reserve {
  public regiment_column: number;
}


class RegimentPile extends Pile {
  public regiment_column: number;
  public regiment_reserve: RegimentReserve;

  constructor() {
    super();
    this.regiment_reserve = null;
  }

  may_take(cseq: CardSequence): boolean {
    return cseq.is_single && cseq.first.face_up;
  }

  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    // piles are built up or down (or both) within suit
    const l = this.last_card;
    if(l) return card.suit === l.suit && (card_number(l) === card_number(card) + 1 || card_number(l) === card_number(card) - 1);

    // empty piles must be filled from the closest reserve pile
    if(!(cseq.source instanceof Reserve)) return false;
    const source = cseq.source as RegimentReserve;

    const reserve = this.regiment_reserve;
    if(reserve === source) return true;

    if(reserve.cards.length) return false;

    var prev = reserve.prev, prev_dist = 1;
    while(prev && !prev.cards.length && prev !== source) prev = prev.prev, prev_dist++;
    var next = reserve.next, next_dist = 1;
    while(next && !next.cards.length && next !== source) next = next.next, next_dist++;

    // if trying to move from a reserve to the right
    if(source.regiment_column > this.regiment_column) return next === source && (!prev || prev_dist >= next_dist);
    return prev === source && (!next || next_dist >= prev_dist);
  }
};

class RegimentAceFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    if(!this.cards.length) return card_number(card) === 1 && !includes_pile_starting_with_suit(this.following(), card.suit);
    return is_next_in_suit(this.last_card, card);
  }
};

class RegimentKingFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    if(!this.cards.length) return card_number(card) === 13 && !includes_pile_starting_with_suit(this.following(), card.suit);
    return is_next_in_suit(card, this.last_card);
  }
};
