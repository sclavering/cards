class WinstonGame extends Game {
  static create_layout() {
    return new Layout("#<   s r   f f f f f f f f   >.#<   p p p p p p p p p p   >.", { r: WinstonReserveView });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, WinstonStock, 0, 0],
      reserves: [1, Reserve, 0, 6],
      piles: [10, WinstonPile, [0, 1, 2, 3, 4, 4, 3, 2, 1, 0], 1],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
    this.foundation_cluster_count = 4;
  }

  // xxx implement .is_shuffle_impossible, to detect games where the reserve starts with e.g. "4H ... 8H ... 8H ..." (it's impossible to get past two identical cards if a lower one from the suit is beneath them).  Also "... AH AH ... 8H ..."
  // xxx "4S _ 6S 10S 9S _" is almost-impossible (requires moving things back from the foundations)

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two_for_two_decks(this.foundations));
  }
};
g_game_classes["winston"] = WinstonGame;


class WinstonStock extends Stock {
  deal(): Action {
    const pred = (p: AnyPile) => p.cards.length ? !(p.cards[0].face_up && card_number(p.cards[0]) === 13) : true;
    return this.cards.length ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles.filter(pred)) : null;
  }
};


class WinstonPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_alt_colour(cseq);
  }
  may_add(cseq: CardSequence): boolean {
    if(cseq.source instanceof Reserve) return false;
    return this.cards.length ? is_next_and_alt_colour(cseq.first, this.last_card) : true;
  }
};


class WinstonReserveView extends _FixedFanView {
  constructor() {
    super({ capacity: 6, horizontal: true });
  }
};
