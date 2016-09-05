class TowersGame extends FreeCellRelatedGame {
  static create_layout() {
    return new Layout("#<  c c c c    f f f f  >.#<   p p p p p p p p p p   >.");
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [10, TowersPile, 0, 5],
      foundations: [4, KlondikeFoundation, 0, 0],
      cells: [4, Cell, 0, [0, 1, 1, 0]],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_or_cell(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
g_game_classes["towers"] = TowersGame;


class TowersPile extends _FreeCellPile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_same_suit(cseq);
  }
  may_add(cseq: CardSequence): boolean | 0 {
    if(!(this.cards.length ? is_next_in_suit(cseq.first, this.last_card) : cseq.first.number === 13)) return false;
    return cseq.count <= 1 + (this.owning_game as FreeCellRelatedGame).empty_cell_count() ? true : 0;
  }
};
