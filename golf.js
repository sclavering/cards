Games["golf"] = {
  __proto__: BaseCardGame,

  id: "golf",
  difficultyLevels: ["easy-golf","medium-1deck","hard-2decks"],
  dealFromStock: "to foundation",

  init: function() {
    this.stockDealTargets = [this.foundation];

    var cards = this.cards = [];
    cards[1] = cards[2] = getDecks(1); // for easy or medium games
    cards[3] = getDecks(2); // for hard games
  },

  deal: function(cards) {
    var cardsPerColumn = [,5,5,8][this.difficultyLevel];
    this.setScoreTo([,51,51,103][this.difficultyLevel]);
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, cardsPerColumn);
    dealToPile(cards, this.foundation, 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveCard: function(card) {
    return (card.parentNode.isNormalPile && !card.nextSibling);
  },

  canMoveTo: function(card, pile) {
    if(pile!=this.foundation) return false;
    var last = pile.lastChild;
    // K->A or A->K allowed in Easy mode
    if(this.difficultyLevel==1) return card.differsByOneMod13From(last);
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
}
