Games["golf"] = {
  __proto__: BaseCardGame,

  id: "golf",


  init: function() {
    this.stockDealTargets = [this.foundation];
  },


  ///////////////////////////////////////////////////////////
  //// start game
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
  	for(var i = 0; i < 7; i++)
  	  this.dealToStack(cards,this.stacks[i],0,cardsPerColumn);
  	this.dealToStack(cards,this.foundation,0,1);
  	this.dealToStack(cards,this.stock,cards.length,0);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveCard: function(card) {
    return (card.parentNode!=this.foundation && card.isLastOnPile());
  },

  canMoveTo: function(card, stack) {
    if(stack != this.foundation) return false;
    var diff = this.foundation.lastChild.number() - card.number();
    return (diff ==  1 || diff == -1 // can go up or one by down
            || (this.difficultyLevel==1 && (diff == -12 || diff == 12)));  // Or King<->Ace in easy mode
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < 7; i++) {
      var card = this.stacks[i].lastChild;
      if(card && this.canMoveTo(card, this.foundation))
      	this.addHint(card,this.foundation);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  smartMove: function(card) {
    if(this.canMoveTo(card, this.foundation)) this.moveTo(card, this.foundation);
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    var card = this.stock.lastChild;

    if(card && card.faceUp()) {  // We must have just flipped it... see below...
      card.moveTo(this.foundation);
      this.trackMove("dealt-from-stock", null, null);
      return true;
    }

    var allEmpty = true;
    // If there are no moveable cards move a card from the stock to the foundation
    // (Any possible moves might be delayed as strategy otherwise...)
    for(var i = 0; i < 7; i++) {
      card = this.stacks[i].lastChild;
      if(card) {
        allEmpty = false;
        if(this.canMoveTo(card, this.foundation)) return false;
      }
    }

    // dealFromStock doesn't animate, so it's easy to miss...  we can do it ourself
    card = this.stock.lastChild;
    // If we want to move a card, first we'll flip it, then next autoplay will move it.
    if(card) {
      card.turnFaceUp();
      return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    return (this.score == 0);
  },
  scores: {
    "move-to-foundation": -1,
    "dealt-from-stock"  : -1
  }
}
