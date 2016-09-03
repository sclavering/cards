class WhiteheadGame extends Game {
  static create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.");
  }

  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToWaste, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [7, WhiteheadPile, 0, [1, 2, 3, 4, 5, 6, 7]],
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return find_pile_by_top_card(this.piles, top => is_next_in_suit(cseq.first, top))
        || find_pile_by_top_card(this.piles, top => is_next_and_same_colour(cseq.first, top))
        || findEmpty(this.piles);
  }

  autoplay() {
    const nums: LookupBySuit<number> = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap: LookupBySuit<Suit> = { S: 'C', H: 'D', D: 'H', C: 'S' }; // other suit of same colour
    for(let f of this.foundations) {
      let c = f.lastCard;
      if(c) nums[suitmap[c.suit]] = c.number + 1;
    }
    return this.autoplay_using_predicate(cseq => cseq.first.number <= nums[cseq.first.suit]);
  }
};
gGameClasses["whitehead"] = WhiteheadGame;


class WhiteheadPile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_running_flush(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    const last = this.lastCard;
    return last ? is_next_and_same_colour(cseq.first, last) : true;
  }
};
