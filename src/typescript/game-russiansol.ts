class RussianSolGame extends Game {
  static create_layout() {
    return new Layout("#<   p p p p p p p  [ffff]   >.");
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [7, WaspPile, [0, 1, 2, 3, 4, 5, 6], [1, 5, 5, 5, 5, 5, 5]],
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
gGameClasses["russiansol"] = RussianSolGame;
