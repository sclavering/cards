Games["acesup"] = {
  __proto__: BaseCardGame,

  id: "acesup",
  acesHigh: true,


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    // If the four cards at the bottom of the stock are all different suits the
    // game is impossible. Check if this has happened and reshuffle if so
    while(this.allDifferentSuits(cards)) cards = this.shuffleDecks(1);
    // deal the cards
    for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },
  allDifferentSuits: function(cards) {
    // the cards which end up at the bottom of the stock are 44-48
    for(var i = 44; i < 48; i++)
      for(var j = 44; j < i; j++)
        if(cards[i].isSameSuit(cards[j])) return false;
    return true;
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveCard: function(card) {
    var p = card.parentNode;
    return (card.isLastOnPile() && !p.isFoundation && !p.isStock);
  },

  rule_canMoveToPile: "isempty",

  canMoveToFoundation: function(card, foundation) {
    for(var i = 0; i < 4; i++) {
      var stack = this.stacks[i];
      var top = stack.lastChild;
      if(top==card) top = top.previousSibling; // only relevant when |card| was middle-clicked
      if(top && card.isSameSuit(top) && card.number()<top.number()) return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// hints - NONE


  ///////////////////////////////////////////////////////////
  //// smart move
  smartMove: function(card) {
    if(!this.canMoveCard(card)) return;
    if(this.canMoveToFoundation(card)) {
      this.moveTo(card,this.foundation);
    } else {
      var stack = this.getNextEmptyStack(card.parentNode);
      if(stack) this.moveTo(card,stack);
    }
  },
  getNextEmptyStack: function(stack) {
    var stacknum = parseInt(stack.id[stack.id.length-1]); // last char of id is the stack number
    for(var i = 0; i < 4; i++) {
      var next = this.stacks[(i+stacknum) % 4];
      if(next!=stack && !next.hasChildNodes()) return next;
    }
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay - NONE


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    if(this.stock.childNodes.length!=0) return false;
    for(var i = 0; i < 4; i++) {
      var s = this.stacks[i];
      if(s.childNodes.length!=1 || !s.lastChild.isAce()) return false;
    }
    return true;
  }
}
