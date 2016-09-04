// Action objects are moves (either initiated by the player, or automatic ones) that can be done, undone, and redone.  Turning cards face up is generally treated as an incidental side-effect of an Action, rather than being an Action in its own right.
interface Action {
  // Either carry out the action immediately and return void, or return an animation that will perform the action.
  perform(): AnimationDetails | void;

  // Undo the effects of .perform() and .redo(), never using animation
  undo(): void;

  // Omit this if .perform() is non-animated.  Otherwise it should make the same changes as .perform() would, but never using animation.
  redo?(): void;

  // These are just set and used by Game subclasses directly.
  score?: number;
  streakLength?: number;
}


class DealToPile implements Action {
  private _from: Stock;
  private _to: AnyPile;
  constructor(from: Stock, to: AnyPile) {
    this._from = from;
    this._to = to;
  }
  perform(): void {
    this._from.deal_card_to(this._to);
  }
  undo(): void {
    this._from.undeal_card_from(this._to);
  }
};


class RefillStock implements Action {
  private _stock: Stock;
  private _waste: Waste;
  constructor(from: Stock, to: Waste) {
    this._stock = from;
    this._waste = to;
  }
  perform(): void {
    while(this._waste.hasCards) this._stock.undeal_card_from(this._waste);
  }
  undo(): void {
    while(this._stock.hasCards) this._stock.deal_card_to(this._waste);
  }
};


class DealThree implements Action {
  private _stock: Stock;
  private _waste: Waste;
  private _old_deal3v: number;
  private _old_deal3t: number;
  private num_moved: number;
  constructor(from: Stock, to: Waste) {
    this._stock = from;
    this._waste = to;
  }
  perform(): void {
    this._old_deal3v = this._waste.deal3v;
    this._old_deal3t = this._waste.deal3t;
    const cs = this._stock.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.num_moved = this._waste.deal3v = num;
    this._waste.deal3t = this._waste.cards.length + num;
    for(var i = 0; i !== num; ++i) this._stock.deal_card_to(this._waste);
  }
  undo(): void {
    const num = this.num_moved;
    this._waste.deal3v = this._old_deal3v;
    this._waste.deal3t = this._old_deal3t;
    for(var i = 0; i !== num; ++i) this._stock.undeal_card_from(this._waste);
  }
};


class DealToAsManyOfSpecifiedPilesAsPossible implements Action {
  private _stock: Stock;
  private _piles: AnyPile[];
  constructor(stock: Stock, piles: AnyPile[]) {
    this._stock = stock;
    this._piles = piles.length > stock.cards.length ? piles.slice(0, stock.cards.length) : piles;
  }
  perform(): void {
    for(let p of this._piles) this._stock.deal_card_to(p);
  }
  undo(): void {
    for(let p of this._piles.slice().reverse()) this._stock.undeal_card_from(p);
  }
};


class Move implements Action {
  // These are all public for Klondike scoring purposes.
  public cseq: CardSequence;
  public destination: AnyPile;
  public revealed_card: Card;
  constructor(cseq: CardSequence, destination: AnyPile) {
    this.cseq = cseq;
    this.destination = destination;
    const new_source_top_card = this.cseq.source.cards[cseq.index - 1] || null;
    this.revealed_card = new_source_top_card && !new_source_top_card.faceUp ? new_source_top_card : null;
  }
  perform(): AnimationDetails {
    const rv = prepare_move_animation(this.cseq, this.destination);
    transfer_cards(this.cseq.source, this.cseq.cards, this.destination, true);
    if(this.revealed_card) this.cseq.source.reveal_top_card();
    return rv;
  }
  undo(): void {
    if(this.revealed_card) this.cseq.source.unreveal_top_card();
    transfer_cards(this.destination, this.cseq.cards, this.cseq.source);
  }
  redo(): void {
    transfer_cards(this.cseq.source, this.cseq.cards, this.destination);
    if(this.revealed_card) this.cseq.source.reveal_top_card();
  }
};


class RemovePair implements Action {
  private _cseq1: CardSequence;
  private _cseq2: CardSequence;
  constructor(cseq1: CardSequence, cseq2: CardSequence) {
    this._cseq1 = cseq1;
    this._cseq2 = cseq2;
  }
  perform(): void {
    const f = this._cseq1.source.owning_game.foundation;
    transfer_cards(this._cseq1.source, this._cseq1.cards, f);
    if(this._cseq2) transfer_cards(this._cseq2.source, this._cseq2.cards, f);
  }
  undo(): void {
    const f = this._cseq1.source.owning_game.foundation;
    if(this._cseq2) transfer_cards(f, this._cseq2.cards, this._cseq2.source);
    transfer_cards(f, this._cseq1.cards, this._cseq1.source);
  }
};


class ErrorMsg {
  private _msg1: string;
  private _msg2: string;
  constructor(msg1: string, msg2: string) {
    this._msg1 = msg1;
    this._msg2 = msg2;
  }
  show() {
    ui.show_message(this._msg1, this._msg2);
  }
};
