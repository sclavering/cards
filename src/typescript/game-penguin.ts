class PenguinGame extends Game {
  static create_layout() {
    return new Layout("#<   c c c c c c c  [ffff]   ><   p p p p p p p>.", { p: FanDownView, f: View, c: View });
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [7, PenguinPile, 0, 0],
      foundations: [4, KlondikeFoundation, 0, 0],
      cells: [7, Cell, 0, 0],
    };
  }

  deal(cards) {
    const aces = cards.filter(c => c.number === 1);
    const others = cards.filter(c => c.number !== 1);
    this._deal_cards(aces, 0, this.piles[0], 0, 1);
    for(let i = 0; i < 3; ++i) this._deal_cards(aces, i + 1, this.foundations[i], 0, 1);
    let ix = 0;
    for(let i = 0; i < 7; ++i) ix = this._deal_cards(others, ix, this.piles[i], 0, i ? 7 : 6);
  }

  best_destination_for(cseq) {
    return this.best_destination_for__nearest_legal_pile_or_cell(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
gGameClasses["penguin"] = PenguinGame;


class PenguinPile extends _Pile {
  may_take_card(card) {
    return may_take_running_flush(card);
  }
  may_add_card(card) {
    return this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13;
  }
};
