const GypsyBase = {
  __proto__: BaseCardGame,

  helpId: "gypsy",

  stockType: StockDealToPiles,
  pileType: GypsyPile,

  layoutTemplate: "h2p1p1p1p1p1p1p1p2[{align=center}[[f f f f] [f f f f]] sl]2",
  dealTemplate: "P 2,1",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, alt colours",

  getBestDestinationFor: "legal nonempty, or empty",

  getFoundationMoveFor: function(card) {
    if(card.nextSibling) return null;
    if(card.isAce) {
      var twinp = card.twin.parentNode;
      return twinp.isFoundation && !twinp.twin.hasChildNodes() ? twinp.twin : this.firstEmptyFoundation;
    }
    var down = card.down, c = down;
    do {
      var p = c.parentNode;
      if(p.isFoundation && !c.nextSibling) return p;
      c = c.twin;
    } while(c != down);
    return null;
  },

  autoplay: function() {
    const ps = this.piles;
    const nums = this.getAutoplayableNumbers();
    for(var i = 0; i != 8; i++) {
      var last = ps[i].lastChild;
      if(!last || last.number > nums[last.suit]) continue;
      var act = this.sendToFoundations(last);
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
