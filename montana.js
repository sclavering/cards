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
}
MontanaRedealAction.prototype = {
  synchronous: true,

  // Pile-index -> Card maps from before and after the redeal. nulls for empty piles
  _pre_map: null,
  _post_map: null,

  perform: function() {
    var c, i, p, r, row;
    const rows = Game.rows;
    const easy = this.isHardGame ? 0 : 1;

    // store old card locations
    const map = [[p.firstCard for each(p in row)] for each(row in rows)];
    this._pre_map = [].concat.apply([], map);

    // decide which cards need to move
    function get_last_good_col(row) {
      const first_in_row = row[0].firstCard;
      const suit = first_in_row ? first_in_row.suit : null;
      for(var c = 0; row[c].hasCards && row[c].firstCard.isA(suit, c + 2);) ++c;
      return c;
    }
    const col_indexes = [get_last_good_col(row) for each(row in rows)];

    // decide post-redeal layout
    var to_shuffle = [].concat.apply([], [map[i].slice(col_indexes[i]) for(i in map)]);
    if(easy) to_shuffle = [c for each(c in to_shuffle) if(c)]; // filter nulls
    const shuffled = shuffle(to_shuffle);
    const newmaptails = [shuffled.splice(0, 13 - col_indexes[i] + easy) for(i in map)];
    if(easy) newmaptails.iter(function(tail) { tail.unshift(null); });
    const postmap = [map[i].slice(0, col_indexes[i]).concat(newmaptails[i]) for(i in map)];
    this._post_map = [].concat.apply([], postmap);

    this.redo();
  },

  _change: function(map) {
    const ps = Game.piles;
    for(var i = 0; i != 52; ++i) ps[i].removeCardsAfter(0);
    for(i = 0; i != 52; ++i) if(map[i]) ps[i].addCardsFromArray([map[i]]);
  },

  undo: function() {
    Game.redealsRemaining++;
    this._change(this._pre_map);
  },

  redo: function() {
    Game.redealsRemaining--;
    this._change(this._post_map);
  }
}
