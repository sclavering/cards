class _YukonRelatedGame extends Game {
  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    // Keeping a 2 down so you can put an Ace on it can be useful if the Ace has other junk on top of it.
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations(this.foundations));
  }
};

class YukonGame extends _YukonRelatedGame {
  static create_layout() {
    return new Layout("#<   p p p p p p p  [f_f_f_f]   >.");
  }
  constructor() {
    super();
    this.pile_details = {
      piles: [7, YukonPile, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5]],
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }
};
g_game_classes["yukon"] = YukonGame;

class SanibelGame extends _YukonRelatedGame {
  static create_layout() {
    return new Layout("#<  s w    f f f f f f f f  >.#<   p p p p p p p p p p   >.");
  }
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToWaste, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [10, YukonPile, 3, 7],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
    this.foundation_cluster_count = 4;
  }
};
g_game_classes["sanibel"] = SanibelGame;

class YukonPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.first.face_up;
  }
  may_add(cseq: CardSequence): boolean {
    return may_add_to_gypsy_pile(cseq.first, this);
  }
  hint_sources(): CardSequence[] {
    return this.all_cseqs().filter(cseq => cseq.first.face_up);
  }
};
