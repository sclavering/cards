Games["simon"] = {
  __proto__: BaseCardGame,

  id: "simon",


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards =
      this.difficultyLevel==1 ? this.shuffleSuits(4,0,0,0) :
      this.difficultyLevel==2 ? this.shuffleSuits(2,2,0,0) :
      this.shuffleDecks(1);
    this.dealToStack(cards,this.stacks[0],0,8);
    this.dealToStack(cards,this.stacks[1],0,8);
    for(var i = 2; i < 10; i++) this.dealToStack(cards,this.stacks[i],0,10-i);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  rule_canMoveCard: "descending,in-suit,not-from-foundation",
  rule_canMoveToPile: "descending",

  canMoveToFoundation: function(card, stack) {
    // only a K->A run can be put on a foundation, and the foundation must be empty
    // canMoveCard() will ensure we have a run, so only need to check the ends
    return (card.isKing() && card.parentNode.lastChild.isAce() && !stack.hasChildNodes());
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < 10; i++)
      this.getHintsForCards(this.getLowestMoveableCard_Suit(this.stacks[i]));
  },
  getHintsForCards: function(card) {
    if(!card) return;
    for(var i = 0; i < 10; i++) {
      var stack = this.stacks[i];
      if(this.canMoveTo(card,stack) && stack.hasChildNodes()) this.addHint(card,stack);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    // find move to next card up of same suit
    var dest = this.searchAround(card,this.lastIsConsecutiveAndSameSuit);
    if(dest) return dest;
    // find move to next card up of any suit
    dest = this.searchAround(card,this.lastIsConsecutive);
    if(dest) return dest;
    // find moves to empty space
    dest = this.searchAround(card,this.stackIsEmpty);
    if(dest) return dest;
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay
  autoplayMove: function() {
    for(var i = 0; i < 10; i++) {
      var stack = this.stacks[i];
      var length = stack.childNodes.length;
      if(length < 13) continue;
      var card = stack.childNodes[length-13];
      if(!this.canMoveCard(card)) continue;
      for(var j = 0; j < 4; j++) {
        if(this.canMoveTo(card, this.foundations[j])) {
          this.moveTo(card, this.foundations[j]);
          return true;
        }
      }
    }
    return false;
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
    "move-to-foundation": 100,
    "move-between-piles":  -1
  }
}
