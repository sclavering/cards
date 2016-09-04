class FortyThievesGame extends FreeCellRelatedGame {
  static create_layout() {
    return new Layout("#<   f f f f f f f f   ><   s [w]{colspan=13}>.#<   p p p p p p p p p p   >.", { s: StockView, w: FanRightView, p: FanDownView, f: View });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToWaste, 0, 0],
      wastes: [1, Waste, 0, 1],
      piles: [10, FortyThievesPile, 0, 4],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
    this.foundation_cluster_count = 4;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_same_suit_are_on_foundations(this.foundations));
  }
};
gGameClasses["fortythieves"] = FortyThievesGame;


class FortyThievesPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_same_suit(cseq);
  }
  may_add(cseq: CardSequence): boolean | 0 {
    const card = cseq.first;
    if(this.hasCards && !is_next_in_suit(card, this.lastCard)) return false;
    // Check there are enough spaces to perform the move
    if(cseq.is_single) return true;
    let num_can_move = (this.owning_game as FreeCellRelatedGame).empty_pile_count(this, cseq.source);
    if(num_can_move) num_can_move = num_can_move * (num_can_move + 1) / 2;
    ++num_can_move;
    return cseq.count <= num_can_move ? true : 0;
  }
};
