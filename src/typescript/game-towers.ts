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
gGameClasses["towers"] = TowersGame;


class TowersPile extends _FreeCellPile {
  may_take(cseq: CardSequence): boolean {
    return may_take_running_flush(cseq.first);
  }
  may_add_card(card: Card): boolean | 0 {
    if(!(this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13)) return false;
    const num_to_move = card.pile.cards.length - card.index;
    return num_to_move <= 1 + (this.owning_game as FreeCellRelatedGame).empty_cell_count() ? true : 0;
  }
};
