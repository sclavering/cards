Games.acesup = {
  __proto__: BaseCardGame,

  layout: AcesUpLayout,
  pilesToBuild: "s 4p f",
  pileTypes: { s: StockDealToPiles, f: AcesUpFoundation, p: AcesUpPile },
  dealMapStr: "P 0 1",

  init: function() {
    this.cards = makeCardRuns(2, 14); // aces high
    for(var i = 0; i != 4; i++) this.piles[i].num = i;
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  },

  getBestDestinationFor: function(card) {
    const f = this.foundation;
    if(card.pile == f) return null;
    if(f.mayAddCard(card)) return f;
    // return next empty pile
    for(var p = card.pile, p2 = p.next; p2 != p; p2 = p2.next)
      if(!p2.hasCards) return p2;
    return null;
  },

  // no autoplay for this game

  isWon: function() {
    if(this.stock.hasCards) return false;
    for(var i = 0; i != 4; i++) {
      var cs = this.piles[i].cards;
      if(cs.length != 1 || !cs[0].isAce) return false;
    }
    return true;
  }
};
