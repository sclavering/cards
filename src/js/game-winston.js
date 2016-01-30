gGameClasses.winston = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, WinstonStock, StockView, 0, 0,
    "r", 1, Reserve, WinstonReserveView, 0, 6,
    "p", 10, WinstonPile, FanDownView, [0, 1, 2, 3, 4, 4, 3, 2, 1, 0], 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   s r   f f f f f f f f   >.#<   p p p p p p p p p p   >.',

  init_cards: () => make_cards(2),

  // xxx implement .is_shuffle_impossible, to detect games where the reserve starts with e.g. "4H ... 8H ... 8H ..." (it's impossible to get past two identical cards if a lower one from the suit is beneath them).  Also "... AH AH ... 8H ..."
  // xxx "4S _ 6S 10S 9S _" is almost-impossible (requires moving things back from the foundations)

  foundation_cluster_count: 4,

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  // xxx this is over-eager - it would autoplay 5C if all 4H and 4D were up, but really if only one 4C is up you might want to put the other 5C up instead.
  autoplayable_predicate: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};


const WinstonStock = {
  __proto__: _Stock,
  deal: function() {
    const pred = p => p.hasCards ? !(p.cards[0].faceUp && p.cards[0].number === 13) : true;
    return this.hasCards ? new DealToAsManyOfSpecifiedPilesAsPossible(this, gCurrentGame.piles.filter(pred)) : null;
  },
};


const WinstonPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: may_take_descending_alt_colour,
  may_add_card: function(card) {
    if(card.pile.is_reserve) return false;
    return this.hasCards ? is_next_and_alt_colour(card, this.lastCard) : true;
  },
};


const WinstonReserveView = {
  __proto__: _FanView,
  _fan_x_offset: gHFanOffset,
  _always_draw_background: true,
  canvas_width: gCardWidth + 5 * gHFanOffset
};
