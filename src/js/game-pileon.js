const PileOnBase = {
  __proto__: Game,

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  // Won when each pile is either empty or holds four cards of the same rank.
  is_won: function() {
    for(let p of this.piles) {
      let cs = p.cards;
      if(!cs.length) continue;
      if(cs.length !== this._pileon_depth) return false;
      var num = cs[0].number;
      if(cs[1].number !== num || cs[2].number !== num || cs[3].number !== num) return false;
    }
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
    "p", 15, PileOnPile8, PileOnView8, 0, 8, // last three actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p p>.',
};


const _PileOnPile = {
  __proto__: Pile,
  _depth: NaN,
  isPile: true,
  // May move any group of cards all of the same rank.
  mayTakeCard: function(card) {
    const num = card.number, cs = card.pile.cards, len = cs.length;
    for(var i = card.index + 1; i !== len; ++i) if(cs[i].number !== num) return false;
    return true;
  },
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  mayAddCard: function(card) {
    const last = this.lastCard;
    if(card.pile === this || (last && last.number !== card.number)) return false;
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
