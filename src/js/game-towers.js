gGameClasses.towers = {
  __proto__: FreeCellGame,

  pileDetails: () => [
    "p", 10, TowersPile, FanDownView, 0, 5,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, [0, 1, 1, 0],
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<   p p p p p p p p p p   >.',

  best_destination_for: best_destination_for__nearest_legal_pile_or_cell,

  autoplay: autoplay_default,

  autoplayable_predicate() { return _ => true; },
};


const TowersPile = {
  __proto__: _FreeCellPile,
  is_pile: true,
  may_take_card: mayTakeRunningFlush,
  may_add_card: function(card) {
    if(!(this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13)) return false;
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= 1 + this.owning_game.empty_cell_count() ? true : 0;
  }
};
