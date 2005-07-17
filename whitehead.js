Games.whitehead = {
  __proto__: BaseCardGame,

  stockType: StockDealToWaste,
  foundationType: KlondikeFoundation,
  pileType: WhiteheadPile,

  layoutTemplate: "v[1s1w1#1f1f1f1f1] [1p1p1p1p1p1p1p1]",

  init: function() {
    var cs = this.cards = makeDecks(1);

    const off = [39, 13, -13, -39]; // offsets to other suit of same colour
    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var c = cs[k];
        c.on = j==12 ? null : cs[k+off[i]+1];
        if(j < 2) continue; // Aces and twos may always be autoplayed
        // Autoplay 6C after 5S (i.e. one less and of same colour, but different suit).
        c.autoplayAfter = cs[k+off[i]-1];
        c.__defineGetter__("mayAutoplay", function() { return this.autoplayAfter.parentNode.isFoundation; });
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, 0, i+1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, in suit",

  getBestDestinationFor: function(card) {
    var up = card.up, on = card.on;
    if(up) {
      var p = up.parentNode;
      if(p.isPile && !up.nextSibling) return p;
    }
    if(on) {
      p = on.parentNode;
      if(p.isPile && !on.nextSibling) return p;
    }
    return this.firstEmptyPile;
  },

  autoplay: "commonish",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "foundation->": -15,
    "stock-turned-over": -100
  }
};
