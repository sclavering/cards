Games["klondike"] = {
  __proto__: BaseCardGame,

  id: "klondike",
  rule_dealFromStock: "to-waste,can-turn-stock-over",


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
  rule_canMoveToPile: "descending,alt-colours,kings-in-spaces",


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
    var parent = card.parentNode;
    var piles = parent.isNormalPile ? this.getPilesRound(parent) : this.stacks;
    var i;
    for(i = 0; i < piles.length; i++)
      if(this.canMoveToPile(card,piles[i]))
        return piles[i];
    // find move to foundation
    if(parent.isFoundation) return null;
    for(i = 0; i < 4; i++) {
      var pile = this.foundations[i];
      if(this.canMoveToFoundation(card, pile)) return pile;
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
  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "card-revealed"       :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
