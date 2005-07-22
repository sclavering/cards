const GypsyBase = {
  __proto__: BaseCardGame,

  stockType: StockDealToPiles,
  pileType: GypsyPile,
  pileLayout: FanDownLayout,

  layoutTemplate: "h2p1p1p1p1p1p1p1p2[{align=center}[[f f f f] [f f f f]] sl]2",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
  },

  deal: function(cards) {
    for(var i = 0; i != 8; i++) this.piles[i].dealTo(cards, 2, 1);
    this.stock.dealTo(cards, cards.length, 0);
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

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "foundation->": -15
  },

  scoreForRevealing: 5
};

Games.gypsy2 = {
  __proto__: GypsyBase,
  cards: [[SPADE, HEART], 4]
};

Games.gypsy4 = {
  __proto__: GypsyBase,
  cards: 2
};
