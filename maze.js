Games["maze"] = {
  __proto__: BaseCardGame,

  id: "maze",

  init: function() {
    // label the piles for use by canMoveTo
    for(var i = 0; i < 54; i++) this.stacks[i].pileNumber = i;
    this.canMoveToPile = this.canMoveTo;
  },

  deal: function() {
    var cards = getDecks(1);
    // remove kings and add 2 nulls
    cards[12] = null; cards[25] = null; cards[38] = null; cards[51] = null;
    cards[52] = null; cards[53] = null;
    // shuffle and deal.  the nulls will result in empty spaces
    cards = shuffle(cards);
    for(var i = 0; i < 54; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;

    var i = pile.pileNumber;
    // if pile to right contains consecutive card of same suit
    // or if card to right is any ace if this is a queen (note: this is a relaxation of the PySol rules)
    var right = this.stacks[(i+1) % 54].firstChild;
    if(right) {
      if(right.isSameSuit(card) && right.isConsecutiveTo(card)) return true;
      if(card.isQueen && right.isAce) return true;
    }
    // if card is consecutive and same suit as card to the left
    // or if this is an ace and the card to the left any queen
    var left = (i==0) ? 53 : i-1; // -1%n==-1 in javascript
    left = this.stacks[left].firstChild;
    if(left) {
      if(card.isSameSuit(left) && card.isConsecutiveTo(left)) return true;
      if(card.isAce && left.isQueen) return true;
    }
    return false;
  },

  getHints: function() {
    for(var i = 0; i < 54; i++) {
      var card = this.stacks[i].firstChild;
      if(!card) continue;

      var piles = filter(this.stacks, testCanMoveToPile(card));
      if(piles.length) this.addHints(card, piles);
    }
  },

  getBestMoveForCard: function(card) {
  	return (card.isQueen && searchPiles(this.stacks, this.queenTest(card)))
  	    || (card.isAce && searchPiles(this.stacks, this.aceTest(card)))
  	    || searchPiles(this.stacks, testCanMoveToPile(card));
  },
  aceTest: function(card) {
    return function(pile) {
      if(pile.hasChildNodes()) return false;
      var r = pile.pileNumber+1;
      r = Game.stacks[r==54 ? 0 : r].lastChild;
      return r && r.isSameSuit(card) && r.number==2;
    };
  },
  queenTest: function(card) {
    return function(pile) {
      if(pile.hasChildNodes()) return false;
      var l = pile.pileNumber-1;
      l = Game.stacks[l==-1 ? 53 : l].lastChild;
      return l && l.isSameSuit(card) && l.number==11;
    };
  },

  // Autoplay not used

  hasBeenWon: function() {
    for(var i = 0; i < 54; i++) {
      var left = this.stacks[i].firstChild;
      var right = this.stacks[(i+1) % 54].firstChild;
      // the pair must be consecutive and same suit except for queens and aces,
      // which can sit next to empty spaces, or next to one another ignoring suit
      if(right) {
        if(right.isAce) {
          if(left && !left.isQueen) return false
        } else {
          if(!(left && right.isSameSuit(left) && right.isConsecutiveTo(left))) return false;
        }
      } else {
        if(left && !left.isQueen) return false;
      }
    }
    return true;
  }
}
