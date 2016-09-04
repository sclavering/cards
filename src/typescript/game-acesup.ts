class AcesUpGame extends Game {
  static create_layout() {
    return new Layout("#<   s  p p p p  f   >.", { s: StockView, p: FanDownView, f: CountedView });
  }

  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToPiles, 0, 0],
      piles: [4, AcesUpPile, 0, 1],
      foundations: [1, AcesUpFoundation, 0, 0],
    };
  }

  protected init() {
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    const f = this.foundation;
    if(f.may_add(cseq)) return f;
    return findEmpty(cseq.source.following());
  }

  // no autoplay for this game

  is_won(): boolean {
    if(this.stock.cards.length) return false;
    for(let p of this.piles) if(p.cards.length !== 1) return false;
    return true;
  }
};
gGameClasses["acesup"] = AcesUpGame;


class AcesUpFoundation extends Foundation {
  may_take(cseq: CardSequence) {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    const card = cseq.first;
    const compare = (c: Card, d: Card) => d ? c.suit === d.suit && c.number !== 1 && (c.number < d.number || d.number === 1) : false;
    if(compare(card, cseq.source.secondToLastCard)) return true;
    for(let p of cseq.source.following()) if(compare(card, p.lastCard)) return true;
    return false;
  }
};
