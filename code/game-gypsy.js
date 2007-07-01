const GypsyBase = {
  __proto__: BaseCardGame,

  helpId: "gypsy",
  layout: GypsyLayout,
  pilesToBuild: "8p 8f s",
  pileTypes: { s: StockDealToPiles, p: GypsyPile },
  dealMapStr: "P 2 1",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
  },

  getBestDestinationFor: "legal nonempty, or empty",

  getFoundationDestinationFor: function(card) {
    if(!card.isLast) return null;
    if(card.isAce) {
      var twinp = card.twin.pile;
      return twinp.isFoundation && !twinp.twin.hasCards ? twinp.twin : this.firstEmptyFoundation;
    }
    var down = card.down, c = down;
    do {
      var p = c.pile;
      if(p.isFoundation && c.isLast) return p;
      c = c.twin;
    } while(c != down);
    return null;
  },

  autoplay: function() {
    const ps = this.piles;
    const nums = this.getAutoplayableNumbers();
    for(var i = 0; i != 8; i++) {
      var last = ps[i].lastCard;
      if(!last || last.number > nums[last.suit]) continue;
      var act = this.getFoundationMoveFor(last);
      if(act) return act;
    }
    return null;
  },

  getAutoplayableNumbers: "gypsy",

  isWon: "13 cards on each foundation"
};

Games.gypsy2 = {
  __proto__: GypsyBase,
  cards: [[SPADE, HEART], 4]
};

Games.gypsy4 = {
  __proto__: GypsyBase,
  cards: 2
};
