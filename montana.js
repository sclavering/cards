Games.montana = {
  names: ["easy", "hard"],
  ids: ["montana", "montana-hard"]
};


var Montana = {
  __proto__: BaseCardGame,

  layout: "montana",

  redeals: 2,
  redealsRemaining: 2,

  init: function() {
    // the four nulls get shuffled with the cards, producing spaces in random places in the lay out
    var cs = this.cards = makeCardRuns(2, 13);
    cs[51] = cs[50] = cs[49] = cs[48] = null;

    this.twos = [cs[0], cs[12], cs[24], cs[36]];

    var ps = this.piles;
    for(var i = 0; i != 52; i++) ps[i].col = i % 13;

    var rs = this.rows = [ps.slice(0,13), ps.slice(13,26), ps.slice(26,39), ps.slice(39,52)];

    // leftp == left pile.  .left already exists (used for positioning in <stack>s)
    for(i = 0; i != ps.length - 1; i++) ps[i].rightp = ps[i+1], ps[i+1].leftp = ps[i];
    ps[0].leftp = ps[13].leftp = ps[26].leftp = ps[39].leftp = null;
    ps[12].rightp = ps[25].rightp = ps[38].rightp = ps[51].rightp = null;

    this.rowStarts = [ps[0], ps[13], ps[26], ps[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 52; i++) this.piles[i].dealTo(cards, 0, 1);
  },

  mayAddCardToPile: function(card) {
    var left = this.leftp;
    return !this.hasChildNodes() && (left ? left.hasChildNodes() && left.lastChild.up==card : card.number==2);
  },

  getHints: function() {
    for(var i = 0; i != 52; i++) {
      var pile = this.piles[i];
      if(pile.hasChildNodes()) continue;
      if(pile.leftp) {
        var card = pile.leftp.lastChild;
        if(card && card.up) this.addHint(card.up, pile);
      } else {
        for(var j = 0; j != 4; j++) {
          card = this.twos[j];
          if(card.parentNode.leftp) this.addHint(card, pile);
        }
      }
    }
  },

  getBestMoveForCard: function(card) {
    if(!card.down) return findEmpty(this.rowStarts);
    var pile = card.down.parentNode.rightp;
    return pile && !pile.hasChildNodes() ? pile : null;
  },

  redeal: function() {
    this.doAction(new MontanaRedealAction(this.isHardGame));
  },

  canRedeal: function() {
    return this.redealsRemaining != 0;
  },

  hasBeenWon: function() {
    for(var i = 0; i != 4; i++) {
      var pile = this.rowStarts[i], card = pile.lastChild, prv;
      if(!card || card.down) return false;
      while(pile.rightp) {
        pile = pile.rightp; prv = card; card = pile.lastChild;
        if(prv.up!=card) return false; // this works fine even when prv is a King
      }
    }
    return true;
  }
};


AllGames.montana = {
  __proto__: Montana,
  id: "montana",
  isHardGame: false
};


AllGames["montana-hard"] = {
  __proto__: Montana,
  id: "montana-hard",
  isHardGame: true
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
    for(var r = 0; r != 4; r++) {
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
    this.shuffled = cards.copy; // for redo()

    // deal.  in easy games the spaces go at the start of rows, in hard games they occur randomly
    var easy = hardGame ? 0 : 1;
    for(r = 0; r != 4; r++)
      for(c = 13 - map[r].length + easy; c != 13; c++)
        rows[r][c].dealTo(cards, 0, 1);
  },

  isPileComplete: function(pile, prv) {
    var card = pile.lastChild;
    if(!card) return (pile.col==12);
    if(pile.col==0) return (card.number==2);
    var prvcard = prv.lastChild;
    return card.suit==prvcard.suit && card.number==prvcard.upNumber;
  },

  undo: function() {
    var map = this.map, rows = Game.rows;
    Game.redealsRemaining++;

    // appendChild(node) will remove node first (per DOM spec), so we needn't bother clearing the layout
    // map[r][0..n] maps to row[r][(13-n)..13]
    for(var r = 0; r != 4; r++) {
      var len = map[r].length, co = 13 - len;
      for(var c = 0; c != len; c++) if(map[r][c]) rows[r][c+co].addCard(map[r][c]);
    }
  },

  redo: function() {
    Game.redealsRemaining--;
    var map = this.map, cards = this.shuffled.copy, rows = Game.rows;

    // in easy games the spaces go at the start of rows, in hard games they occur randomly
    var easy = this.isHardGame ? 0 : 1;
    for(var r = 0; r != 4; r++)
      for(var c = 13 - map[r].length + easy; c != 13; c++)
        rows[r][c].dealTo(cards, 0, 1);
  }
}
