Games["sanibel"] = {
  __proto__: BaseCardGame,

  id: "sanibel",


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(2);
    this.dealToStack(cards,this.stock,3,0);
    this.dealToStack(cards,this.waste,0,1);
    for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],3,7);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  rule_canMoveToPile: "descending,alt-colours",


  ///////////////////////////////////////////////////////////
  //// Hints
  getHints: function() {
    for(var i = 0; i < 10; i++) {
      this.getHintsForCard(this.stacks[i].lastChild);
    }
  },
  // take a card a find another card on a differnt stack of opposite colour and one less in rank
  getHintsForCard: function(card) {
    if(!card) return;
    for(var i = 0; i < 10; i++) {
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


  ///////////////////////////////////////////////////////////
  //// smart move
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


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    // move stuff to foundations
    for(var i = 0; i < this.stacks.length; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.canMoveCard(last) && this.canAutoplayCard(last)
        && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce()) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 4);
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    // game won if all 4 Foundations have 13 cards
    for(var i = 0; i < 8; i++)
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
