const GolfBase = {
  __proto__: Game,

  pileDetails: [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 7, GolfPile, FanDownView, 0, 5,
    "f", 1, GolfFoundation, CountedView, 0, 1,
  ],

  layoutTemplate: '#<   s  f   >.#<   p p p p p p p   >.',

  helpId: "golf",

  getBestActionFor: function(card) {
    const f = this.foundation;
    return card.pile.mayTakeCard(card) && f.mayAddCard(card) ? new Move(card, f) : null;
  },

  is_won: function() {
    for each(let p in this.piles) if(p.cards.length) return false;
    return true;
  },
};


gGameClasses.golf1 = {
  __proto__: GolfBase,
  allcards: [1, , , true]
};


const Golf2 = gGameClasses.golf2 = {
  __proto__: GolfBase,
  allcards: [2, , , true]
};
// tweak to get 8 cards dealt per pile
Golf2.pileDetails = Golf2.pileDetails.slice();
Golf2.pileDetails[11] = 8;
