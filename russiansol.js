Games["russiansol"] = {
  __proto__: BaseCardGame,

  id: "yukon", // shares layout


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    this.dealToStack(cards,this.stacks[0],0,1);
    for(var i = 1; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,5);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  // in KPatience only kings can go in spaces, but that makes the game rarely work
  rule_canMoveToPile: "descending,in-suit",


  ///////////////////////////////////////////////////////////
  //// Hints
  getHints: function() {
    for(var i = 0; i < 7; i++) {
      this.getHintForCard(this.stacks[i].lastChild);
    }
  },
  // find card one greater in number and of the same suit
  getHintForCard: function(card) {
    if(!card) return;
    for(var i = 0; i < 7; i++) {
      var stack = this.stacks[i];
      if(stack==card.parentNode) continue;
      var current = stack.lastChild;
      while(current && current.faceUp()) {
        if(card.isConsecutiveTo(current) && card.isSameSuit(current)) {
          this.addHint(current,card.parentNode);
          return; // only ever get one hint per card, so may as well stop
        }
       current = current.previousSibling;
      }
    }
  },


  ///////////////////////////////////////////////////////////
  //// smart move
  getBestMoveForCard: function(card) {
    var i, stack;
    // find card of same suit and one greater in number on top of stacks
    for(i = 0; i < 7; i++) {
      stack = this.stacks[i];
      if(stack==card.parentNode) continue;
      var lc = stack.lastChild;
      if(lc && lc.isSameSuit(card) && lc.isConsecutiveTo(card)) return stack;
    }
    // find an empty stack
    for(i = 0; i < 7; i++) {
      stack = this.stacks[i];
      if(!stack.hasChildNodes()) return stack;
    }
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    // automove cards to suit stacks
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    // game won if all 4 Foundations have 13 cards
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  },
  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
