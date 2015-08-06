gGameClasses.montana = {
  __proto__: Game,

  pileDetails: () => [
    "p", 52, MontanaPile, View, 0, 1,
  ],

  layoutTemplate: '#<  p p p p p p p p p p p p p  ><  p p p p p p p p p p p p p  ><  p p p p p p p p p p p p p  ><  p p p p p p p p p p p p p  >.',

  allcards: null,
  init: function() {
    const cs = this.allcards = makeCards(1, null, range2(2, 14)); // no Aces
    cs[51] = cs[50] = cs[49] = cs[48] = null; // spaces instead

    this.twos = [cs[0], cs[12], cs[24], cs[36]];

    var ps = this.piles;
    for(let i = 0; i !== 52; i++) ps[i].col = i % 13;

    var rs = this.rows = [ps.slice(0,13), ps.slice(13,26), ps.slice(26,39), ps.slice(39,52)];

    // leftp === left pile.  .left already exists (used for positioning in <stack>s)
    for(let i = 0; i !== ps.length - 1; i++) ps[i].rightp = ps[i + 1], ps[i + 1].leftp = ps[i];
    ps[0].leftp = ps[13].leftp = ps[26].leftp = ps[39].leftp = null;
    ps[12].rightp = ps[25].rightp = ps[38].rightp = ps[51].rightp = null;

    this.rowStarts = [ps[0], ps[13], ps[26], ps[39]];
  },

  deal: function(cards) {
    this._deal_cards_with_nulls_for_spaces(cards);
  },

  best_destination_for: function(card) {
    if(!card.down) return findEmpty(this.rowStarts);
    var pile = card.down.pile.rightp;
    return pile && !pile.hasCards ? pile : null;
  },

  redeal: function() {
    doo(new MontanaRedealAction());
  },

  is_won: function() {
    for(var i = 0; i !== 4; i++) {
      var pile = this.rowStarts[i], card = pile.lastCard, prv;
      if(!card || card.down) return false;
      while(pile.rightp) {
        pile = pile.rightp; prv = card; card = pile.lastCard;
        if(prv.up !== card) return false; // this works fine even when prv is a King
      }
    }
    return true;
  }
};


function MontanaRedealAction() {}
MontanaRedealAction.prototype = {
  synchronous: true,

  // Pile-index -> Card maps from before and after the redeal. nulls for empty piles
  _pre_map: null,
  _post_map: null,

  perform: function() {
    var c, i, p, r, row;
    const rows = gCurrentGame.rows;

    // store old card locations
    const map = [for(row of rows) [for(p of row) p.firstCard]];
    this._pre_map = [].concat.apply([], map);

    // decide which cards need to move
    function get_last_good_col(row) {
      const first_in_row = row[0].firstCard;
      const suit = first_in_row ? first_in_row.suit : null;
      for(var c = 0; row[c].hasCards && row[c].firstCard.isA(suit, c + 2);) ++c;
      return c;
    }
    const col_indexes = [for(row of rows) get_last_good_col(row)];

    // decide post-redeal layout
    var to_shuffle = [].concat.apply([], [map[i].slice(col_indexes[i]) for(i in map)]);
    const shuffled = shuffle(to_shuffle);
    const newmaptails = [shuffled.splice(0, 13 - col_indexes[i]) for(i in map)];
    const postmap = [map[i].slice(0, col_indexes[i]).concat(newmaptails[i]) for(i in map)];
    this._post_map = [].concat.apply([], postmap);

    this.redo();
  },

  _change: function(map) {
    const ps = gCurrentGame.piles;
    for(let p of ps) p.removeCardsAfter(0);
    for(let i = 0; i !== 52; ++i) if(map[i]) ps[i].addCardsFromArray([map[i]]);
  },

  undo: function() {
    this._change(this._pre_map);
  },

  redo: function() {
    this._change(this._post_map);
  }
};


const MontanaPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    const lp = this.leftp;
    return !this.hasCards && (card.number === 2 ? !lp : card.down.pile === lp);
  }
};
