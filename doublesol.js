/* this is a rather weird variant of Double Klondike, where foundations
   are built: A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K in
   strict suits, and one set of aces is missing
   */

Games["doublesol"] = {
  __proto__: BaseCardGame,

  id: "doublesol",
  dealFromStock: "to waste, can turn stock over",
  canMoveToPile: "descending, alt colours, kings in spaces",
  getLowestMovableCard: "face up",

  init: function() {
    this.sourceStacks = [this.waste].concat(this.stacks);
  },

  deal: function() {
    // get two packs less one set of aces
    var cards = getDecks(2);
    cards.splice(78,1); cards.splice(52,1);
    cards.splice(26,1); cards.splice(0,1);
    cards = shuffle(cards);
    for(var i = 0; i < 10; i++) this.dealToStack(cards,this.stacks[i],i,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },

  canMoveToFoundation: function(card, stack) {
    if(card.nextSibling) return false;
    // foundations are built A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
    var last = stack.lastChild;
    if(!last) return card.isAce;
    if(!card.isSameSuit(last)) return false;
    if(card.number==last.number) return true;
    return (
      (!last.previousSibling || last.previousSibling.number==last.number)
      && card.isConsecutiveTo(last));
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 10; i++) this.getHintsFor(this.getLowestMovableCard(this.stacks[i]));
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
    // automove cards to suit stacks
    for(var i = 0; i < this.sourceStacks.length; i++) {
      var last = this.sourceStacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce || card.number==2) return true;
    return (this.numCardsOnFoundations(card.altcolour,card.number-1) == 2);
  },

  hasBeenWon: function() {
    // game won if all 4 Foundations have 25==13*2-1 cards
    for(var i = 0; i < 4; i++)
      if(this.foundations[i].childNodes.length!=25)
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
}
