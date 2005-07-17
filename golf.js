const GolfBase = {
  __proto__: BaseCardGame,

  stockType: StockDealToFoundation,
  foundationType: GolfFoundation,
  pileType: GolfPile,
  pileLayout: FanDownLayout,

  layoutTemplate: "v[3[sl]2f3] [2p1p1p1p1p1p1p2]",

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, 0, this.cardsPerColumn);
    this.foundation.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  getHints: function() {
    const f = this.foundation, ps = this.piles;
    for(var i = 0; i != 7; i++) {
      var card = ps[i].lastChild;
      if(card && f.mayAddCard(card)) this.addHint(card, f);
    }
  },

  getBestActionFor: function(card) {
    const f = this.foundation;
    return f.mayAddCard(card) ? new Move(card, f) : null;
  },

  isWon: function() {
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; ++i) if(ps[i].hasChildNodes()) return false;
    return true;
  }
};


Games.golf1 = {
  __proto__: GolfBase,
  cardsPerColumn: 5,
  init: function() {
    this.cards = makeDecksMod13(1);
  }
};


Games.golf2 = {
  __proto__: GolfBase,
  cardsPerColumn: 8,
  init: function() {
    this.cards = makeDecksMod13(2);
  }
};
