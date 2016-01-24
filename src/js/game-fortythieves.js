gGameClasses.fortythieves = {
  __proto__: FreeCellGame,

  foundation_cluster_count: 4,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, FanRightView, 0, 1,
    "p", 10, FortyThievesPile, FanDownView, 0, 4,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   f f f f f f f f   ><   s [w]{colspan=13}>.#<   p p p p p p p p p p   >.',

  init_cards: () => make_cards(2),

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};


const FortyThievesPile = {
  __proto__: Pile,
  isPile: true,

  mayTakeCard: mayTakeRunningFlush,

  mayAddCard: function(card) {
    if(this.hasCards && !is_next_in_suit(card, this.lastCard)) return false;
    // Check there are enough spaces to perform the move
    if(card.isLast) return true;
    let num_can_move = gCurrentGame.countEmptyPiles(this, card.pile);
    if(num_can_move) num_can_move = num_can_move * (num_can_move + 1) / 2;
    ++num_can_move;
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= num_can_move ? true : 0;
  }
};
