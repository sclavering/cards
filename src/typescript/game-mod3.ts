class Mod3Game extends Game {
  private f_foundations2: Mod3Foundation2[];
  private g_foundations3: Mod3Foundation3[];
  private h_foundations4: Mod3Foundation4[];
  private rows: Mod3Foundation[][];

  static create_layout() {
    return new Layout("#<   f f f f f f f f     ><   g g g g g g g g><   h h h h h h h h><   p p p p p p p p s>.", { f: Mod3SlideView, g: Mod3SlideView, h: Mod3SlideView });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2, null, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]); // no Aces
    this.pile_details = {
      stocks: [1, StockDealToPiles, 0, 0],
      piles: [8, AcesUpPile, 0, 1],
      f_foundations2: [8, Mod3Foundation2, 0, 1],
      g_foundations3: [8, Mod3Foundation3, 0, 1],
      h_foundations4: [8, Mod3Foundation4, 0, 1],
    };
  }

  protected init() {
    this.foundations = [].concat(this.f_foundations2, this.g_foundations3, this.h_foundations4);
    this.rows = [this.f_foundations2, this.g_foundations3, this.h_foundations4];
    // Ordinarily this excludes .foundations
    this.hint_and_autoplay_source_piles = [].concat(this.foundations, this.piles);
  }

  // Games that start with no cards in the correct place on the foundations are impossible
  protected is_shuffle_impossible(): boolean {
    for(let f of this.foundations) if((f as Mod3Foundation).contains_appropriate_cards()) return false;
    return true;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.foundation_destination_for(cseq) || find_empty(cseq.source instanceof Pile ? cseq.source.surrounding() : this.piles);
  }

  autoplay() {
    const autoplayable_numbers_by_row = this.rows.map(row => this._autoplayable_numbers_for_row(row));
    return this.autoplay_using_predicate(
      cseq => card_number(cseq.first) <= autoplayable_numbers_by_row[(card_number(cseq.first) - 2) % 3][card_suit(cseq.first)]
        // This stops us moving 2/3/4s endlessly between two spaces in the same row.
        && !(cseq.source instanceof Mod3Foundation && cseq.source.contains_appropriate_cards())
    );
  }

  // The general idea here is that if both of a given number+suit are in place, it's okay to autoplay the next number (since when its twin comes up, it can go up too).  e.g. if both 6H are up, 9H can be autoplayed.  And spaces can only be filled if it won't potentially get in the way of using a different 2/3/4 to fill that space (i.e. only when there's no cards non-base_num cards in the way).
  private _autoplayable_numbers_for_row(row: Mod3Foundation[]): LookupBySuit<number> {
    const rv: LookupBySuit<number> = { [Suit.S]: 0, [Suit.H]: 0, [Suit.D]: 0, [Suit.C]: 0 };
    const seen: LookupBySuit<number> = { [Suit.S]: 0, [Suit.H]: 0, [Suit.D]: 0, [Suit.C]: 0 };
    let seen_invalid_cards = false;
    for(let f of row) {
      let c = f.last_card;
      if(!c) continue;
      let suit = card_suit(c);
      if(!f.contains_appropriate_cards()) seen_invalid_cards = true;
      else if(seen[suit]) rv[suit] = Math.min(seen[suit], card_number(c)) + 3;
      else seen[suit] = card_number(c);
    }
    const base_num = row[0]._base_num;
    if(!seen_invalid_cards) for(let k in rv) if(rv[k] < base_num) rv[k] = base_num;
    return rv;
  }

  is_won(): boolean {
    if(this.stock.cards.length) return false;
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  }
};
g_game_classes["mod3"] = Mod3Game;


abstract class Mod3Foundation extends Foundation {
  public _base_num: number;
  constructor(base_num: number) {
    super();
    this._base_num = base_num;
  }
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    const last = this.last_card;
    if(!this.cards.length) return card_number(card) === this._base_num;
    return this.contains_appropriate_cards() && card_suit(card) === card_suit(last) && card_number(card) === card_number(last) + 3;
  }
  contains_appropriate_cards() {
    const first = this.first_card;
    return first ? card_number(first) === this._base_num : false;
  }
  hint_sources(): CardSequence[] {
    const cseq = this.cseq_at(0);
    return cseq && !this.contains_appropriate_cards() ? [cseq] : [];
  }
};


class Mod3Foundation2 extends Mod3Foundation {
  constructor() {
    super(2);
  }
};

class Mod3Foundation3 extends Mod3Foundation {
  constructor() {
    super(3);
  }
};

class Mod3Foundation4 extends Mod3Foundation {
  constructor() {
    super(4);
  }
};
