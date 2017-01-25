// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

class DoubleSolGame extends Game {
  static create_layout() {
    return new Layout("#<   s w   f f f f   >.#<   p p p p p p p p p p   >.", { f: DoubleSolFoundationView });
  }

  constructor() {
    super();
    this.help_id = "klondike";
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToWasteOrRefill, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [10, KlondikePile, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1],
      foundations: [4, DoubleSolFoundation, 0, 0],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(this.foundations));
  }
};
g_game_classes["doublesol"] = DoubleSolGame;


// Built A,A,2,2,3,3,...,Q,Q,K,K
class DoubleSolFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    if(!cseq.is_single) return false;
    if(!this.cards.length) return card_number(card) === 1 && !includes_pile_starting_with_suit(this.following(), card_suit(card));
    const expected_number = Math.floor(this.cards.length / 2) + 1;
    return card_number(card) === expected_number && is_same_suit(card, this.cards[0]);
  }
};
