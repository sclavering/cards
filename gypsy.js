Games["gypsy"] = {
  __proto__: BaseCardGame,

  id: "gypsy",
  difficultyLevels: ["easy-2suits","hard-4suits"],
  rule_dealFromStock: "to-piles",
  rule_canMoveCard: "descending,alt-colours",
  rule_canMoveToPile: "descending,alt-colours",
  rule_getLowestMovableCard: "descending, alt colours",

  deal: function() {
    // 1==easy, 2==hard
    var cards = this.difficultyLevel==2 ? this.shuffleDecks(2) : this.shuffleSuits(4,4,0,0);
    for(var i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],2,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.stacks[i]));
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.stacks;
    return searchPiles(piles, testCanMoveToNonEmptyPile(card))
        || searchPiles(piles, testPileIsEmpty)
        || searchPiles(this.foundations, testCanMoveToFoundation(card));
  },

  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    if(card.isAce()) return this.sendAceToFoundations(card);
    for(var i = 0; i < this.foundations.length; i++)
      if(this.attemptMove(card,this.foundations[i]))
        return true;
    return false;
  },
  sendAceToFoundations: function(ace) {
    // see if there's a matching ace, if so place this one in line with that
    for(var i = 0; i < 8; i++) {
      var f = this.foundations[i];
      if(f.firstChild && f.firstChild.isSameSuit(ace)) {
        var target = this.foundations[i<4 ? i+4 : i-4];
        if(this.attemptMove(ace, target)) return true;
      }
    }
    // otherwise put in the first empty space
    for(var j = 0; j < 8; j++)
      if(this.attemptMove(ace, this.foundations[j]))
        return true;
    return false;
  },

  autoplayMove: function() {
    // automove cards to suit stacks
    for(var i = 0; i < 8; i++) {
      var last = this.stacks[i].lastChild;
      if(last && this.canAutoplayCard(last) && this.sendToFoundations(last)) return true;
    }
    return false;
  },
  // card can be autoplayed if both cards with the next lower number and of opposite colour are on foundations
  canAutoplayCard: function(card) {
    if(card.isAce() || card.number()==2) return true;
    return (this.numCardsOnFoundations(card.altcolour(),card.number()-1) == 4);
  },

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
