const CanfieldBase = {
  __proto__: BaseCardGame,

  stockType: StockDealToWasteOrRefill,
  foundationType: DemonFoundation,
  pileType: KlondikePile,

  layoutTemplate: "h2[s w]2[f p]1[f p]1[f p]1[f p]2r2",

  init: function() {
    var cs = this.cards = makeDecksMod13(1);

    function mayAutoplay() {
      var base = Game.foundationStartNumber;
      return this.number==base || this.number==base+1
          || (this.autoplayAfterA.parentNode.isFoundation && this.autoplayAfterB.parentNode.isFoundation);
    };

    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var card = cs[k], offf = j==0 ? 13 : 0;
        card.autoplayAfterA = cs[k+off[i]+offf-1];
        card.autoplayAfterB = cs[k+off[i+4]+offf-1];
        //card.onA = cards[k+off[i]+1];
        //card.onB = cards[k+off[i+4]+1];
        card.__defineGetter__("mayAutoplay", mayAutoplay);
      }
    }
  },

  deal: function(cards) {
    this.reserve.dealTo(cards, this.reserveFaceDownCards, this.reserveFaceUpCards);
    this.foundations[0].dealTo(cards, 0, 1);
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);

    var num = this.foundationStartNumber = this.foundations[0].firstChild.number;
    const cs = this.cards;
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

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "foundation->": -15
  },

  scoreForRevealing: 5
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
