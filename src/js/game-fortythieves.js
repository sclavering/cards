gGameClasses.fortythieves = {
  __proto__: FreeCellGame,

  foundation_cluster_count: 4,

  pile_details: () => ({
    stocks: [1, StockDealToWaste, 0, 0],
    wastes: [1, Waste, 0, 1],
    piles: [10, FortyThievesPile, 0, 4],
    foundations: [8, KlondikeFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<   f f f f f f f f   ><   s [w]{colspan=13}>.#<   p p p p p p p p p p   >.", { s: StockView, w: FanRightView, p: FanDownView, f: View });
  },

  init_cards: () => make_cards(2),

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};


class FortyThievesPile extends _Pile {
  may_take_card(card) {
    return may_take_running_flush(card);
  }
  may_add_card(card) {
    if(this.hasCards && !is_next_in_suit(card, this.lastCard)) return false;
    // Check there are enough spaces to perform the move
    if(card.isLast) return true;
    let num_can_move = this.owning_game.empty_pile_count(this, card.pile);
    if(num_can_move) num_can_move = num_can_move * (num_can_move + 1) / 2;
    ++num_can_move;
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= num_can_move ? true : 0;
  }
};
