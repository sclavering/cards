var Regiment =
Games["regiment"] = {
  __proto__: BaseCardGame,

  id: "regiment",
  rule_canMoveCard: "last-on-pile",

  init: function() {
    for(var i = 0; i < 8; i++) {
      this.foundations[i].isAceFoundation = (i < 4);
      this.reserves[i].col = i;
      this.stacks[i].col = i;
      this.stacks[i+8].col = i;
    }
  },

  deal: function() {
    var cards = this.shuffleDecks(2);
    var i;
    for(i = 0; i < 16; i++) this.dealToStack(cards,this.stacks[i],0,1);
    for(i = 0; i < 8; i++) this.dealToStack(cards,this.reserves[i],10,1);
  },

  // this is likely to be the standard format for games with a set of both Ace and King foundations
  canMoveToFoundation: function(card, target) {
    var last = target.lastChild;
    if(target.isAceFoundation) {
      // can move an ace provided we haven't already got an Ace foundation for this suit,
      // or can build the foundation up in suit
      return (last ? (card.isConsecutiveTo(last) && card.isSameSuit(last))
                   : (card.isAce() && this.canMakeFoundation(true,card.suit())) );
    } else {
      // can start a king foundation for the suit if we don't have one already,
      // or can build the foundation down in suit
      return (last ? (last.isConsecutiveTo(card) && card.isSameSuit(last))
                   : (card.isKing() && this.canMakeFoundation(false,card.suit())) );
    }
  },
  canMakeFoundation: function(isAceFoundation,suit) {
    var base = isAceFoundation ? 0 : 4;
    for(var i = base; i < base+4; i++) {
      var last = this.foundations[i].lastChild;
      if(last && last.suit()==suit) return false;
    }
    return true;
  },

  canMoveToPile: function(card, target) {
    var source = card.getSource();
    var last = target.lastChild;
    if(last) {
      // can move from either tableau, reserve, or foundation piles to build on a tableau pile
      // build up or down within suit
      return (card.isSameSuit(last) && card.differsByOneTo(last));
    } else {
      // target is empty. may only move a card from a reserve pile, and only if it is the closest reserve.
      if(!source.isReserve) return false;
      // get num of both piles
      var targetcol = target.col;
      var sourcecol = source.col;
      // if same col then its ok
      if(sourcecol==targetcol) return true;
      // search alternately left and right ensuring all reserves
      var coldiff = Math.abs(targetcol - sourcecol);
      for(var i = 0; i < coldiff; i++) {
        if(targetcol+i<8 && this.reserves[targetcol+i].hasChildNodes()) return false;
        if(targetcol-i>=0 && this.reserves[targetcol-i].hasChildNodes()) return false;
      }
      // have checked all reserves as far out as source. so it is ok to move
      return true;
    }
  },

  getHints: function() {
    for(var i = 0; i < 8; i++) this.findHintsForCard(this.reserves[i].lastChild);
    for(i = 0; i < 16; i++) this.findHintsForCard(this.stacks[i].lastChild);
  },
  findHintsForCard: function(card) {
    if(!card) return;
    // look through the tableau for somewhere to put it
    for(var i = 0; i < 16; i++) {
      var stack = this.stacks[i];
      if(stack.hasChildNodes() && this.canMoveTo(card,stack)) this.addHint(card,stack);
    }
  },

  getBestMoveForCard: function(card) {
    for(var i = 0; i < 16; i++) {
      var stack = this.stacks[i];
      if(stack!=card.parentNode && this.canMoveTo(card,stack)) return stack;
    }
    return null;
  },

  autoplayMove: function() {
    // fill empty spaces, but only from reserves in same column
    for(var i = 0; i < 8; i++) {
      var last = this.reserves[i].lastChild;
      if(!last) continue;
      if(!this.stacks[i].hasChildNodes()) {
        this.moveTo(last, this.stacks[i]);
        return true;
      }
      if(!this.stacks[i+8].hasChildNodes()) {
        this.moveTo(last, this.stacks[i+8]);
        return true;
      }
    }
    return false;
  },

  hasBeenWon: function() {
    // game won if all 8 Foundations have 13 cards
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
};
