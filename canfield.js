Games["canfield"] = {
  __proto__: BaseCardGame,

  id: "canfield",
  acesHigh: true,
  dealFromStock: "to waste, can turn stock over",
  getLowestMovableCard: "face up",

  init: function() {
    this.sourceStacks = [this.reserve,this.waste].concat(this.stacks);
  },

  deal: function() {
    var cards = getShuffledDecks(1)
    this.dealToStack(cards,this.reserve,12,1);
    this.dealToStack(cards,this.foundations[0],0,1);
    this.foundationStartNumber = this.foundations[0].firstChild.number;
    for(var i = 0; i < 4; i++) this.dealToStack(cards,this.stacks[i],0,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },

  canMoveToFoundation: function(card, stack) {
    // only the top card on a stack can be moved to foundations
    if(card.nextSibling) return false;
    // either the stack is empty and the card is whatever base number we are building foundations from,
    // or it is consecutive (wrapping round at 13) and of the same suit
    var last = stack.lastChild;
    return (last ? (card.isSameSuit(last) && card.isConsecutiveMod13To(last))
                 : (card.number==this.foundationStartNumber));
  },

  canMoveToPile: function(card, stack) {
    // either the pile must be empty, or the top card must be consecutive (wrapping at king) and opposite colour
    var last = stack.lastChild;
    return (!last || (!last.isSameColour(card) && last.isConsecutiveMod13To(card)));
  },

  getHints: function() {
    this.addHintsFor(this.reserve.lastChild);
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 4; i++) this.addHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || searchPiles(this.foundations, testCanMoveToFoundation(card));
  },

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
    if(card.number==this.foundationStartNumber) return true;
    // can move any other card there as long as the two one less in number and of the same colour are already there
    var found = 0;
    for(var i = 0; i < 4; i++) {
      var top = this.foundations[i].lastChild;
      if(top && top.colour!=card.colour) {
        var num = card.number-1;
        if(num<0) num+=13;
        if(top.isAtLeastCountingFrom(num,this.foundationStartNumber)) found++;
      }
    }
    return (found==2);
  },

  hasBeenWon: function() {
    // game won if all 4 Foundations have 13 cards
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  },

  scores: {
    "move-to-foundation"  :  10,
    "move-from-waste"     :   5,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
