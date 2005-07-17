const KlondikeBase = {
  __proto__: BaseCardGame,

  foundationType: KlondikeFoundation,
  pileType: KlondikePile,

  init: function() {
    var cs = this.cards = makeDecks(1);

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var c = cs[k];
        c.autoplayAfterA = cs[k+off[i]-1];
        c.autoplayAfterB = cs[k+off[i+4]-1];
        //c.onA = cards[k+off[i]+1];
        //c.onB = cards[k+off[i+4]+1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, i, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = this.firstEmptyPile;
        if(pile) this.addHint(card, pile);
      }
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getLowestMovableCard: "face up",

  getBestDestinationFor: "legal",

  autoplay: "commonish",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "foundation->": -15,
    "stock-turned-over": -100
  },

  scoreForRevealing: 5
};


Games.klondike1 = {
  __proto__: KlondikeBase,
  stockType: StockDealToWasteOrRefill,
  wasteLayout: BaseLayout,
  layoutTemplate: "v[1[sl]1w1#1f1f1f1f1] [1p1p1p1p1p1p1p1]"
};


Games.klondike3 = {
  __proto__: KlondikeBase,
  stockType: Deal3OrRefillStock,
  wasteType: Deal3Waste,
  wasteLayout: null,
  layoutTemplate: "v[1[sl]1w2f1f1f1f1] [1p1p1p1p1p1p1p1]"
};
