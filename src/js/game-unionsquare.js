gGameClasses.unionsquare = {
  __proto__: Game,

  pileDetails: function() [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 16, UnionSquarePile, UnionSquarePileView, 0, 1,
    "f", 4, UnionSquareFoundation, UnionSquareFoundationView, 0, 0,
  ],

  layoutTemplate: '#<   [sw]  p p p p  f   ><      p p p p  f><      p p p p  f><      p p p p  f>.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  allcards: [2],

  best_destination_for: function(card) {
    const p = card.pile, ps = p.isPile ? p.following() : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; ++i) {
      var q = ps[i];
      if(q.hasCards) {
        if(q.mayAddCard(card)) return q;
      } else if(!empty) {
        empty = q;
      }
    }
    return empty;
  },

  getFoundationDestinationFor: function(card) {
    const twin = card.twin, twinp = twin.pile;
    if(twinp.isFoundation) {
      if(card.isKing) return twinp;
      // >, not >=, or it'd allow Q,K,Q on foundations
      return twinp.cards.length > 13 && twinp.lastCard.number == card.upNumber ? twinp : null;
    }
    // can now assume twin is not on foundation
    if(card.isAce) return findEmpty(this.foundations);
    var down = card.down, downp = down.pile;
    if(downp.isFoundation && down.isLast) return downp;
    down = down.twin, downp = down.pile;
    if(downp.isFoundation && down.isLast) return downp;
    return null;
  },

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A
  autoplay: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; ++i) {
      var f = fs[i], len = f.cards.length, last = f.lastCard;
      if(len < 12 || len == 26) continue;
      var c = len == 12 ? last.up : (len == 13 ? last.twin : last.down), cp = c.pile;
      if((cp.isPile || cp.isWaste) && c.isLast) return new Move(c, f);
      c = c.twin, cp = c.pile;
      if((cp.isPile || cp.isWaste) && c.isLast) return new Move(c, f);
    }
    return null;
  },
};


const UnionSquarePile = {
  __proto__: Pile,

  isPile: true,

  mayTakeCard: ifLast,

  // Piles built up or down in suit, but not both ways at once.
  mayAddCard: function(card) {
    const cs = this.cards, num = cs.length, last = this.lastCard;
    if(!last) return true;
    if(last.suit != card.suit) return false;
    if(num == 1) return last.number == card.upNumber || last.upNumber == card.number;
    return cs[0].number == cs[1].upNumber // going down?
        ? last.number == card.upNumber
        : last.upNumber == card.number;
  }
};

// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    if(!this.hasCards) return card.isAce && !card.twin.pile.isFoundation;
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit != card.suit) return false;
    if(pos < 13) return last.upNumber == card.number;
    if(pos > 13) return last.number == card.upNumber;
    return card.isKing;
  }
};
