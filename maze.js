Games.maze = true;

AllGames.maze = {
  __proto__: BaseCardGame,

  id: "maze",

  init: function() {
    // one deck with 6 nulls instead of the 4 kings. nulls lead to empty spaces
    var cards = this.cards = getDecks(1);
    cards[12] = cards[25] = cards[38] = cards[51] = cards[52] = cards[53] = null;
    // label the piles for use by canMoveTo
    for(var i = 0; i != 54; i++) this.piles[i].pileNumber = i;
    this.canMoveToPile = this.canMoveTo;
  },

  deal: function(cards) {
    for(var i in this.piles) dealToPile(cards, this.piles[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;

    var i = pile.pileNumber;
    // if pile to right contains consecutive card of same suit
    // or if card to right is any ace if this is a queen (note: this is a relaxation of the PySol rules)
    var right = this.piles[(i+1) % 54].firstChild;
    if(right) {
      if(right.isSameSuit(card) && right.isConsecutiveTo(card)) return true;
      if(card.isQueen && right.isAce) return true;
    }
    // if card is consecutive and same suit as card to the left
    // or if this is an ace and the card to the left any queen
    var left = (i==0) ? 53 : i-1; // -1%n==-1 in javascript
    left = this.piles[left].firstChild;
    if(left) {
      if(card.isSameSuit(left) && card.isConsecutiveTo(left)) return true;
      if(card.isAce && left.isQueen) return true;
    }
    return false;
  },

  getHints: function() {
    for(var i = 0; i != 54; i++) {
      var card = this.piles[i].firstChild;
      if(!card) continue;

      var piles = filter(this.piles, testCanMoveToPile(card));
      if(piles.length) this.addHints(card, piles);
    }
  },

  getBestMoveForCard: function(card) {
    return (card.isQueen && searchPiles(this.piles, this.queenTest(card)))
        || (card.isAce && searchPiles(this.piles, this.aceTest(card)))
        || searchPiles(this.piles, testCanMoveToPile(card));
  },
  aceTest: function(card) {
    return function(pile) {
      if(pile.hasChildNodes()) return false;
      var r = pile.pileNumber+1;
      r = Game.piles[r==54 ? 0 : r].lastChild;
      return r && r.isSameSuit(card) && r.number==2;
    };
  },
  queenTest: function(card) {
    return function(pile) {
      if(pile.hasChildNodes()) return false;
      var l = pile.pileNumber-1;
      l = Game.piles[l==-1 ? 53 : l].lastChild;
      return l && l.isSameSuit(card) && l.number==11;
    };
  },

  // Autoplay not used

  hasBeenWon: function() {
    for(var i = 0; i != 54; i++) {
      var left = this.piles[i].firstChild;
      var right = this.piles[(i+1) % 54].firstChild;
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
