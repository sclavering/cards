Games.unionsquare = {
  __proto__: BaseCardGame,

  layout: UnionSquareLayout,
  stockType: StockDealToWaste,
  foundationType: UnionSquareFoundation,
  pileType: UnionSquarePile,
  dealTemplate: "P 0,1",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  cards: 2,

  // xxx write getHints()

  getBestDestinationFor: function(card) {
    const p = card.pile, ps = p.isPile ? p.following : this.piles, num = ps.length;
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

  getFoundationMoveFor: function(card) {
    const twin = card.twin, twinp = twin.pile;
    if(twinp.isFoundation) {
      if(card.isKing) return twinp;
      // >, not >=, or it'd allow Q,K,Q on foundations
      return twinp.cards.length > 13 && twinp.lastCard.number == card.upNumber ? twinp : null;
    }
    // can now assume twin is not on foundation
    if(card.isAce) return this.firstEmptyFoundation;
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
      if(len<12 || len==26) continue;
      var c = len==12 ? last.up : (len==13 ? last.twin : last.down), cp = c.pile;
      if((cp.isPile || cp.isWaste) && c.isLast) return new Move(c, f);
      c = c.twin, cp = c.pile;
      if((cp.isPile || cp.isWaste) && c.isLast) return new Move(c, f);
    }
    return null;
  },

  isWon: "26 cards on each foundation"
};
