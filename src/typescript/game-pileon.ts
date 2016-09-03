class _PileOnGame extends Game {
  protected _pileon_depth: number;

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const card = cseq.first;
    const ps = cseq.source.surrounding();
    // The first matters for PileUp, but is redundant in PileOn.
    return find_pile_by_top_card(ps, top => top.number === card.number && !!top.pile.may_add(cseq))
        || this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  // Won when each pile is either empty or holds four cards of the same rank.
  public is_won(): boolean {
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
gGameClasses["pileon"] = PileOnGame;


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
gGameClasses["doublepileon"] = DoublePileOnGame;


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
gGameClasses["pileup"] = PileUpGame;


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
gGameClasses["doublepileup"] = DoublePileUpGame;


class _PileOnPile extends _Pile {
  protected _depth: number;
  protected _is_pileup: boolean;
  constructor() {
    super();
    this._depth = NaN;
    this._is_pileup = false;
  }
  may_take(cseq: CardSequence): boolean {
    return all_same_number(this.cards.slice(cseq.index));
  }
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    const last = this.lastCard;
    if(last && !(this._is_pileup ? is_same_number_or_one_different_mod13(last, card) : last.number === card.number)) return false;
    const numCards = card.pile.cards.length - card.index;
    return this.cards.length + numCards <= this._depth;
  }
};

class PileOnPile4 extends _PileOnPile {
  constructor() {
    super()
    this._depth = 4;
  }
};

class PileOnPile8 extends _PileOnPile {
  constructor() {
    super()
    this._depth = 8;
  }
};

class PileUpPile4 extends _PileOnPile {
  constructor() {
    super()
    this._depth = 4;
    this._is_pileup = true;
  }
};

class PileUpPile8 extends _PileOnPile {
  constructor() {
    super()
    this._depth = 8;
    this._is_pileup = true;
  }
};


function all_same_number(cards: Card[]): boolean {
  const num = cards[0].number;
  for(let i = 1; i < cards.length; ++i) if(cards[i].number !== num) return false;
  return true;
};


function is_same_number_or_one_different_mod13(a: Card, b: Card): boolean {
  return a.number === b.number
    || (a.number === 13 ? 1 : a.number + 1) === b.number
    || (a.number === 1 ? 13 : a.number - 1) === b.number
  ;
};
