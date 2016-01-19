// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

gGameClasses.doublesol = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, KlondikePile, FanDownView, range(10), repeat(1, 10),
    "f", 4, DoubleSolFoundation, DoubleSolFoundationView, 0, 0,
  ],

  layoutTemplate: '#<   s w   f f f f   >.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  required_cards: [2],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};


// Built A,A,2,2,3,3,...,Q,Q,K,K
const DoubleSolFoundation = {
  __proto__: WorryingBackFoundation,

  mayAddCard: function(card) {
    if(!card.isLast) return false;
    if(!this.hasCards) return card.isAce && !this.following().some(f => f.hasCards && f.cards[0].suit === card.suit);
    const expected_number = Math.floor(this.cards.length / 2) + 1;
    return card.number === expected_number && card.suit === this.cards[0].suit;
  },
};
