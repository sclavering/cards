const GolfBase = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 7, GolfPile, FanDownView, 0, 5,
    "f", 1, UpDownMod13Foundation, CountedView, 0, 1,
  ],

  layoutTemplate: '#<   s  f   >.#<   p p p p p p p   >.',

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
  pileDetails: function() {
    const rv = GolfBase.pileDetails();
    rv[11] = 8; // 8 cards per pile
    return rv;
  },
};


const GolfPile = {
  __proto__: Pile,
  is_pile: true,
  // don't allow drag_drop because it's slower than just clicking the cards
  may_take_card: mayTakeSingleCard,
  may_add_card: _ => false,
};
