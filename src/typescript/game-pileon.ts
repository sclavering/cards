class _PileOnGame extends Game {
  protected _pileon_depth: number;

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const num = card_number(cseq.first);
    return this.best_destination_for__nearest_legal_using_ranking(cseq, p => p.cards.length ? (card_number(p.last_card) === num ? 2 : 1) : 0);
  }

  // Won when each pile is either empty or holds four cards of the same rank.
  is_won(): boolean {
    for(let p of this.piles)
      if(p.cards.length && !(p.cards.length === this._pileon_depth && all_same_number(p.cards)))
        return false;
    return true;
  }
};


class PileOnGame extends _PileOnGame {
  static create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p>.", { p: PileOnView4 });
  }
  constructor() {
    super();
    this.pile_details = {
      piles: [15, PileOnPile4, 0, 4], // The last two are actually empty.
    };
    this._pileon_depth = 4;
  }
};
g_game_classes["pileon"] = PileOnGame;


class DoublePileOnGame extends _PileOnGame {
  static create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p p>.", { p: PileOnView8 });
  }
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      piles: [16, PileOnPile8, 0, 8], // The last three are actually empty.
    };
    this._pileon_depth = 8;
  }
};
g_game_classes["doublepileon"] = DoublePileOnGame;


class PileUpGame extends _PileOnGame {
  static create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p>.", { p: PileOnView4 });
  }
  constructor() {
    super();
    this.pile_details = {
      piles: [14, PileUpPile4, 0, 4], // The last one is actually empty.
    };
    this._pileon_depth = 4;
  }
};
g_game_classes["pileup"] = PileUpGame;


class DoublePileUpGame extends _PileOnGame {
  static create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p>.", { p: PileOnView8 });
  }
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      piles: [15, PileUpPile8, 0, 8], // The last two are are actually empty.
    };
    this._pileon_depth = 8;
  }
};
g_game_classes["doublepileup"] = DoublePileUpGame;


class _PileOnPile extends Pile {
  private _depth: number;
  private _is_pileup: boolean;
  constructor(depth: number, is_pileup: boolean) {
    super();
    this._depth = depth;
    this._is_pileup = is_pileup;
  }
  may_take(cseq: CardSequence): boolean {
    return all_same_number(this.cards.slice(cseq.index));
  }
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    const last = this.last_card;
    if(last && !(this._is_pileup ? is_same_number_or_one_different_mod13(last, card) : card_number(last) === card_number(card))) return false;
    return this.cards.length + cseq.count <= this._depth;
  }
};

class PileOnPile4 extends _PileOnPile {
  constructor() {
    super(4, false);
  }
};

class PileOnPile8 extends _PileOnPile {
  constructor() {
    super(8, false);
  }
};

class PileUpPile4 extends _PileOnPile {
  constructor() {
    super(4, true);
  }
};

class PileUpPile8 extends _PileOnPile {
  constructor() {
    super(8, true);
  }
};


function all_same_number(cards: Card[]): boolean {
  const num = card_number(cards[0]);
  for(let i = 1; i < cards.length; ++i) if(card_number(cards[i]) !== num) return false;
  return true;
};


function is_same_number_or_one_different_mod13(a: Card, b: Card): boolean {
  return card_number(a) === card_number(b)
    || (card_number(a) === 13 ? 1 : card_number(a) + 1) === card_number(b)
    || (card_number(a) === 1 ? 13 : card_number(a) - 1) === card_number(b)
  ;
};
