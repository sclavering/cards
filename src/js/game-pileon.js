const PileOnBase = {
  __proto__: Game,

  best_destination_for: function(card) {
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
  pileDetails: () => [
    "p", 15, PileOnPile4, PileOnView4, 0, 4, // last two actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p>.',
};

gGameClasses.doublepileon = {
  __proto__: PileOnBase,
  init_cards: () => make_cards(2),
  _pileon_depth: 8,
  pileDetails: () => [
    "p", 16, PileOnPile8, PileOnView8, 0, 8, // last three actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p p>.',
};

gGameClasses.pileup = {
  __proto__: PileOnBase,
  _pileon_depth: 4,
  pileDetails: () => [
    "p", 14, PileUpPile4, PileOnView4, 0, 4, // last one is actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p>.',
};

gGameClasses.doublepileup = {
  __proto__: PileOnBase,
  init_cards: () => make_cards(2),
  _pileon_depth: 8,
  pileDetails: () => [
    "p", 15, PileUpPile8, PileOnView8, 0, 8, // last two are actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p>.',
};


const _PileOnPile = {
  __proto__: Pile,
  _depth: NaN,
  _is_pileup: false,
  is_pile: true,
  may_take_card: card => all_same_number(card.pile.cards.slice(card.index)),
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  may_add_card: function(card) {
    const last = this.lastCard;
    if(last && !(this._is_pileup ? is_same_number_or_one_different_mod13(last, card) : last.number === card.number)) return false;
    const numCards = card.pile.cards.length - card.index;
    return this.cards.length + numCards <= this._depth;
  }
};

const PileOnPile4 = {
  __proto__: _PileOnPile,
  _depth: 4,
};

const PileOnPile8 = {
  __proto__: _PileOnPile,
  _depth: 8,
};

const PileUpPile4 = {
  __proto__: _PileOnPile,
  _depth: 4,
  _is_pileup: true,
};

const PileUpPile8 = {
  __proto__: _PileOnPile,
  _depth: 8,
  _is_pileup: true,
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
