class Golf1Game extends Game {
  static create_layout() {
    return new Layout("#<   s  f   >.#<   p p p p p p p   >.");
  }

  constructor() {
    super();
    this.helpId = "golf";
    // Note: Golf2Game modifies this.
    this.pile_details = {
      stocks: [1, StockDealToFoundation, 0, 0],
      piles: [7, GolfPile, 0, 5],
      foundations: [1, UpDownMod13Foundation, 0, 1],
    };
  }

  best_action_for(cseq: CardSequence): Action {
    const f = this.foundation;
    return cseq.source.may_take(cseq) && f.may_add(cseq) ? new Move(cseq.first, f) : null;
  }

  is_won(): boolean {
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  }
};
gGameClasses["golf1"] = Golf1Game;


class Golf2Game extends Golf1Game {
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details["piles"][3] = 9; // 8 cards per pile
  }
};
gGameClasses["golf2"] = Golf2Game;


class GolfPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single && cseq.first.faceUp;
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
};
