Games.golf = {
  names: ["easy-golf", "medium-1deck", "hard-2decks"],
  ids: ["golf-easy", "golf", "golf-hard"]
};


var GolfBase =
AllGames["golf"] = {
  __proto__: BaseCardGame,

  id: "golf",
  layout: "golf",
  dealFromStock: "to foundation",

//  init: function() {
//    this.stockDealTargets = [this.foundation];
//  },

  cardsPerColumn: 5,
  initialScore: 51,

  deal: function(cards) {
    this.setScoreTo(this.initialScore);
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, this.cardsPerColumn);
    dealToPile(cards, this.foundation, 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveCard: function(card) {
    return (card.parentNode.isNormalPile && !card.nextSibling);
  },

  canMoveTo: function(card, pile) {
    if(pile!=this.foundation) return false;
    var last = pile.lastChild;
    return card.differsByOneFrom(last);
  },

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var card = this.piles[i].lastChild;
      if(card && this.canMoveTo(card, this.foundation))
        this.addHint(card,this.foundation);
    }
  },

  smartMove: function(card) {
    if(this.canMoveTo(card, this.foundation)) this.moveTo(card, this.foundation);
  },

  hasBeenWon: function() {
    return this.score==0;
  },

  scores: {
    "move-to-foundation": -1,
    "dealt-from-stock"  : -1
  }
};


// K->A or A->K allowed in Easy mode
AllGames["golf-easy"] = {
  __proto__: GolfBase,

  id: "golf-easy",

  canMoveTo: function(card, pile) {
    if(pile!=this.foundation) return false;
    var last = pile.lastChild;
    return card.differsByOneMod13From(last);
  }
};


// 2 decks used
AllGames["golf-hard"] = {
  __proto__: GolfBase,

  id: "golf-hard",
  cards: 2,
  cardsPerColumn: 8,
  initialScore: 103
};
  