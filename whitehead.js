Games["whitehead"] = {
  __proto__: BaseCardGame,

  id: "whitehead",
  layout: "klondike",
  dealFromStock: "to waste",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, same colour",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    this.sourceStacks = [this.waste].concat(this.stacks);
  },

  deal: function() {
    var cards = getShuffledDecks(1);
    for(var i = 0; i != 7; i++) this.dealToStack(cards, this.stacks[i], 0, i+1);
    this.dealToStack(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testLastIsConsecutiveAndSameSuit(card))
        || searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: function() {
    for(var i = 0; i != this.sourceStacks.length; i++) {
      var last = this.sourceStacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  canAutoplayCard: function(card) {
    if(card.isAce || card.number==2) return true;
    return (countCardsOnFoundations(card.colour,card.number-1) == 2);
  },

  hasBeenWon: function() {
    for(var i = 0; i != 4; i++)
      if(this.foundations[i].childNodes.length!=13)
        return false;
    return true;
  },

  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
