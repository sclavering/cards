const PileOnBase = {
  __proto__: Game,

  best_destination_for: function(cseq) {
    const card = cseq.first;
    const ps = card.pile.surrounding();
    return find_pile_by_top_card(ps, top => top.number === card.number && top.pile.may_add_card(card))
        // Redundant with the above for Pile On, but not for Pile Up.
        || ps.find(p => p.hasCards && p.may_add_card(card))
        || findEmpty(ps);
  },

  // Won when each pile is either empty or holds four cards of the same rank.
  is_won: function() {
    for(let p of this.piles)
      if(p.cards.length && !(p.cards.length === this._pileon_depth && all_same_number(p.cards)))
        return false;
    return true;
  },
};

gGameClasses.pileon = {
  __proto__: PileOnBase,
  _pileon_depth: 4,
  pile_details: () => ({
    piles: [15, PileOnPile4, 0, 4], // the last two are actually empty
  }),
  static_create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p>.", { p: PileOnView4 });
  },
};

gGameClasses.doublepileon = {
  __proto__: PileOnBase,
  init_cards: () => make_cards(2),
  _pileon_depth: 8,
  pile_details: () => ({
    piles: [16, PileOnPile8, 0, 8], // the last three are actually empty
  }),
  static_create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p p>.", { p: PileOnView8 });
  },
};

gGameClasses.pileup = {
  __proto__: PileOnBase,
  _pileon_depth: 4,
  pile_details: () => ({
    piles: [14, PileUpPile4, 0, 4], // the last one is actually empty
  }),
  static_create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p>.", { p: PileOnView4 });
  },
};

gGameClasses.doublepileup = {
  __proto__: PileOnBase,
  init_cards: () => make_cards(2),
  _pileon_depth: 8,
  pile_details: () => ({
    piles: [15, PileUpPile8, 0, 8], // the last two are are actually empty
  }),
  static_create_layout() {
    return new Layout("#<   p p p p   ><   p p p p><   p p p p><   p p p>.", { p: PileOnView8 });
  },
};


class _PileOnPile extends _Pile {
  constructor() {
    super();
    this._depth = NaN;
    this._is_pileup = false;
  }
  may_take_card(card) {
    return all_same_number(card.pile.cards.slice(card.index));
  }
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  may_add_card(card) {
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


function all_same_number(cards) {
  const num = cards[0].number;
  for(let i = 1; i < cards.length; ++i) if(cards[i].number !== num) return false;
  return true;
};


function is_same_number_or_one_different_mod13(a, b) {
  return a.number === b.number
    || (a.number === 13 ? 1 : a.number + 1) === b.number
    || (a.number === 1 ? 13 : a.number - 1) === b.number
  ;
};
