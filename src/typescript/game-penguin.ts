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

  protected deal(cards: Card[]): void {
    const aces = cards.filter(c => c.number === 1);
    const others = cards.filter(c => c.number !== 1);
    this.deal_cards(aces, 0, this.piles[0], 0, 1);
    for(let i = 0; i < 3; ++i) this.deal_cards(aces, i + 1, this.foundations[i], 0, 1);
    let ix = 0;
    for(let i = 0; i < 7; ++i) ix = this.deal_cards(others, ix, this.piles[i], 0, i ? 7 : 6);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_or_cell(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
gGameClasses["penguin"] = PenguinGame;


class PenguinPile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_same_suit(cseq);
  }
  may_add(cseq: CardSequence): boolean {
    return this.hasCards ? is_next_in_suit(cseq.first, this.lastCard) : cseq.first.number === 13;
  }
};
