Games.tripeaks = {
  __proto__: PyramidBase,

  layout: TriPeaksLayout,
  pilesToBuild: "28p s w",
  pileTypes: { s: StockDealToFoundation, f: GolfFoundation, p: TriPeaksPile },

  init: function() {
    this.cards = makeDecksMod13(1);
    const ps = this.piles;
    // indices of the leftChild's of piles 0-17 (piles 18+ have no children)
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];
    for(var i = 0; i != 18; i++) {
      var p = ps[i], n = lefts[i], l = ps[n], r = ps[n+1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }

    ps[0].isPeak = ps[1].isPeak = ps[2].isPeak = true;

    this.foundation.free = true;
  },

  deal: function(cards) {
    for(var i = 0; i != 18; i++) this._dealSomeCards(this.piles[i], cards, [1]);
    for(i = 18; i != 28; i++) this._dealSomeCards(this.piles[i], cards, [0, 1]);
    this._dealSomeCards(this.foundation, cards, [0, 1]);
    this._dealSomeCards(this.stock, cards, [cards.length]);
  },

  getBestActionFor: function(card) {
    const f = Game.foundation, c = f.lastCard;
    return card.faceUp && (c.number==card.upNumber || c.upNumber==card.number) && new Move(card, f);
  },

  // xxx write getHints()

  getCardsToReveal: function(pileWhichHasHadCardsRemoved) {
    const res = [];
    const lp = pileWhichHasHadCardsRemoved.leftParent, rp = pileWhichHasHadCardsRemoved.rightParent;
    if(lp && !lp.leftChild.hasCards) res.push(lp.firstCard);
    if(rp && !rp.rightChild.hasCards) res.push(rp.firstCard);
    return res;
  },

  isWon: function() {
    // won when the the peaks are empty
    for(var i = 0; i != 3; i++) if(this.piles[i].hasCards) return false;
    return true;
  },

  hasScoring: true,

  getScoreFor: function(action) {
    if(action instanceof DealToPile) {
      action.streakLength = 0;
      return -5;
    }

    const acts = this.actionList, ptr = this.actionPtr;
    const prev = ptr > 1 ? acts[ptr - 2] : null;

    // it's a Move
    var score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // bonuses for removing a peak card
    var pile = action.source, ps = this.piles;
    if(pile.isPeak)
      score += (ps[0].hasCards + ps[1].hasCards + ps[2].hasCards == 1) ? 30 : 15;

    return score;
  }
}
