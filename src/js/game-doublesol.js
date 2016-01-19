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


// built A,A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundation = {
  __proto__: WorryingBackFoundation,

  mayAddCard: function(card) {
    if(!card.isLast) return false;
    if(!this.hasCards) return card.isAce && !card.twin.pile.isFoundation;
    const last = this.getCard(-1), prv = this.getCard(-2);
    return prv === last.twin ? card.down === last || card.down === prv : card.twin === last;
  }
};
