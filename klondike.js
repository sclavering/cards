Games["Klondike"] = {
  __proto__: BaseCardGame,

  shortname: "klondike",
  name: "Klondike",

  canTurnStockOver: true,


  init: function() {
    this.sourceStacks = [this.waste].concat(this.stacks);
  },


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1);
    for(var i = 0; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveToPile: function(card, stack) {
    // last on stack must be opposite colour and consecutive to card, or stack empty and card is a king
    var last = stack.lastChild;
    return (last
      ? (last.faceUp() && last.notSameColour(card) && last.isConsecutiveTo(card))
      : card.isKing());
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    this.getHintsForCard(this.waste.lastChild);
    for(var i = 0; i < 7; i++) {
      this.getHintsForCard(this.getLowestMoveableCard_AltColours(this.stacks[i]));
    }
  },
  getHintsForCard: function(card) {
    if(!card) return;
    var i, stack;
    for(i = 0; i < 7; i++) {
      stack = this.stacks[i];
      if(this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
    for(i = 0; i < 4; i++) {
      stack = this.foundations[i];
      if(this.canMoveTo(card,stack)) {
        this.addHint(card,stack);
        return; // don't hint more than one move to a foundation
      }
    }
  },


  ///////////////////////////////////////////////////////////
  //// smart move
  getBestMoveForCard: function(card) {
    var i;
    if(card.parentNode==this.waste) {
      // hunt through tableau piles
      for(i = 0; i < 7; i++)
        if(this.canMoveToPile(card,this.stacks[i])) return this.stacks[i];
    } else {
      // find move to surrounding pile
      var dest = this.searchAround(card,this.canMoveToPile);
      if(dest) return dest;
    }
    // find move to foundation
    for(i = 0; i < 4; i++) {
      var stack = this.foundations[i];
      if(stack==card.parentNode) continue;
      if(this.canMoveToFoundation(card,stack)) return stack;
    }
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    // automove cards to suit stacks
    for(var i = 0; i < this.sourceStacks.length; i++) {
      var last = this.sourceStacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce() || card.number()==2) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 2);
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
  getScoreForAction: function(action) {
    return (
      action=="move-to-foundation"   ?   10 :
      action=="move-from-waste"      ?    5 :
      action=="card-revealed"        ?    5 :
      action=="move-from-foundation" ?  -15 :
      action=="stock-turned-over"    ? -100 :
      0);
  }
};
