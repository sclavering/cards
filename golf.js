Games["golf"] = {
  __proto__: BaseCardGame,

  id: "golf",
  difficultyLevels: ["easy-golf","medium-1deck","hard-2decks"],
  rule_dealFromStock: "to-foundation",

  init: function() {
    this.stockDealTargets = [this.foundation];
  },

  deal: function() {
    var cards;
    var cardsPerColumn;
    if(this.difficultyLevel==3) {
      cards = this.shuffleDecks(2);
      cardsPerColumn = 8;
      this.score = 103;
    } else {
      cards = this.shuffleDecks(1);
      cardsPerColumn = 5;
      this.score = 51;
    }
    for(var i = 0; i < 7; i++) this.dealToStack(cards,this.stacks[i],0,cardsPerColumn);
    this.dealToStack(cards,this.foundation,0,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },

  canMoveCard: function(card) {
    return (card.parentNode.isNormalPile && !card.nextSibling);
  },

  canMoveTo: function(card, stack) {
    if(stack!=this.foundation) return false;
    var last = stack.lastChild;
    // K->A or A->K allowed in Easy mode
    if(this.difficultyLevel==1) return card.differsByOneMod13To(last);
    return card.differsByOneTo(last);
  },

  getHints: function() {
    for(var i = 0; i < 7; i++) {
      var card = this.stacks[i].lastChild;
      if(card && this.canMoveTo(card, this.foundation))
      	this.addHint(card,this.foundation);
    }
  },

  smartMove: function(card) {
    if(this.canMoveTo(card, this.foundation)) this.moveTo(card, this.foundation);
  },

  hasBeenWon: function() {
    return (this.score == 0);
  },

  scores: {
    "move-to-foundation": -1,
    "dealt-from-stock"  : -1
  }
}
