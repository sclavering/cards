Games["Canfield"] = {
  __proto__: BaseCardGame,

  shortname: "canfield",
  name: "Canfield",

  acesHigh: true,
  canTurnStockOver: true,


  init: function() {
    this.sourceStacks = [this.reserve,this.waste].concat(this.stacks);
  },


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.shuffleDecks(1)
    this.dealToStack(cards,this.reserve,12,1);
    this.dealToStack(cards,this.foundations[0],0,1);
    this.foundationStartNumber = this.foundations[0].firstChild.number()
    for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveToFoundation: function(card, stack) {
    // only the top card on a stack can be moved to foundations
    if(!card.isLastOnPile()) return false;
    // either the stack is empty and the card is whatever base number we are building foundations from,
    // or it is consecutive (wrapping round at 13) and of the same suit
    var last = stack.lastChild;
    return (last ? (card.isSameSuit(last) && card.isConsecutiveMod13To(last))
                 : (card.number()==this.foundationStartNumber));
  },
  canMoveToPile: function(card, stack) {
    // either the pile must be empty, or the top card must be consecutive (wrapping at king) and opposite colour
    var last = stack.lastChild;
    return (!last || (last.notSameColour(card) && last.isConsecutiveMod13To(card)));
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    this.getHintsForCard(this.reserve.lastChild);
    this.getHintsForCard(this.waste.lastChild);
    for(var i = 0; i < 4; i++) {
      this.getHintsForCard(this.getLowestMoveableCard_AltColours(this.stacks[i]));
    }
  },
  getHintsForCard: function(card) {
    if(!card) return;
    var i, stack;
    for(i = 0; i < 4; i++) {
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
  // picks the first stack from the left the card could go to, or failing that, the first foundation
  getBestMoveForCard: function(card) {
    var i, stack;
    // find moves to non empty stacks
    for(i = 0; i < 4; i++) {
      stack = this.stacks[i];
      if(stack==card.parentNode) continue; // unnecessary?
      if(stack.hasChildNodes() && this.canMoveToPile(card,stack)) return stack;
    }
    // find moves to empty stacks
    for(i = 0; i < 4; i++) {
      stack = this.stacks[i];
      if(stack==card.parentNode) continue;
      if(!stack.hasChildNodes() && this.canMoveToPile(card,stack)) return stack;
    }
    // find moves to foundations
    for(i = 0; i < 4; i++) {
      stack = this.foundations[i];
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
      if(last && this.canAutoSendCardToFoundations(last) && this.sendToFoundations(last))
        return true;
    }
    return false;
  },
  canAutoSendCardToFoundations: function(card) {
    // can always move card of the same num as the one which was initially dealt to foundations
    if(card.number()==this.foundationStartNumber) return true;
    // can move any other card there as long as the two one less in number and of the same colour are already there
    var found = 0;
    for(var i = 0; i < 4; i++) {
      var top = this.foundations[i].lastChild;
      if(top && top.colour()!=card.colour()) {
        var num = card.number()-1;
        if(num<0) num+=13;
        if(top.isAtLeastCountingFrom(num,this.foundationStartNumber)) found++;
      }
    }
    return (found==2);
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
      action=="move-to-foundation"   ?  10 :
      action=="move-from-waste"      ?   5 :
      action=="card-revealed"        ?   5 :
      action=="move-from-foundation" ? -15 :
      0);
  }
}
