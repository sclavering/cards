var Maze = {
  shortname: "maze",
  
  // stuff the CardGame() constructor would initialise if we were using it
  stockCanTurnOver: false,
  acesHigh: false,
  usesMouseHandler2: false,
  
  init: function() {
    this.initStacks(54,0,0,false,false);
    this.dragDropTargets = this.stacks;
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
      if(card.number()==12 && right.isAce()) return true;
    }
    // if card is consecutive and same suit as card to the left
    // or if this is an ace and the card to the left any queen
    var left = (i==0) ? 53 : i-1; // -1%n==-1 in javascript
    left = this.stacks[left].firstChild;
    if(left) {
      if(card.isSameSuit(left) && card.isConsecutiveTo(left)) return true;
      if(card.isAce() && left.number()==12) return true;
    }
    return false;
  },
  
  
  
  ///////////////////////////////////////////////////////////
  //// hint
  


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
    // XXX IMPLEMENT ME!
    return false;
  }
}

Maze.__proto__ = CardGame.prototype;

Games["Maze"] = Maze;
