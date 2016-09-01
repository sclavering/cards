class AnyPile {
  public view: View;
  public owning_game: Game;

  cards: Card[];
  prev: AnyPile;
  next: AnyPile;
  index: number;
  is_foundation: boolean;
  is_cell: boolean;
  is_reserve: boolean;
  is_stock: boolean;
  is_waste: boolean;
  is_pile: boolean;
  is_drop_target: boolean;
  num_to_deal_face_down: number;
  num_to_deal_face_up: number;

  protected _surrounding: AnyPile[];
  protected _following: AnyPile[];

  constructor() {
    this.cards = [];
    // Previous and next pile of the same type.  Game._create_piles() forms these into doubly-linked non-circular lists.
    this.prev = null;
    this.next = null;
    // The index at which this pile appears in its game's .piles or .foundations or whatever.
    this.index = -1;
    this._surrounding = null;
    this._following = null;

    // Exactly one of these will be set true by a subclass.
    this.is_foundation = false;
    this.is_cell = false;
    this.is_reserve = false;
    this.is_stock = false;
    this.is_waste = false;
    this.is_pile = false;

    this.is_drop_target = true;

    // These are set by the game, and used when dealing the cards at the start of the game.
    this.num_to_deal_face_down = 0;
    this.num_to_deal_face_up = 0;
  }

  // An integer that may be displayed below the pile.
  get counter(): number {
    return this.cards.length;
  }

  get hasCards(): boolean {
    return this.cards.length !== 0;
  }
  get firstCard(): Card {
    return this.cards.length ? this.cards[0] : null;
  }
  get lastCard(): Card {
    const cs = this.cards, l = cs.length;
    return l ? cs[l - 1] : null;
  }
  get secondToLastCard(): Card {
    const cs = this.cards;
    return cs.length > 1 ? cs[cs.length - 2] : null;
  }

  may_take_card(card: Card): boolean {
    throw "may_take_card not implemented!";
  }

  // Implementations may assume the card is not from this pile (i.e. card.pile !== this).
  // Games like FreeCell (where moving multiple cards actually means many single-card moves) return 0 to mean that a move is legal but there aren't enough cells/spaces to perform it.
  may_add_card(card: Card): boolean | 0 {
    throw "may_add_card not implemented!";
  }

  // In generic code for hints etc it's easy to end up calling card.pile.may_add_card(card), i.e. trying to move a card onto the pile it's already on.  For most games this doesn't matter, since the combination of .may_take_card and .may_add_card will already prohibit such moves, but in Russian Solitaire and Yukon this isn't true (because you can move any face-up card).  So generic code should call this rather than the above.
  may_add_card_maybe_to_self(card: Card): boolean | 0 {
    return card.pile === this ? false : this.may_add_card(card);
  }

  // Should return an Action/ErrorMsg appropriate for the CardSequence being dropped on the pile.
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    const card = cseq.first;
    return this.may_add_card_maybe_to_self(card) ? new Move(card, this) : null;
  }

  surrounding(): AnyPile[] {
    if(this._surrounding) return this._surrounding;
    const ps = [];
    var prev = this.prev, next = this.next;
    while(prev && next) {
      ps.push(next); ps.push(prev);
      next = next.next; prev = prev.prev;
    }
    while(next) { ps.push(next); next = next.next; }
    while(prev) { ps.push(prev); prev = prev.prev; }
    return this._surrounding = ps;
  }

  following(): AnyPile[] {
    if(this._following) return this._following;
    const ps = [];
    let p;
    for(p = this.next; p && p !== this; p = p.next) ps.push(p);
    if(!p) { // next/prev links have *not* been formed into a loop
      let fst : AnyPile = this;
      while(fst.prev) fst = fst.prev;
      for(p = fst; p !== this; p = p.next) ps.push(p);
    }
    return this._following = ps;
  }

  add_cards_from_array(cards: Card[], do_not_update_view?: boolean): void {
    const cs = this.cards, num = cards.length;
    for(let i = 0, j = cs.length; i !== num; ++i, ++j) {
      let c = cards[i];
      c.index = j;
      c.pile = this;
      cs[j] = c;
    }
    if(!do_not_update_view) this.view.update();
  }

  // Add the passed card and all other cards of higher .index from the same pile.
  add_cards(card: Card, do_not_update_view?: boolean): void {
    const p = card.pile, pcs = p.cards, ix = card.index;
    this.add_cards_from_array(pcs.slice(ix), do_not_update_view);
    p.remove_cards_after(ix, do_not_update_view);
  }

  // Should generally not be called except by pile impls.
  remove_cards_after(index: number, do_not_update_view: boolean): void {
    this.cards = this.cards.slice(0, index);
    if(!do_not_update_view) this.view.update();
  }

  // Should return an Action/ErrorMsg appropriate for the CardSequence being clicked on.
  action_for_click(cseq: CardSequence): Action | ErrorMsg {
    return cseq ? this.owning_game.best_action_for(cseq) : null;
  }

  // Return an array of cards to consider moving when computing hints.
  hint_sources(): Card[] {
    for(let c of this.cards) if(c.pile.may_take_card(c)) return [c];
    return [];
  }
};


abstract class Stock extends AnyPile {
  magic_stock_stub_card: any;

  constructor() {
    super();
    this.is_stock = true;
    this.is_drop_target = false;

    // The Layout mouse-handling code wants a Card as the target of the event. So we provide a stub object that just lets it get from there to the pile to call .action_for_click().
    this.magic_stock_stub_card = { pile: this };
  }
  may_take_card(): boolean {
    return false;
  }
  may_add_card(): boolean {
    return false;
  }

  deal_card_to(destination: AnyPile): void {
    const card = this.lastCard;
    card.faceUp = true;
    destination.add_cards(card);
  }

  undeal_card_from(source: AnyPile): void {
    const card = source.lastCard;
    card.faceUp = false;
    this.add_cards(card);
  }

  action_for_click(cseq: CardSequence): Action {
    return this.deal();
  }

  abstract deal(): Action;
};

class StockDealToWaste extends Stock {
  deal(): Action {
    return this.hasCards ? new DealToPile(this, this.owning_game.waste) : null;
  }
};

class StockDealToWasteOrRefill extends Stock {
  deal(): Action {
    return this.hasCards ? new DealToPile(this, this.owning_game.waste) : new RefillStock(this, this.owning_game.waste);
  }
};

class StockDeal3OrRefill extends Stock {
  deal(): Action {
    return this.hasCards ? new DealThree(this, this.owning_game.waste) : new RefillStock(this, this.owning_game.waste);
  }
};

class StockDealToFoundation extends Stock {
  deal(): Action {
    return this.hasCards ? new DealToPile(this, this.owning_game.foundation) : null;
  }
};

class StockDealToPiles extends Stock {
  deal(): Action {
    return this.hasCards ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles) : null;
  }
  get counter(): number {
    return Math.ceil(this.cards.length / this.owning_game.piles.length);
  }
};

class StockDealToPilesIfNoneAreEmpty extends StockDealToPiles {
  deal(): Action {
    if(!this.hasCards || this.owning_game.piles.some(p => !p.hasCards)) return null;
    return new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles);
  }
};

class StockDealToNonemptyPiles extends Stock {
  deal(): Action {
    return this.hasCards ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles.filter(p => p.hasCards)) : null;
  }
};


class Waste extends AnyPile {
  deal3v: number;
  deal3t: number;

  constructor() {
    super();
    this.is_waste = true;
    this.is_drop_target = false;

    // Things to make draw3 waste piles work
    this.deal3v = 0; // The number of cards that should have been visible after the last deal.
    this.deal3t = 0; // The number of cards on this pile after the last deal.
  }
  may_take_card(card: Card): boolean {
    return card.isLast;
  }
  may_add_card(card: Card): boolean {
    return false;
  }
};


class Cell extends AnyPile {
  constructor() {
    super();
    this.is_cell = true;
  }
  may_take_card(card: Card): boolean {
    return true;
  }
  may_add_card(card: Card): boolean {
    return !this.hasCards && card.isLast;
  }
};


class Reserve extends AnyPile {
  constructor() {
    super();
    this.is_reserve = true;
    this.is_drop_target = false;
  }
  may_take_card(card: Card): boolean {
    return card.isLast && card.faceUp;
  }
  may_add_card(card: Card): boolean {
    return false;
  }
};


function may_take_descending_alt_colour(card: Card): boolean {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(let i = card.index; i !== num - 1; ++i) if(!is_next_and_alt_colour(cs[i + 1], cs[i])) return false;
  return true;
}

function may_take_descending_run(card: Card): boolean {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].number !== cs[j].number + 1) return false;
  return true;
}

function may_take_running_flush(card: Card): boolean {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].suit !== cs[j].suit || cs[i].number !== cs[j].number + 1) return false;
  return true;
}

function may_add_to_gypsy_pile(card: Card, self: AnyPile): boolean {
  const last = self.lastCard;
  return !last || (last.colour !== card.colour && last.number === card.number + 1);
}


class _Pile extends AnyPile {
  constructor() {
    super();
    this.is_pile = true;
  }
};

class AcesUpPile extends _Pile {
  may_take_card(card: Card): boolean {
    return card.isLast && card.faceUp;
  }
  may_add_card(card: Card): boolean {
    return card.isLast && !this.hasCards;
  }
};

class FanPile extends _Pile {
  may_take_card(card: Card): boolean {
    return card.isLast && card.faceUp;
  }
  may_add_card(card: Card): boolean {
    return this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13;
  }
};

class _FreeCellPile extends _Pile {
  // may_add_card returns 0 to mean "legal, but not enough cells+spaces to do the move"
  action_for_drop(cseq): Action | ErrorMsg {
    const card = cseq.first;
    const may = this.may_add_card_maybe_to_self(card);
    if(may) return new Move(card, this);
    return may === 0 ? new ErrorMsg("There are not enough free cells and/or spaces to do that.", "Click to continue playing") : null;
  }
};

class GypsyPile extends _Pile {
  may_take_card(card: Card): boolean {
    return may_take_descending_alt_colour(card);
  }
  may_add_card(card: Card): boolean {
    return may_add_to_gypsy_pile(card, this);
  }
};

class KlondikePile extends _Pile {
  may_take_card(card: Card): boolean {
    return card.faceUp;
  }
  may_add_card(card: Card): boolean {
    return this.hasCards ? is_next_and_alt_colour(card, this.lastCard) : card.number === 13;
  }
};

class WaspPile extends _Pile {
  may_take_card(card: Card): boolean {
    return card.faceUp;
  }
  may_add_card(card: Card): boolean {
    return !this.hasCards || is_next_in_suit(card, this.lastCard);
  }
  hint_sources(): Card[] {
    return this.cards.filter(c => c.faceUp);
  }
};


class _Foundation extends AnyPile {
  constructor() {
    super();
    this.is_foundation = true;
  }
};

class KlondikeFoundation extends _Foundation {
  may_take_card(card: Card): boolean {
    return card.isLast;
  }
  may_add_card(card: Card): boolean {
    return card.isLast && (this.hasCards ? is_next_in_suit(this.lastCard, card) : card.number === 1);
  }
};

class UpDownMod13Foundation extends _Foundation {
  may_take_card(card: Card): boolean {
    return false;
  }
  may_add_card(card: Card): boolean {
    return is_up_or_down_mod13(card, this.lastCard);
  }
};
