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

  init() {
    this.foundations = [].concat(this.f_foundations2, this.g_foundations3, this.h_foundations4);
    this.rows = [this.f_foundations2, this.g_foundations3, this.h_foundations4];
    // Ordinarily this excludes .foundations
    this.hint_and_autoplay_source_piles = [].concat(this.foundations, this.piles);
  }

  // games that start with no cards in the correct place on the foundations are impossible
  protected is_shuffle_impossible(cards: Card[]): boolean {
    for(let i = 0; i < 8; ++i)
      if(cards[i].number === 2 || cards[i + 8].number === 3 || cards[i + 16].number === 4)
        return false;
    return true;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.foundation_destination_for(cseq) || findEmpty(cseq.source.is_pile ? cseq.source.surrounding() : this.piles);
  }

  autoplay() {
    const autoplayable_numbers_by_row = this.rows.map(row => this._autoplayable_numbers_for_row(row));
    return this.autoplay_using_predicate(
      card => card.number <= autoplayable_numbers_by_row[(card.number - 2) % 3][card.suit]
        // This stops us moving 2/3/4s endlessly between two spaces in the same row.
        && !(card.pile.is_foundation && (card.pile as Mod3Foundation).contains_appropriate_cards())
    );
  }

  // The general idea here is that if both of a given number+suit are in place, it's okay to autoplay the next number (since when its twin comes up, it can go up too).  e.g. if both 6H are up, 9H can be autoplayed.  And spaces can only be filled if it won't potentially get in the way of using a different 2/3/4 to fill that space (i.e. only when there's no cards non-base_num cards in the way).
  _autoplayable_numbers_for_row(row: Mod3Foundation[]): LookupBySuit<number> {
    const rv: LookupBySuit<number> = { S: 0, H: 0, D: 0, C: 0 };
    const seen: LookupBySuit<number> = { S: 0, H: 0, D: 0, C: 0 };
    let seen_invalid_cards = false;
    for(let f of row) {
      let c = f.lastCard;
      if(!c) continue;
      if(!f.contains_appropriate_cards()) seen_invalid_cards = true;
      else if(seen[c.suit]) rv[c.suit] = Math.min(seen[c.suit], c.number) + 3;
      else seen[c.suit] = c.number;
    }
    const base_num = row[0]._base_num;
    if(!seen_invalid_cards) for(let k in rv) if(rv[k] < base_num) rv[k] = base_num;
    return rv;
  }

  public is_won(): boolean {
    if(this.stock.hasCards) return false;
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  }
};
gGameClasses["mod3"] = Mod3Game;


abstract class Mod3Foundation extends _Foundation {
  public _base_num: number;
  constructor(base_num: number) {
    super();
    this._base_num = base_num;
  }
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add_card(card: Card): boolean {
    const last = this.lastCard;
    if(!this.hasCards) return card.number === this._base_num;
    return this.contains_appropriate_cards() && card.suit === last.suit && card.number === last.number + 3;
  }
  contains_appropriate_cards() {
    const first = this.firstCard;
    return first ? first.number === this._base_num : false;
  }
  hint_sources() {
    const c = this.firstCard;
    return c && !this.contains_appropriate_cards() ? [c] : [];
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
