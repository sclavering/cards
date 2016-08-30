const GolfBase = {
  __proto__: Game,

  // Note: golf2 wraps this
  pile_details: () => ({
    stocks: [1, StockDealToFoundation, 0, 0],
    piles: [7, GolfPile, 0, 5],
    foundations: [1, UpDownMod13Foundation, 0, 1],
  }),

  static_create_layout() {
    return new Layout("#<   s  f   >.#<   p p p p p p p   >.");
  },

  helpId: "golf",

  best_action_for: function(cseq) {
    const f = this.foundation;
    return cseq.source.may_take_card(cseq.first) && f.may_add_card(cseq.first) ? new Move(cseq.first, f) : null;
  },

  is_won: function() {
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  },
};


gGameClasses.golf1 = {
  __proto__: GolfBase,
};


gGameClasses.golf2 = {
  __proto__: GolfBase,
  init_cards: () => make_cards(2),
  pile_details: function() {
    const rv = GolfBase.pile_details();
    rv.piles[3] = 8; // 8 cards per pile
    return rv;
  },
};


class GolfPile extends _Pile {
  may_take_card(card) {
    return card.isLast && card.faceUp;
  }
  may_add_card(card) {
    return false;
  }
};
