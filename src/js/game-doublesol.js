// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

gGameClasses.doublesol = {
  __proto__: Game,

  pile_details: () => ({
    stocks: [1, StockDealToWasteOrRefill, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [10, KlondikePile, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1],
    foundations: [4, DoubleSolFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<   s w   f f f f   >.#<   p p p p p p p p p p   >.", { f: DoubleSolFoundationView });
  },

  init_cards: () => make_cards(2),

  best_destination_for: best_destination_for__nearest_legal_pile,

  autoplay: function() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(this.foundations));
  },
};


// Built A,A,2,2,3,3,...,Q,Q,K,K
class DoubleSolFoundation extends _Foundation {
  may_take_card(card) {
    return card.isLast;
  }
  may_add_card(card) {
    if(!card.isLast) return false;
    if(!this.hasCards) return card.number === 1 && !includes_pile_starting_with_suit(this.following(), card.suit);
    const expected_number = Math.floor(this.cards.length / 2) + 1;
    return card.number === expected_number && card.suit === this.cards[0].suit;
  }
};
