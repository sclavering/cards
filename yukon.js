var YukonBase = {
  __proto__: BaseCardGame,

  rule_canMoveToPile: "descending,alt-colours",

  // take a card a find another card on a different stack of opposite colour and one less in rank
  getHintsForCard: function(card) {
    if(!card) return;
    for(var i = 0; i < this.stacks.length; i++) {
      var stack = this.stacks[i];
      if(stack==card.parentNode) continue;
      var current = stack.lastChild;
      while(current && current.faceUp()) {
        if(card.isConsecutiveTo(current) && card.notSameColour(current)) {
          // |current| could be moved onto |card|.  test if it's not already
          // on a card consecutive and of opposite colour
          var prev = current.previousSibling;
          if(!prev || !prev.isConsecutiveTo(current) || !prev.notSameColour(current))
            this.addHint(current,card.parentNode);
        }
        current = current.previousSibling;
      }
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? this.getPilesRound(card.parentNode) : this.stacks;
    var i, pile;
    for(i = 0; i < piles.length; i++) {
      pile = piles[i];
      if(pile.hasChildNodes() && this.canMoveTo(card,pile)) return pile;
    }
    for(i = 0; i < piles.length; i++) {
      pile = piles[i];
      if(!pile.hasChildNodes() && this.canMoveTo(card,pile)) return pile;
    }
    return null;
  },

  autoplayMove: function() {
    // move stuff to foundations
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.canMoveCard(last) && this.canAutoplayCard(last)
        && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: function() {
    // game won if all foundations have 13 cards
    for(var i = 0; i < this.foundations.length; i++)
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





Games["yukon"] = {
  __proto__: YukonBase,

  id: "yukon",

  deal: function() {
    var cards = this.shuffleDecks(1);
    this.dealToStack(cards,this.stacks[0],0,1);
    for(var i = 1; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,5);
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each stack for targets, then go and find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i < 7; i++) {
      this.getHintsForCard(this.stacks[i].lastChild);
    }
  },

  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce()) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
  }
};





Games["sanibel"] = {
  __proto__: YukonBase,

  id: "sanibel",
  rule_dealFromStock: "to-waste",

  deal: function() {
    var cards = this.shuffleDecks(2);
    this.dealToStack(cards,this.stock,3,0);
    this.dealToStack(cards,this.waste,0,1);
    for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],3,7);
  },

  getHints: function() {
    var i;
    var card = this.waste.lastChild;
    if(card) {
      for(i = 0; i < 10; i++) {
        if(this.canMoveTo(card, this.stacks[i])) this.addHint(card, this.stacks[i]);
      }
    }
    for(i = 0; i < 10; i++) {
      this.getHintsForCard(this.stacks[i].lastChild);
    }
  },

  canAutoplayCard: function(card) {
    if(card.isAce()) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 4);
  }
}
