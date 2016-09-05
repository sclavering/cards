class _GypsyGame extends Game {
  static create_layout() {
    return new Layout("#<   p p p p p p p p  (#<f_f><f_f><f_f><f_f>.s)   >.", { s: StockView, p: FanDownView, f: View });
  }

  constructor() {
    super();
    this.help_id = "gypsy";
    this.pile_details = {
      stocks: [1, StockDealToPiles, 0, 0],
      piles: [8, GypsyPile, 2, 1],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations(this.foundations));
  }
};

class Gypsy2Game extends _GypsyGame {
  constructor() {
    super();
    this.all_cards = make_cards(4, "SH");
    this.foundation_cluster_count = 2;
  }
};
g_game_classes["gypsy2"] = Gypsy2Game;

class Gypsy4Game extends _GypsyGame {
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.foundation_cluster_count = 4;
  }
};
g_game_classes["gypsy4"] = Gypsy4Game;
