Games["montana"] = {
  __proto__: BaseCardGame,

  id: "montana",
  difficultyLevels: ["easy","hard"],

  redeals: 2,
  redealsRemaining: 2,

  init: function() {
    // label the piles for use by canMoveTo
    for(var i = 0; i < 52; i++) {
      this.stacks[i].row = Math.floor(i / 13);
      this.stacks[i].col = i % 13;
    }
    this.canMoveToPile = this.canMoveTo;
  },

  deal: function() {
    var cards = this.getCardDecks(1);
    // replace the aces with nulls
    cards[0] = null; cards[13] = null; cards[26] = null; cards[39] = null;
    // shuffle and deal.  the nulls will result in empty spaces
    cards = this.shuffle(cards);
    for(var i = 0; i < 52; i++) this.dealToStack(cards, this.stacks[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;
    if(pile.col==0) return (card.number()==2);

    // get the card in the pile to the left of the target pile
    var last = this.stacks[pile.row*13 + pile.col - 1].lastChild;
    return (last && card.isSameSuit(last) && card.isConsecutiveTo(last));
  },

  getHints: function() {
    for(var i = 0; i < 52; i++) {
      var card = this.stacks[i].firstChild;
      if(!card) continue;

      var piles = filter(this.stacks, testCanMoveToPile(card));
      if(piles.length) this.addHints(card, piles);
    }
  },

  getBestMoveForCard: function(card) {
  	return searchPiles(this.stacks, testCanMoveToPile(card));
  },

  redeal: function() {
    this.doAction(new MontanaRedealAction());
  },

  canRedeal: function() {
    return this.redealsRemaining != 0;
  },

  hasBeenWon: function() {
    var suit, prvcard;
    for(var i = 0; i < 52; i++) {
      var stack = this.stacks[i];
      var card = stack.firstChild;
      if(stack.col==12) {
        if(card) return false;
        continue;
      }
      if(!card) return false;
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



function MontanaRedealAction() {}
MontanaRedealAction.prototype = {
  action: "redeal",

  perform: function() {
    var hardGame = (Game.difficultyLevel==2);
    Game.redealsRemaining--;
    var cards = [];
    var map = new Array(4);
    var r, s, end; // r=row, s=stacknum
    // remove cards
    for(r = 0, s = 0; r < 4; r++, s = 13 * r) {
      var c = 0;
      while(this.isPileComplete(s) && c<13) s++, c++;
      map[r] = new Array(13 - c);
      for(var j = 0; j < 13 - c; j++) {
        var card = Game.stacks[s+j].firstChild;
        if(card) card.parentNode.removeChild(card);
        // in hard games we want the null's in the array too
        if(card || hardGame) cards.push(card);
        map[r][j] = card;
      }
    }
    // shuffle
    cards = Game.shuffle(cards);
    // deal
    // in easy games the spaces go at the start of rows. in hard games they occur randomly
    var easyGame = hardGame ? 0 : 1;
    for(r = 0, end = 13; r < 4; r++, end+=13) {
      var start = end - map[r].length + easyGame;
      // dealToStack does the right thing when there are nulls in |cards|
      for(s = start; s < end; s++) Game.dealToStack(cards, Game.stacks[s], 0, 1);
    }
    // track
    this.map = map;
  },
  isPileComplete: function(num) {
    var pile = Game.stacks[num];
    var card = pile.lastChild;
    if(!card) return (pile.col==12);
    if(pile.col==0) return (card.number()==2);
    var prvcard = Game.stacks[num-1].lastChild;
    return (card.isSameSuit(prvcard) && card.isConsecutiveTo(prvcard));
  },

  undo: function() {
    var map = this.map;
    Game.redealsRemaining++;
    var r, j;
    // remove whatever's there now
    for(r = 0; r < 4; r++) {
      var start = 13 * r;
      for(j = 13 - map[r].length; j < 13; j++) {
        var stack = Game.stacks[start+j];
        if(stack.hasChildNodes()) stack.removeChild(stack.lastChild);
      }
    }
    // restore layout from before the redeal
    for(r = 0; r < 4; r++) {
      var offset = 13 * (r + 1) - map[r].length;
      for(j = 0; j < map[r].length; j++) {
        if(map[r][j]) Game.stacks[offset+j].addCard(map[r][j]);
      }
    }
  }
}

