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
    // for redeal
    var cards = [];
    var runlengths = new Array(4);
    // so we can undo the redeal later
    var map = {};
    map.starts = new Array(4);
    map.cards = new Array(4);
    // remove cards
    for(var r = 0, i = 0; r < 4; r++, i = 13 * r) {
      var c = 0;
      while(this.isPileComplete(i) && c<13) i++, c++;
      map.starts[r] = runlengths[r] = c;
      map.cards[r] = new Array(13 - c);
      this.removeCards(i, 13 - c, cards, map.cards[r]);
    }
    // shuffle
    cards = this.shuffle(cards);
    // deal
    for(var row = 0; row < 4; row++) {
      var start = 13 * row + runlengths[row] + 1;
      var end = 13 * (row + 1);
      for(var j = start; j < end; j++) this.dealToStack(cards, this.stacks[j], 0, 1);
    }
    // track
    this.trackRedeal(map);
  },
  isPileComplete: function(pilenum) {
    var pile = this.stacks[pilenum];
    var card = pile.firstChild;
    if(!card) return (pile.col==12);
    if(pile.col==0) return (card.number()==2);
    var prvcard = this.stacks[pilenum-1].firstChild;
    return (card.isSameSuit(prvcard) && card.isConsecutiveTo(prvcard));
  },
  removeCards: function(start, num, cards, map) {
    for(var i = 0; i < num; i++) {
      var card = this.stacks[start+i].firstChild;
      if(card) {
        card.parentNode.removeChild(card);
        cards.push(card);
        map[i] = card;
      } else {
        map[i] = null;
      }
    }
  },

  undoRedeal: function(map) {
    this.redealsRemaining++;

    for(var i = 0; i < 4; i++) {
      var rowStart = 13*i;
      for(var j = map.starts[i]; j < 13; j++) {
        var stack = this.stacks[rowStart+j];
        // remove anything in the way
        while(stack.hasChildNodes()) stack.removeChild(stack.lastChild);
        // restore the old card, if any
        if(map.cards[i][j]) stack.addCard(map.cards[i][j]);
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
