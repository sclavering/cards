/// <reference path="./misctypes.ts" />

/*
"Action" objects are card-moves that can be done, undone, and redone.

The required interface is:

perform()
  Carry out the action.
  If animation is desired, this should return appropriate details to pass to g_animations.run().  It should not start the animation itself.  And it almost certainly needs to implement .redo() as well.
undo()
redo()
  Undo/redo the effects of the action.  Must *not* use animation.
  If redo() is omitted, perform() is used instead, and must not use animation.

Piles' .action_for_drop(cseq) normally returns an Action, but in FreeCell and similar it may return an ErrorMsg instead.
*/

interface Action {
  perform() : any;
  undo() : void;
  redo?() : void;
  // These are just set and used by Game subclasses directly.
  score?: number;
  streakLength?: number;
}


class DealToPile implements Action {
  from: Pile;
  to: Pile;
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
  perform() {
    this.from.deal_card_to(this.to);
  }
  undo() {
    this.from.undeal_card_from(this.to);
  }
};


class RefillStock implements Action {
  stock: Pile;
  waste: Pile;
  constructor(stock, waste) {
    this.stock = stock;
    this.waste = waste;
  }
  perform() {
    while(this.waste.hasCards) this.stock.undeal_card_from(this.waste);
  }
  undo() {
    while(this.stock.hasCards) this.stock.deal_card_to(this.waste);
  }
};


class DealThree implements Action {
  stock: Pile;
  waste: Pile;
  old_deal3v: number;
  old_deal3t: number;
  num_moved: number;
  constructor(stock, waste) {
    this.stock = stock;
    this.waste = waste;
  }
  perform() {
    this.old_deal3v = this.waste.deal3v;
    this.old_deal3t = this.waste.deal3t;
    const cs = this.stock.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.num_moved = this.waste.deal3v = num;
    this.waste.deal3t = this.waste.cards.length + num;
    for(var i = 0; i !== num; ++i) this.stock.deal_card_to(this.waste);
  }
  undo() {
    const num = this.num_moved;
    this.waste.deal3v = this.old_deal3v;
    this.waste.deal3t = this.old_deal3t;
    for(var i = 0; i !== num; ++i) this.stock.undeal_card_from(this.waste);
  }
};


class DealToAsManyOfSpecifiedPilesAsPossible implements Action {
  _stock: Pile;
  _piles: Pile[];
  constructor(stock, piles) {
    this._stock = stock;
    this._piles = piles.length > stock.cards.length ? piles.slice(0, stock.cards.length) : piles;
  }
  perform() {
    for(let p of this._piles) this._stock.deal_card_to(p);
  }
  undo() {
    for(let p of this._piles.slice().reverse()) this._stock.undeal_card_from(p);
  }
};


class Move implements Action {
  card: Card;
  source: Pile;
  destination: Pile;
  revealed_card: Pile;
  constructor(card, destination) {
    this.card = card;
    this.source = card.pile;
    this.destination = destination;
    const new_source_top_card = this.source.cards[card.index - 1] || null;
    this.revealed_card = new_source_top_card && !new_source_top_card.faceUp ? new_source_top_card : null;
  }
  perform() {
    const rv = prepare_move_animation(this.card, this.destination);
    this.destination.add_cards(this.card, true); // doesn't update view
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
    return rv;
  }
  undo() {
    if(this.revealed_card) this.revealed_card.setFaceUp(false);
    this.source.add_cards(this.card);
  }
  redo() {
    this.destination.add_cards(this.card);
    if(this.revealed_card) this.revealed_card.setFaceUp(true);
  }
};


class RemovePair implements Action {
  c1: Card;
  c2: Card;
  p1: Pile;
  p2: Pile;
  constructor(card1, card2) {
    this.c1 = card1;
    this.p1 = card1.pile;
    this.c2 = card2;
    this.p2 = card2 && card2.pile;
  }
  perform() {
    const f = this.p1.owning_game.foundation;
    f.add_cards(this.c1);
    if(this.c2) f.add_cards(this.c2);
  }
  undo() {
    if(this.c2) this.p2.add_cards(this.c2);
    this.p1.add_cards(this.c1);
  }
};


class ErrorMsg {
  msg1: string;
  msg2: string;
  constructor(msg1, msg2) {
    this.msg1 = msg1;
    this.msg2 = msg2;
  }
  show() {
    showMessage(this.msg1, this.msg2);
  }
};
