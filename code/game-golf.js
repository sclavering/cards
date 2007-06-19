const GolfBase = {
  __proto__: BaseCardGame,

  helpId: "golf",
  layout: GolfLayout,
  pilesToBuild: "s f 7p",
  pileTypes: { s: StockDealToFoundation, f: GolfFoundation, p: GolfPile },

  getBestActionFor: function(card) {
    const f = this.foundation;
    return card.pile.mayTakeCard(card) && f.mayAddCard(card) ? new Move(card, f) : null;
  },

  isWon: function() {
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; ++i) if(ps[i].hasCards) return false;
    return true;
  }
};


Games.golf1 = {
  __proto__: GolfBase,
  dealTemplate: "F 0,1; P 0,5",
  init: function() {
    this.cards = makeDecksMod13(1);
  }
};


Games.golf2 = {
  __proto__: GolfBase,
  dealTemplate: "F 0,1; P 0,8",
  init: function() {
    this.cards = makeDecksMod13(2);
  }
};
