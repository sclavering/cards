const CanfieldBase = {
  __proto__: BaseCardGame,

  stockType: StockDealToWasteOrRefill,
  foundationType: KlondikeFoundation,
  pileType: KlondikePile,

  layoutTemplate: "h2[s w]2[f p]1[f p]1[f p]1[f p]2r2",

  init: function() {
    this.cards = makeDecksMod13(1);
  },

  deal: function(cards) {
    this.foundations[0].dealTo(cards, 0, 1);
    this.reserve.dealTo(cards, this.reserveFaceDownCards, this.reserveFaceUpCards);
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);

    const cs = this.cards;
    const num = this.foundations[0].firstChild.number;
    renumberCards(cs, num);
    this.foundationBases = [cs[num-1], cs[num+12], cs[num+25], cs[num+38]];
  },

  getHints: function() {
    this.addHintsFor(this.reserve.lastChild);
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 4; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "face up",

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation"
};


Games.canfield = {
  __proto__: CanfieldBase,
  reserveLayout: BaseLayout,
  reserveFaceDownCards: 12,
  reserveFaceUpCards: 1
};


Games.demon = {
  __proto__: CanfieldBase,
  reserveLayout: FanDownLayout,
  reserveFaceDownCards: 0,
  reserveFaceUpCards: 13
}
