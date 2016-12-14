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
        || find_empty(this.piles);
  }

  autoplay() {
    const nums: LookupBySuit<number> = { [Suit.S]: 2, [Suit.H]: 2, [Suit.D]: 2, [Suit.C]: 2 }; // can always play an Ace or two
    for(let f of this.foundations) {
      let c = f.last_card;
      if(c) nums[other_suit_of_same_colour[c.suit]] = card_number(c) + 1;
    }
    return this.autoplay_using_predicate(cseq => card_number(cseq.first) <= nums[cseq.first.suit]);
  }
};
g_game_classes["whitehead"] = WhiteheadGame;


class WhiteheadPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_same_suit(cseq);
  }
  may_add(cseq: CardSequence): boolean {
    const last = this.last_card;
    return last ? is_next_and_same_colour(cseq.first, last) : true;
  }
};
