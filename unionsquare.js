Games.unionsquare = {
  __proto__: BaseCardGame,

  stockType: StockDealToWaste,
  foundationType: UnionSquareFoundation,
  pileType: UnionSquarePile,

  layoutTemplate: "h2[s w]2[[p1p1p1p] [p1p1p1p] [p1p1p1p] [p1p1p1p]]2[f f f f]2",

  dealTemplate: { piles: [0,1] },

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];

    const ps = this.piles;
    for(var i = 0; i != 16; ++i) ps[i].following = ps.slice(i+1).concat(ps.slice(0, i));
  },

  // xxx write getHints()

  getBestDestinationFor: function(card) {
    const p = card.parentNode, ps = p.isPile ? p.following : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; ++i) {
      var q = ps[i];
      if(q.hasChildNodes()) {
        if(q.mayAddCard(card)) return q;
      } else if(!empty) {
        empty = q;
      }
    }
    return empty;
  },

  getFoundationMoveFor: function(card) {
    const twin = card.twin, twinp = twin.parentNode;
    if(twinp.isFoundation) {
      if(card.isKing) return twinp;
      // >, not >=, or it'd allow Q,K,Q on foundations
      return twinp.childNodes.length>13 && twinp.lastChild.number==card.upNumber ? twinp : null;
    }
    // can now assume twin is not on foundation
    if(card.isAce) return this.firstEmptyFoundation;
    var down = card.down, downp = down.parentNode;
    if(downp.isFoundation && !down.nextSibling) return downp;
    down = down.twin, downp = down.parentNode;
    if(downp.isFoundation && !down.nextSibling) return downp;
    return null;
  },

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A
  autoplay: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; ++i) {
      var f = fs[i], len = f.childNodes.length, last = f.lastChild;
      if(len<12 || len==26) continue;
      var c = len==12 ? last.up : (len==13 ? last.twin : last.down), cp = c.parentNode;
      if((cp.isPile || cp.isWaste) && !c.nextSibling) return new Move(c, f);
      c = c.twin, cp = c.parentNode;
      if((cp.isPile || cp.isWaste) && !c.nextSibling) return new Move(c, f);
    }
    return null;
  },

  isWon: "26 cards on each foundation"
};
