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
    return find_empty(cseq.source.following());
  }

  // no autoplay for this game

  is_won(): boolean {
    if(this.stock.cards.length) return false;
    for(let p of this.piles) if(p.cards.length !== 1) return false;
    return true;
  }
};
g_game_classes["acesup"] = AcesUpGame;


class AcesUpFoundation extends Foundation {
  may_take(cseq: CardSequence) {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    const compare = (c: Card, d: Card) => d ? c.suit === d.suit && card_number(c) !== 1 && (card_number(c) < card_number(d) || card_number(d) === 1) : false;
    const second_to_last_card = cseq.source.cards.length > 1 ? cseq.source.cards[cseq.index - 1] : null
    if(compare(cseq.first, second_to_last_card)) return true;
    for(let p of cseq.source.following()) if(compare(cseq.first, p.last_card)) return true;
    return false;
  }
};
