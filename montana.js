Games["montana"] = {
  __proto__: BaseCardGame,

  id: "montana",
  redeals: 2,


  init: function() {
    // label the piles for use by canMoveTo
    for(var i = 0; i < 52; i++) {
      this.stacks[i].row = Math.floor(i / 13);
      this.stacks[i].col = i % 13;
    }
  },


  ///////////////////////////////////////////////////////////
  //// start game
  deal: function() {
    var cards = this.getCardDecks(1);
    // replace the aces with nulls
    cards[0] = null; cards[13] = null; cards[26] = null; cards[39] = null;
    // shuffle and deal.  the nulls will result in empty spaces
    cards = this.shuffle(cards);
    for(var i = 0; i < 52; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
  },


  ///////////////////////////////////////////////////////////
  //// Moving
  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;
    if(pile.col==0) return (card.number()==2);

    // get the card in the pile to the left of the target pile
    var last = this.stacks[pile.row*13 + pile.col - 1].lastChild;
    return (last && card.isSameSuit(last) && card.isConsecutiveTo(last));
  },


  ///////////////////////////////////////////////////////////
  //// hint
  getHints: function() {
    for(var i = 0; i < 52; i++) {
      var card = this.stacks[i].firstChild;
      if(!card) continue;

      for(var j = 0; j < 52; j++)
        if(this.canMoveTo(card, this.stacks[j]))
          this.addHint(card, this.stacks[j]);
    }
  },


  ///////////////////////////////////////////////////////////
  //// smartmove
  getBestMoveForCard: function(card) {
    for(var i = 0; i < 52; i++)
      if(this.canMoveTo(card, this.stacks[i]))
        return this.stacks[i];
    return null;
  },


  ///////////////////////////////////////////////////////////
  //// redeal
  redeal: function() {
    this.redealsRemaining--;
    var cards = []; 
    var map = new Array(4);
    var r, s, end; // r=row, s=stacknum
    // remove cards
    for(r = 0, s = 0; r < 4; r++, s = 13 * r) {
      var c = 0;
      while(this.isPileComplete(s) && c<13) s++, c++;
      map[r] = new Array(13 - c);
      for(var j = 0; j < 13 - c; j++) {
        var card = this.stacks[s+j].firstChild;
        if(card) {
          card.parentNode.removeChild(card);
          cards.push(card);
        }
        map[r][j] = card;
      }
    }
    // shuffle
    cards = this.shuffle(cards);
    // deal
    for(r = 0, end = 13; r < 4; r++, end+=13) {
      var start = end - map[r].length + 1;
      for(s = start; s < end; s++) this.dealToStack(cards, this.stacks[s], 0, 1);
    }
    // track
    this.trackRedeal(map);
  },
  isPileComplete: function(num) {
    var pile = this.stacks[num];
    var card = pile.lastChild;
    if(!card) return (pile.col==12);
    if(pile.col==0) return (card.number()==2);
    var prvcard = this.stacks[num-1].lastChild;
    return (card.isSameSuit(prvcard) && card.isConsecutiveTo(prvcard));
  },

  undoRedeal: function(map) {
    this.redealsRemaining++;
    var r, j;
    // remove whatever's there now
    for(r = 0; r < 4; r++) {
      var start = 13 * r;
      for(j = 13 - map[r].length; j < 13; j++) {
        var stack = this.stacks[start+j];
        if(stack.hasChildNodes()) stack.removeChild(stack.lastChild);
      }
    }
    // restore layout from before the redeal
    for(r = 0; r < 4; r++) {
      var offset = 13 * (r + 1) - map[r].length;
      for(j = 0; j < map[r].length; j++) {
        if(map[r][j]) this.stacks[offset+j].addCard(map[r][j]);
      }
    }
  },


  ///////////////////////////////////////////////////////////
  //// winning, scoring, undo
  hasBeenWon: function() {
    var suit, prvcard;
    for(var i = 0; i < 52; i++) {
      var stack = this.stacks[i];
      var card = stack.firstChild;
      if((card && stack.col==12) || (!card && stack.col!=12)) return false;
      if(stack.col==0) {
        suit = card.suit;
        if(card.number()!=2) return false;
      } else {
        if(!card.isSameSuit(prvcard) || !card.isConsecutiveTo(prvcard)) return false;
      }
      prvcard = card;
    }
    return true;
  }
}
