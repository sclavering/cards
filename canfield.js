// provides: canfield, demon

var CanfieldBase = {
  __proto__: BaseCardGame,

  id: "canfield",
  getLowestMovableCard: "face up",

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

  dealFromStock: "to waste",

  turnStockOver: "yes",

  mayAddCardToFoundation: "canfield/penguin",

  mayAddCardToPile: "down, opposite colour",

  getHints: function() {
    this.addHintsFor(this.reserve.lastChild);
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 4; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: "legal nonempty, or empty",

  autoplay: "commonish",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "card-revealed": 5,
    "foundation->": -15
  }
};


Games.canfield = {
  __proto__: CanfieldBase,

  id: "canfield",

  deal: function(cards) {
    this.reserve.dealTo(cards, 12, 1);
    this.foundations[0].dealTo(cards, 0, 1);
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);

    var num = this.foundationStartNumber = this.foundations[0].firstChild.number;
    const cs = this.cards;
    this.foundationBases = [cs[num-1], cs[num+12], cs[num+25], cs[num+38]];
  }
};


Games.demon = {
  __proto__: CanfieldBase,

  id: "demon",
  layout: "canfield",

  init: function() {
    this.__proto__.init.call(this);
    this.reserve.className = "fan-down";
    initPile(this.reserve);
    this.reserve.mayTakeCard = this.mayTakeCardFromReserve;
    this.reserve.mayAddCard = this.mayAddCardToReserve;
  },

  deal: function(cards) {
    this.reserve.dealTo(cards, 0, 13);
    this.foundations[0].dealTo(cards, 0, 1);
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);

    var num = this.foundationStartNumber = this.foundations[0].firstChild.number;
    const cs = this.cards;
    this.foundationBases = [cs[num-1], cs[num+12], cs[num+25], cs[num+38]];
  }
}
