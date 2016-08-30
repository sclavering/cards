gGameClasses.towers = {
  __proto__: FreeCellGame,

  pile_details: () => ({
    piles: [10, TowersPile, 0, 5],
    foundations: [4, KlondikeFoundation, 0, 0],
    cells: [4, Cell, 0, [0, 1, 1, 0]],
  }),

  static_create_layout() {
    return new Layout("#<  c c c c    f f f f  >.#<   p p p p p p p p p p   >.");
  },

  best_destination_for: best_destination_for__nearest_legal_pile_or_cell,

  autoplay: function() {
    return this.autoplay_using_predicate(_ => true);
  },
};


class TowersPile extends _FreeCellPile {
  may_take_card(card) {
    return may_take_running_flush(card);
  }
  may_add_card(card) {
    if(!(this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13)) return false;
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= 1 + this.owning_game.empty_cell_count() ? true : 0;
  }
};
