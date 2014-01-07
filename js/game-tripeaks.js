Games.tripeaks = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 28, TriPeaksPile, PyramidView, 0, 0,
    "f", 1, GolfFoundation, View, 0, 0,
  ],

  layoutTemplate: '[{class=pyramidlayout}#<     -  =  p  =  =  p  =  =  p  =  -     >.#<      =  p  p  =  p  p  =  p  p  =      >.#<     -  p  p  p  p  p  p  p  p  p  -     >.#<      p  p  p  p  p  p  p  p  p  p      >.]____#<   s  f   >.',

  allcards: [1, , , true],

  init: function() {
    const ps = this.piles;
    // indices of the leftChild's of piles 0-17 (piles 18+ have no children)
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];
    for(var i = 0; i != 18; i++) {
      var p = ps[i], n = lefts[i], l = ps[n], r = ps[n + 1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }

    for(i = 0; i != 28; ++i) ps[i].isPeak = i < 3;
  },

  deal: function(cards) {
    let ix = 0;
    for(let i = 0; i != 18; i++) ix = this._deal_cards(cards, ix, this.piles[i], 1, 0);
    for(let i = 18; i != 28; i++) ix = this._deal_cards(cards, ix, this.piles[i], 0, 1);
    ix = this._deal_cards(cards, ix, this.foundation, 0, 1);
    ix = this._deal_cards(cards, ix, this.stock, 52, 0);
  },

  getBestActionFor: function(card) {
    const f = Game.foundation, c = f.lastCard;
    return card.faceUp && (c.number == card.upNumber || c.upNumber == card.number) && new Move(card, f);
  },

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
