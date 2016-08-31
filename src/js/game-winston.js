gGameClasses.winston = {
  __proto__: Game,

  pile_details: () => ({
    stocks: [1, WinstonStock, 0, 0],
    reserves: [1, Reserve, 0, 6],
    piles: [10, WinstonPile, [0, 1, 2, 3, 4, 4, 3, 2, 1, 0], 1],
    foundations: [8, KlondikeFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<   s r   f f f f f f f f   >.#<   p p p p p p p p p p   >.", { s: StockView, r: WinstonReserveView, p: FanDownView, f: View });
  },

  init_cards: () => make_cards(2),

  // xxx implement .is_shuffle_impossible, to detect games where the reserve starts with e.g. "4H ... 8H ... 8H ..." (it's impossible to get past two identical cards if a lower one from the suit is beneath them).  Also "... AH AH ... 8H ..."
  // xxx "4S _ 6S 10S 9S _" is almost-impossible (requires moving things back from the foundations)

  foundation_cluster_count: 4,

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two_for_two_decks,
};


class WinstonStock extends _Stock {
  deal() {
    const pred = p => p.hasCards ? !(p.cards[0].faceUp && p.cards[0].number === 13) : true;
    return this.hasCards ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles.filter(pred)) : null;
  }
};


class WinstonPile extends _Pile {
  may_take_card(card) {
    return may_take_descending_alt_colour(card);
  }
  may_add_card(card) {
    if(card.pile.is_reserve) return false;
    return this.hasCards ? is_next_and_alt_colour(card, this.lastCard) : true;
  }
};


class WinstonReserveView extends _FixedFanView {
  constructor() {
    super({ capacity: 6, horizontal: true });
  }
};
