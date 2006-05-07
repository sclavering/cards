const CanfieldBase = {
  __proto__: BaseCardGame,

  layout: CanfieldLayout,
  stockType: StockDealToWasteOrRefill,
  pileType: CanfieldPile,
  _reserveCards: [12,1],

  init: function() {
    this.cards = makeDecksMod13(1);
  },

  deal: function(cards) {
    this._dealSomeCards(this.foundations[0], cards, [0, 1]);
    this._dealSomeCards(this.reserve, cards, this._reserveCards);
    for(var i = 0; i != 4; i++) this._dealSomeCards(this.piles[i], cards, [0, 1]);
    this._dealSomeCards(this.stock, cards, [cards.length]);

    const cs = this.cards;
    const num = this.foundations[0].firstCard.displayNum;
    renumberCards(cs, num);
    this.foundationBases = [cs[num-1], cs[num+12], cs[num+25], cs[num+38]];
  },

  getHints: function() {
    this.addHintsFor(this.reserve.lastCard);
    this.addHintsFor(this.waste.lastCard);
    for(var i = 0; i != 4; i++) this.addHintsForLowestMovable(this.piles[i]);
  },

  getLowestMovableCard_helper: "face up",

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation"
};

Games.canfield = {
  __proto__: CanfieldBase
};

Games.canfield3 = {
  helpId: "canfield",
  __proto__: CanfieldBase,
  stockType: Deal3OrRefillStock,
  wasteView: Deal3VWasteView
};

Games.demon = {
  __proto__: CanfieldBase,
  reserveView: FanDownView,
  _reserveCards: [0,13]
};
