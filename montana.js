Games.montana = {
  names: ["easy", "hard"],
  ids: ["montana", "montana-hard"]
};


var Montana =
AllGames.montana = {
  __proto__: BaseCardGame,

  id: "montana",
  layout: "montana",

  redeals: 2,
  redealsRemaining: 2,

  init: function() {
    // get cards and replace Aces with nulls (so spaces will appear randomly)
    var cards = this.cards = getDecks(1);
    cards[0] = cards[13] = cards[26] = cards[39] = null;

    var ps = this.piles;
    // label the piles for use by canMoveTo
    for(var i = 0; i != 52; i++) {
      ps[i].row = Math.floor(i / 13);
      ps[i].col = i % 13;
    }
    this.canMoveToPile = this.canMoveTo;

    var rs = this.rows = [ps.slice(0,13), ps.slice(13,26), ps.slice(26,39), ps.slice(39,52)];

    // leftp == left pile.  .left already exists (used for positioning in <stack>s)
    for(i = 0; i != ps.length - 1; i++) ps[i].rightp = ps[i+1], ps[i+1].leftp = ps[i];
    ps[0].leftp = ps[13].leftp = ps[26].leftp = ps[39].leftp = null;
    ps[12].rightp = ps[25].rightp = ps[38].rightp = ps[51].rightp = null;
  },

  deal: function(cards) {
    for(var i = 0; i != 52; i++) dealToPile(cards, this.piles[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;
    if(!pile.leftp) return card.number==2;
    var last = pile.leftp.lastChild;
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
    this.doAction(new MontanaRedealAction(false));
  },

  canRedeal: function() {
    return this.redealsRemaining != 0;
  },

  hasBeenWon: function() {
    for(var i = 0; i != 4; i++) {
      var r = this.rows[i];
      if(!r[0].hasChildNodes() || r[12].hasChildNodes()) return false;
      var suit = r[0].lastChild.suit;
      for(var j = 1; j != 12; j++) {
        var c = r[j].lastChild;
        if(!c || c.suit!=suit || c.number!=j+2) return false;
      }
    }
    return true;
  }
};


AllGames["montana-hard"] = {
  __proto__: Montana,

  id: "montana-hard",

  redeal: function() {
    this.doAction(new MontanaRedealAction(true));
  }
};


function MontanaRedealAction(hardGame) {
  this.isHardGame = hardGame;
}
MontanaRedealAction.prototype = {
  action: "redeal",
  synchronous: true,

  perform: function() {
    var hardGame = this.isHardGame;
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
    this.shuffled = cards.slice(0); // make copy for redo()

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
  },

  redo: function() {
    Game.redealsRemaining--;
    var map = this.map, cards = this.shuffled.slice(0), rows = Game.rows;

    // deal.  in easy games the spaces go at the start of rows, in hard games they occur randomly
    var easy = this.isHardGame ? 0 : 1;
    for(var r in rows)
      for(var c = 13 - map[r].length + easy; c != 13; c++)
        dealToPile(cards, rows[r][c], 0, 1);
  }
}
