Games["gypsy"] = {
  __proto__: BaseCardGame,

  id: "gypsy",
  difficultyLevels: ["easy-2suits","hard-4suits"],
  rule_dealFromStock: "to-stacks",


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    // 1==easy, 2==hard
    var cards = this.difficultyLevel==2 ? this.shuffleDecks(2) : this.shuffleSuits(4,4,0,0);
    for(var i = 0; i < 8; i++) this.dealToStack(cards,this.stacks[i],2,1);
    this.dealToStack(cards,this.stock,cards.length,0);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  rule_canMoveCard: "descending,alt-colours",
  rule_canMoveToPile: "descending,alt-colours",


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < 8; i++) {
      var card = this.getLowestMoveableCard_AltColours(this.stacks[i]);
      this.getHintsForCard(card);
    }
  },
  getHintsForCard: function(card) {
    if(!card) return;
    var i, stack;
    for(i = 0; i < 8; i++) {
      stack = this.stacks[i];
      if(stack.hasChildNodes() && this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
    for(i = 0; i < 8; i++) {
      stack = this.stacks[i];
      if(!stack.hasChildNodes() && this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smart move
  getBestMoveForCard: function(card) {
    var piles = this.getPilesRound(card.parentNode);
    var i, pile;
    // find a move onto another nonempty pile
    for(i = 0; i < piles.length; i++) {
      pile = piles[i];
      if(pile.hasChildNodes() && this.canMoveTo(card, pile)) return pile;
    }
    // find a move to an empty pile
    for(i = 0; i < piles.length; i++) {
      pile = piles[i];
      if(!pile.hasChildNodes() && this.canMoveTo(card, pile)) return pile;
    }
    // move to a foundation
    for(i = 0; i < 8; i++) {
      pile = this.foundations[i];
      if(pile!=card.parentNode && this.canMoveToFoundation(card,pile)) return pile;
    }
    return null;
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


  ///////////////////////////////////////////////////////////
  //// Autoplay
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


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
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
