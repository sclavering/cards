// provides: golf, golf-easy, golf-hard

var GolfBase = {
  __proto__: BaseCardGame,

  get stockCounterStart() { return this.stock.childNodes.length; },

  layout: "golf",
  dealFromStock: "to foundation",

  cardsPerColumn: 5,
  initialScore: 51,

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, 0, this.cardsPerColumn);
    this.foundation.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  mayTakeCardFromFoundation: "no",

  mayTakeCardFromPile: "single card",

  mayAddCardToFoundation: function(card) {
    return card.differsByOneFrom(this.lastChild);
  },

  mayAddCardToPile: "no",

  getHints: function() {
    const f = this.foundation, ps = this.piles;
    for(var i = 0; i != 7; i++) {
      var card = ps[i].lastChild;
      if(card && f.mayAddCard(card)) this.addHint(card, f);
    }
  },

  doBestMoveForCard: function(card) {
    const f = this.foundation;
    return f.mayAddCard(card) ? new Move(card, f) : null;
  },

  isWon: function() {
    return this.score==0;
  },

  scores: {
    "->foundation": -1,
    "dealt-from-stock": -1
  }
};


// K->A or A->K allowed in Easy mode
Games["golf-easy"] = {
  __proto__: GolfBase,
  id: "golf-easy",

  init: function() {
    this.cards = makeDecksMod13(1);
  }
};


Games["golf"] = {
  __proto__: GolfBase,
  id: "golf"
};


// 2 decks used
Games["golf-hard"] = {
  __proto__: GolfBase,
  id: "golf-hard",
  cards: 2,
  cardsPerColumn: 8,
  initialScore: 103
};
