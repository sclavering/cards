Games["montana"] = {
  __proto__: BaseCardGame,

  id: "montana",
  difficultyLevels: ["easy","hard"],

  redeals: 2,
  redealsRemaining: 2,

  init: function() {
    // get cards and replace Aces with nulls (so spaces will appear randomly)
    var cards = this.cards = getDecks(1);
    cards[0] = cards[13] = cards[26] = cards[39] = null;
    // label the piles for use by canMoveTo
    for(var i = 0; i != 52; i++) {
      this.piles[i].row = Math.floor(i / 13);
      this.piles[i].col = i % 13;
    }
    this.canMoveToPile = this.canMoveTo;

    var p = this.piles;
    this.rows = [p.slice(0,13), p.slice(13,26), p.slice(26,39), p.slice(39,52)];
  },

  deal: function() {
    var cards = shuffle(this.cards);
    for(var i = 0; i != 52; i++) dealToPile(cards, this.piles[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;
    if(pile.col==0) return (card.number==2);

    // get the card in the pile to the left of the target pile
    var last = this.piles[pile.row*13 + pile.col - 1].lastChild;
    return (last && card.isSameSuit(last) && card.isConsecutiveTo(last));
  },

  getHints: function() {
    for(var i = 0; i != 52; i++) {
      var card = this.piles[i].firstChild;
      if(!card) continue;

      var piles = filter(this.piles, testCanMoveToPile(card));
      if(piles.length) this.addHints(card, piles);
    }
  },

  getBestMoveForCard: function(card) {
    return searchPiles(this.piles, testCanMoveToPile(card));
  },

  redeal: function() {
    this.doAction(new MontanaRedealAction());
  },

  canRedeal: function() {
    return this.redealsRemaining != 0;
  },

  hasBeenWon: function() {
    var suit, prvcard;
    for(var i = 0; i != 52; i++) {
      var pile = this.piles[i];
      var card = pile.firstChild;
      if(pile.col==12) {
        if(card) return false;
        continue;
      }
      if(!card) return false;
      if(pile.col==0) {
        suit = card.suit;
        if(card.number!=2) return false;
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
    var map = this.map = [[],[],[],[]];
    var rows = Game.rows;

    // remove cards
    for(var r in rows) {
      var row = rows[r];
      var c = 0, pile = row[0], prv = null;
      while(this.isPileComplete(pile, prv)) c++, prv = pile, pile = row[c];

      for(; c != 13; c++) {
        var card = row[c].lastChild;
        if(card) card.parentNode.removeChild(card);
        // in hard games we want the null's in the array too
        if(card || hardGame) cards.push(card);
        map[r].push(card);
      }
    }

    // shuffle
    cards = shuffle(cards);

    // deal.  in easy games the spaces go at the start of rows, in hard games they occur randomly
    var easy = hardGame ? 0 : 1;
    for(r in rows)
      for(c = 13 - map[r].length + easy; c != 13; c++)
        dealToPile(cards, rows[r][c], 0, 1);
  },

  isPileComplete: function(pile, prv) {
    var card = pile.lastChild;
    if(!card) return (pile.col==12);
    if(pile.col==0) return (card.number==2);
    var prvcard = prv.lastChild;
    return (card.isSameSuit(prvcard) && card.isConsecutiveTo(prvcard));
  },

  undo: function() {
    var map = this.map, rows = Game.rows;
    Game.redealsRemaining++;

    // the DOM spec. says that appendChild will remove the new child from its current parent if necessary,
    // so we needn't bother clearing the current layout before starting to restore the old.
    for(var r in rows) {
      var co = 13 - map[r].length; // map[r][0..n] maps to row[r][(13-n)..13]
      for(var c = 0; c != map[r].length; c++)
        if(map[r][c]) rows[r][c+co].addCard(map[r][c]);
    }
  }
}

