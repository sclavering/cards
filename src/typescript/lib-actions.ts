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


interface GenericActionChange { pile: AnyPile, pre: Card[], post: Card[] };

abstract class GenericAction implements Action {
  private _anim: AnimationDetails | null;
  private _changes: GenericActionChange[];
  constructor(anim: AnimationDetails, changes: GenericActionChange[]) {
    this._anim = anim;
    this._changes = changes;
  }
  perform(): AnimationDetails | null {
    this._do(!!this._anim);
    return this._anim;
  }
  redo(): void {
    this._do(false);
  }
  _do(animating: boolean): void {
    for(let change of this._changes) change.pile.replace_cards(change.post, animating);
  }
  undo(): void {
    for(let change of this._changes) change.pile.replace_cards(change.pre);
  }
}


class DealToPile extends GenericAction {
  constructor(from: Stock, to: AnyPile) {
    super(null, [
      { pile: from, pre: from.cards, post: from.cards.slice(0, -1) },
      { pile: to, pre: to.cards, post: to.cards.concat(from.cards.slice(-1)) },
    ]);
  }
};


class RefillStock extends GenericAction {
  constructor(stock: Stock, waste: Waste) {
    super(null, [
      { pile: stock, pre: stock.cards, post: waste.cards.slice().reverse() },
      { pile: waste, pre: waste.cards, post: [] },
    ]);
  }
};


class DealThree implements Action {
  private _stock: Stock;
  private _waste: DealThreeWaste;
  private _old_num_visible_after_last_deal: number;
  private _old_num_total_after_last_deal: number;
  private num_moved: number;
  constructor(from: Stock, to: DealThreeWaste) {
    this._stock = from;
    this._waste = to;
  }
  perform(): void {
    this._old_num_visible_after_last_deal = this._waste.num_visible_after_last_deal;
    this._old_num_total_after_last_deal = this._waste.num_total_after_last_deal;
    const cs = this._stock.cards, num = Math.min(cs.length, 3), ix = cs.length - num;
    this.num_moved = this._waste.num_visible_after_last_deal = num;
    this._waste.num_total_after_last_deal = this._waste.cards.length + num;
    for(var i = 0; i !== num; ++i) this._stock.deal_card_to(this._waste);
  }
  undo(): void {
    const num = this.num_moved;
    this._waste.num_visible_after_last_deal = this._old_num_visible_after_last_deal;
    this._waste.num_total_after_last_deal = this._old_num_total_after_last_deal;
    for(var i = 0; i !== num; ++i) this._stock.undeal_card_from(this._waste);
  }
};


class DealToAsManyOfSpecifiedPilesAsPossible extends GenericAction {
  constructor(stock: Stock, piles: AnyPile[]) {
    if(piles.length > stock.cards.length) piles = piles.slice(0, stock.cards.length);
    const changes = [
      { pile: stock as AnyPile, pre: stock.cards, post: stock.cards.slice(0, -piles.length) },
    ];
    piles.forEach((p, ix) => changes.push({ pile: p, pre: p.cards, post: p.cards.concat(stock.cards[stock.cards.length - 1 - ix]) }));
    super(null, changes);
  }
};


class Move extends GenericAction {
  // These are all public for Klondike scoring purposes.
  public cseq: CardSequence;
  public destination: AnyPile;
  public revealed_card: boolean;
  constructor(cseq: CardSequence, destination: AnyPile) {
    const rem = cseq.source.cards.slice(0, cseq.index);
    const revealed_card = rem.length ? !rem[rem.length - 1].faceUp : false;
    if(revealed_card) rem[rem.length - 1] = Cards.face_up_of(rem[rem.length - 1]);
    super(prepare_move_animation(cseq, destination), [
      { pile: cseq.source, pre: cseq.source.cards, post: rem },
      { pile: destination, pre: destination.cards, post: destination.cards.concat(cseq.cards) },
    ]);
    this.cseq = cseq;
    this.destination = destination;
    this.revealed_card = revealed_card;
  }
};


class RemovePair extends GenericAction {
  constructor(cseq1: CardSequence, cseq2: CardSequence | null) {
    const f = cseq1.source.owning_game.foundation;
    const changes: GenericActionChange[] = [];
    changes.push({ pile: cseq1.source, pre: cseq1.source.cards, post: cseq1.source.cards.slice(0, -1) });
    if(cseq2) changes.push({ pile: cseq2.source, pre: cseq2.source.cards, post: cseq2.source.cards.slice(0, -1) });
    changes.push({ pile: f, pre: f.cards, post: f.cards.concat(cseq1.cards, cseq2 ? cseq2.cards : []) });
    super(null, changes);
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
