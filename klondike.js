const KlondikeBase = {
  __proto__: BaseCardGame,

  foundationType: KlondikeFoundation,
  pileType: KlondikePile,

  dealTemplate: { piles: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1]] },

  init: function() {
    const cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
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

  getAutoplayableNumbers: "klondike",

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
