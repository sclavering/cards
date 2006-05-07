const KlondikeBase = {
  __proto__: BaseCardGame,

  pileType: KlondikePile,
  stockType: StockDealToWasteOrRefill,

  dealTemplate: "p 0,1 1,1 2,1 3,1 4,1 5,1 6,1",

  init: function() {
    const cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastCard);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.pile.isWaste) this.addHintToFirstEmpty(card);
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getLowestMovableCard_helper: "face up",

  getBestDestinationFor: "legal",

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation",

  hasScoring: true,

  getScoreFor: function(act) {
    if(act instanceof RefillStock) return -100;
    if(!(act instanceof Move)) return 0;
    const s = act.source, d = act.destination;
    if(d.isFoundation) return s.isFoundation ? 0 : 10;
    if(s.isFoundation) return -15;
    return s.isWaste ? 5 : 0;
  },

  scoreForRevealing: 5
};


Games.klondike1 = {
  __proto__: KlondikeBase,
  helpId: "klondike",
  layout: KlondikeLayout
};


Games.klondike3 = {
  __proto__: KlondikeBase,
  stockType: Deal3OrRefillStock,
  layout: KlondikeDraw3Layout
};


Games.doubleklondike = {
  __proto__: KlondikeBase,
  init: function() {
    const cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },
  layout: DoubleKlondikeLayout,
  dealTemplate: "p 0,1 1,1 2,1 3,1 4,1 5,1 6,1 7,1 8,1 9,1",
  autoplay: "commonish 2deck",
  getAutoplayableNumbers: "gypsy"
};
