Games["canfield"] = {
  __proto__: BaseCardGame,

  id: "canfield",
  dealFromStock: "to waste, can turn stock over",
  getLowestMovableCard: "face up",

  deal: function() {
    var cards = shuffle(this.cards);
    dealToPile(cards, this.reserve, 12, 1);
    dealToPile(cards, this.foundations[0], 0, 1);
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 0, 1);
    dealToPile(cards, this.stock, cards.length, 0);
    this.foundationStartNumber = this.foundations[0].firstChild.number;
  },

  canMoveToFoundation: function(card, pile) {
    // only the top card on a pile can be moved to foundations
    if(card.nextSibling) return false;
    // either the foundation is empty and the card is whatever base number we are building from,
    // or it is consecutive (wrapping round at 13) and of the same suit
    var last = pile.lastChild;
    return (last ? (card.isSameSuit(last) && card.isConsecutiveMod13To(last))
                 : (card.number==this.foundationStartNumber));
  },

  canMoveToPile: function(card, pile) {
    // either the pile must be empty, or the top card must be consecutive (wrapping at king) and opposite colour
    var last = pile.lastChild;
    return (!last || (!last.isSameColour(card) && last.isConsecutiveMod13To(card)));
  },

  getHints: function() {
    this.addHintsFor(this.reserve.lastChild);
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 4; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || searchPiles(this.foundations, testCanMoveToFoundation(card));
  },

  autoplayMove: function() {
    for(var i in this.sourcePiles) {
      var last = this.sourcePiles[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  canAutoplayCard: function(card) {
    // can always move card of the same num as the one which was initially dealt to foundations
    if(card.number==this.foundationStartNumber) return true;
    // can move any other card there as long as the two one less in number and of the same colour are already there
    var found = 0;
    for(var i = 0; i != 4; i++) {
      var top = this.foundations[i].lastChild;
      if(top && top.colour!=card.colour) {
        var num = card.number-1;
        if(num<0) num+=13;
        if(top.isAtLeastCountingFrom(num,this.foundationStartNumber)) found++;
      }
    }
    return (found==2);
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "move-from-waste"     :   5,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
}
