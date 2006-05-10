const Montana = {
  __proto__: BaseCardGame,

  helpId: "montana",
  layout: MontanaLayout,
  pilesToBuild: "52p",
  pileTypes: { p: MontanaPile },
  dealTemplate: "P 0,1",

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

  getHints: function() {
    for(var i = 0; i != 52; i++) {
      var pile = this.piles[i];
      if(pile.hasCards) continue;
      if(pile.leftp) {
        var card = pile.leftp.lastCard;
        if(card && card.up) this.addHint(card.up, pile);
      } else {
        for(var j = 0; j != 4; j++) {
          card = this.twos[j];
          if(card.pile.leftp) this.addHint(card, pile);
        }
      }
    }
  },

  getBestDestinationFor: function(card) {
    if(!card.down) return findEmpty(this.rowStarts);
    var pile = card.down.pile.rightp;
    return pile && !pile.hasCards ? pile : null;
  },

  redeal: function() {
    doo(new MontanaRedealAction(this.isHardGame));
  },

  get canRedeal() {
    return this.redealsRemaining != 0;
  },

  isWon: function() {
    for(var i = 0; i != 4; i++) {
      var pile = this.rowStarts[i], card = pile.lastCard, prv;
      if(!card || card.down) return false;
      while(pile.rightp) {
        pile = pile.rightp; prv = card; card = pile.lastCard;
        if(prv.up!=card) return false; // this works fine even when prv is a King
      }
    }
    return true;
  }
};


Games.montanaEasier = {
  __proto__: Montana,
  isHardGame: false
};


Games.montana = {
  __proto__: Montana,
  isHardGame: true
};


function MontanaRedealAction(hardGame) {
  this.isHardGame = hardGame;
  this.map = [[],[],[],[]];
}
MontanaRedealAction.prototype = {
  synchronous: true,

  perform: function() {
    const hard = this.isHardGame, map = this.map, rows = Game.rows, cards = [];

    // remove cards
    for(var r = 0; r != 4; r++) {
      var row = rows[r];
      var suit = null;

      // set c to the col index at which the first out-of-place card appears, or 12 if there aren't any
      for(var c = 0; c != 12; ++c) {
        var card = row[c].firstCard;
        if(!card) break;
        if(!suit) suit = card.suit;
        if(suit != card.suit || card.number != c+2) break;
      }

      // record where cards were
      for(; c != 13; c++) {
        card = row[c].lastCard;
        map[r].push(card);
        // in hard games we want the null's in the array too (so that spaces are placed randomly)
        if(card || hard) cards.push(card);
      }
    }

    // shuffle and deal
    this.shuffled = shuffle(cards);
    this.redo();
  },

  undo: function() {
    const map = this.map, rows = Game.rows;
    Game.redealsRemaining++;

    // addCards() will remove node first (inherited from appendChild), so we needn't do so
    // map[r][0..n] maps to row[r][(13-n)..13]
    for(var r = 0; r != 4; r++) {
      var len = map[r].length, co = 13 - len;
      for(var c = 0; c != len; c++) if(map[r][c]) rows[r][c+co].addCards(map[r][c]);
    }
  },

  redo: function() {
    Game.redealsRemaining--;
    const map = this.map, cards = this.shuffled.slice(0), rows = Game.rows;

    // in easy games the spaces go at the start of rows, in hard games they occur randomly
    var easy = this.isHardGame ? 0 : 1;
    for(var r = 0; r != 4; r++)
      for(var c = 13 - map[r].length + easy; c != 13; c++)
        rows[r][c].dealTo(cards, 0, 1);
  }
}
