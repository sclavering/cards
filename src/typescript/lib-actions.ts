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
  public card: Card;
  public source: AnyPile;
  public destination: AnyPile;
  public revealed_card: Card;
  constructor(card: Card, destination: AnyPile) {
    this.card = card;
    this.source = card.pile;
    this.destination = destination;
    const new_source_top_card = this.source.cards[card.index - 1] || null;
    this.revealed_card = new_source_top_card && !new_source_top_card.faceUp ? new_source_top_card : null;
  }
  perform(): AnimationDetails {
    const rv = prepare_move_animation(this.card, this.destination);
    this.destination.add_cards(this.card, true); // doesn't update view
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
    return rv;
  }
  undo(): void {
    if(this.revealed_card) this.revealed_card.setFaceUp(false);
    this.source.add_cards(this.card);
  }
  redo(): void {
    this.destination.add_cards(this.card);
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
  }
};


class RemovePair implements Action {
  private _c1: Card;
  private _c2: Card;
  private _p1: AnyPile;
  private _p2: AnyPile;
  constructor(card1, card2) {
    this._c1 = card1;
    this._p1 = card1.pile;
    this._c2 = card2;
    this._p2 = card2 && card2.pile;
  }
  perform(): void {
    const f = this._p1.owning_game.foundation;
    f.add_cards(this._c1);
    if(this._c2) f.add_cards(this._c2);
  }
  undo(): void {
    if(this._c2) this._p2.add_cards(this._c2);
    this._p1.add_cards(this._c1);
  }
};


class ErrorMsg {
  private _msg1: string;
  private _msg2: string;
  constructor(msg1, msg2) {
    this._msg1 = msg1;
    this._msg2 = msg2;
  }
  show() {
    showMessage(this._msg1, this._msg2);
  }
};
