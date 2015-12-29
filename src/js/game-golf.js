const GolfBase = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 7, GolfPile, FanDownView, 0, 5,
    "f", 1, GolfFoundation, CountedView, 0, 1,
  ],

  layoutTemplate: '#<   s  f   >.#<   p p p p p p p   >.',

  helpId: "golf",

  best_action_for: function(card) {
    const f = this.foundation;
    return card.mayTake && f.mayAddCard(card) ? new Move(card, f) : null;
  },

  is_won: function() {
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  },
};


gGameClasses.golf1 = {
  __proto__: GolfBase,
  required_cards: [1, , , true]
};


gGameClasses.golf2 = {
  __proto__: GolfBase,
  required_cards: [2, , , true],
  pileDetails: function() {
    const rv = GolfBase.pileDetails();
    rv[11] = 8; // 8 cards per pile
    return rv;
  },
};


const GolfPile = {
  __proto__: Pile,
  isPile: true,
  // don't allow drag_drop because it's slower than just clicking the cards
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: no
};
