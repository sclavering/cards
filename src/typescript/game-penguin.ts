class PenguinGame extends Game {
  static create_layout() {
    return new Layout("#<   c c c c c c c  [ffff]   ><   p p p p p p p>.");
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
    others.unshift(aces.pop());
    for(let i = 0; i < 3; ++i) this.deal_cards(aces, i, this.foundations[i], 0, 1);
    let ix = 0;
    for(let p of this.piles) ix = this.deal_cards(others, ix, p, 0, 7);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_or_cell(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
g_game_classes["penguin"] = PenguinGame;


class PenguinPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_same_suit(cseq);
  }
  may_add(cseq: CardSequence): boolean {
    return this.cards.length ? is_next_in_suit(cseq.first, this.last_card) : cseq.first.number === 13;
  }
};
