Games["klondike"] = {
  __proto__: BaseCardGame,

  id: "klondike",
  dealFromStock: "to waste, can turn stock over",
  canMoveToPile: "descending, alt colours, kings in spaces",
  getLowestMovableCard: "face up",

  init: function() {
    this.sourceStacks = [this.waste].concat(this.stacks);
  },

  deal: function() {
    var cards = shuffle(this.cards);
    for(var i = 0; i < 7; i++) this.dealToStack(cards,this.stacks[i],i,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = searchPiles(this.stacks, testPileIsEmpty);
        if(pile) this.addHint(card, pile);
      }
      // to foundation
      pile = searchPiles(this.foundations, testCanMoveToFoundation(card));
      if(pile) this.addHint(card, pile);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testCanMoveToPile(card))
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: function() {
    for(var i = 0; i < this.sourceStacks.length; i++) {
      var last = this.sourceStacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  canAutoplayCard: function(card) {
    if(card.isAce || card.number==2) return true;
    return (countCardsOnFoundations(card.altcolour,card.number-1) == 2);
  },

  hasBeenWon: function() {
    // game won if all 4 foundations have 13 cards
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
