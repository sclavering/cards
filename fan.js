Games["Fan"] = {
  shortname: "fan",

  // stuff the CardGame() constructor would initialise if we were using it
  stockCanTurnOver: false,
  acesHigh: false,
  usesMouseHandler2: false,

  init: function() {
    this.initStacks(18,4,0,false,false);
    this.dragDropTargets = this.stacks.concat(this.foundations);
  },


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    for(var i = 0; i < 17; i++) this.dealToStack(cards, this.stacks[i], 0, 3);
    this.dealToStack(cards, this.stacks[17], 0, 1);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveCard: function(card) {
    return card.isLastOnPile();
  },
  
  canMoveToPile: function(card, pile) {
    var last = pile.lastChild;
    return (last ? last.isConsecutiveTo(card) && last.isSameSuit(card) : card.isKing());
  },
  
  canMoveToFoundation: function(card, pile) {
    var last = pile.lastChild;
    return (last ? card.isConsecutiveTo(last) && card.isSameSuit(last) : card.isAce());
  }, 


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < this.stacks.length; i++) {
      var card = this.stacks[i].lastChild;
      if(!card) continue;
      for(var j = 0; j < this.stacks.length; j++)
        if(this.canMoveTo(card, this.stacks[j]))
          this.addHint(card, this.stacks[j]);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    for(var i = 0; i < this.stacks.length; i++)
      if(this.canMoveTo(card, this.stacks[i]))
        return this.stacks[i];
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  },
  
  __proto__: CardGame.prototype
}
