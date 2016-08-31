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

  init() {
    const ps = this.piles;
    ps[0].prev = ps[3];
    ps[3].next = ps[0];
  }

  best_destination_for(cseq) {
    const card = cseq.first;
    const f = this.foundation;
    if(f.may_add_card(card)) return f;
    return findEmpty(card.pile.following());
  }

  // no autoplay for this game

  is_won() {
    if(this.stock.cards.length) return false;
    for(let p of this.piles) if(p.cards.length !== 1) return false;
    return true;
  }
};
gGameClasses["acesup"] = AcesUpGame;


class AcesUpFoundation extends _Foundation {
  may_take_card() {
    return false;
  }
  may_add_card(card) {
    const compare = (c, d) => d ? c.suit === d.suit && c.number !== 1 && (c.number < d.number || d.number === 1) : false;
    if(compare(card, card.pile.secondToLastCard)) return true;
    for(let p of card.pile.following()) if(compare(card, p.lastCard)) return true;
    return false;
  }
};
