var Maze = {
  __proto__: BaseCardGame,
  
  shortname: "maze",
  
  init: function() {
    // label the piles for use by canMoveTo
    for(var i = 0; i < 54; i++) this.stacks[i].pileNumber = i;
  },


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.getCardDecks(1);
    // remove kings and add 2 nulls
    cards[12] = null; cards[25] = null; cards[38] = null; cards[51] = null;
    cards[52] = null; cards[53] = null;
    // shuffle and deal.  the nulls will result in empty spaces
    cards = this.shuffle(cards);
    for(var i = 0; i < 54; i++) {
      if(!cards[i]) continue;
      this.stacks[i].appendChild(cards[i]);
      cards[i].setFaceUp();
    }
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;

    var i = pile.pileNumber;
    // if pile to right contains consecutive card of same suit
    // or if card to right is any ace if this is a queen (note: this is a relaxation of the PySol rules)
    var right = this.stacks[(i+1) % 54].firstChild;
    if(right) {
      if(right.isSameSuit(card) && right.isConsecutiveTo(card)) return true;
      if(card.isQueen() && right.isAce()) return true;
    }
    // if card is consecutive and same suit as card to the left
    // or if this is an ace and the card to the left any queen
    var left = (i==0) ? 53 : i-1; // -1%n==-1 in javascript
    left = this.stacks[left].firstChild;
    if(left) {
      if(card.isSameSuit(left) && card.isConsecutiveTo(left)) return true;
      if(card.isAce() && left.isQueen()) return true;
    }
    return false;
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < 54; i++) {
      var card = this.stacks[i].firstChild;
      if(!card) continue;

      for(var j = 0; j < 54; j++)
        if(this.canMoveTo(card, this.stacks[j]))
          this.addHint(card, this.stacks[j]);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    for(var i = 0; i < 54; i++)
      if(this.canMoveTo(card, this.stacks[i]))
        return this.stacks[i];
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// Autoplay -- NONE


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    for(var i = 0; i < 54; i++) {
      var left = this.stacks[i].firstChild;
      var right = this.stacks[(i+1) % 54].firstChild;
      // the pair must be consecutive and same suit except for queens and aces,
      // which can sit next to empty spaces, or next to one another ignoring suit
      if(right) {
        if(right.isAce()) {
          if(left && !left.isQueen()) return false
        } else {
          if(!(left && right.isSameSuit(left) && right.isConsecutiveTo(left))) return false;
        }
      } else {
        if(left && !left.isQueen()) return false;
      }
    }
    return true;
  }
}

Games["Maze"] = Maze;
