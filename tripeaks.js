Games.tripeaks = {
  __proto__: PyramidBase,

  stockType: StockDealToFoundation,
  foundationType: GolfFoundation,
  pileType: GolfPile,
  pileLayout: {
    __proto__: PyramidLayout,
    isPeak: false
  },

  layoutTemplate: "v(<41-2+2p2+2+2p2+2+2p2+2-14><42+2p2p2+2p2p2+2p2p2+24>"
    +"<41-2p2p2p2p2p2p2p2p2p2-14><42p2p2p2p2p2p2p2p2p2p24>)3[3[s l]2f3]2",

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
    for(var i = 0; i != 18; i++) this.piles[i].dealTo(cards, 1, 0);
    for(i = 18; i != 28; i++) this.piles[i].dealTo(cards, 0, 1);
    this.foundation.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  getBestActionFor: function(card) {
    const f = Game.foundation, c = f.lastChild;
    return card.faceUp && (c.number==card.upNumber || c.upNumber==card.number) && new Move(card, f);
  },

  // xxx write getHints()

  getCardsToReveal: function(pileWhichHasHadCardsRemoved) {
    const res = [];
    const lp = pileWhichHasHadCardsRemoved.leftParent, rp = pileWhichHasHadCardsRemoved.rightParent;
    if(lp && !lp.leftChild.hasChildNodes()) res.push(lp.firstChild);
    if(rp && !rp.rightChild.hasChildNodes()) res.push(rp.firstChild);
    return res;
  },

  isWon: function() {
    // won when the the peaks are empty
    for(var i = 0; i != 3; i++) if(this.piles[i].hasChildNodes()) return false;
    return true;
  },

  getScoreFor: function(action) {
    if(action instanceof DealToPile) {
      action.streakLength = 0;
      return -5;
    }

    var done = this.actionsDone;
    var prev = done.length>1 ? done[done.length-2] : null;

    // it's a Move
    var score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // bonuses for removing a peak card
    var pile = action.source, ps = this.piles;
    if(pile.isPeak)
      score += (ps[0].hasChildNodes() + ps[1].hasChildNodes() + ps[2].hasChildNodes() == 1) ? 30 : 15;

    return score;
  }
}
