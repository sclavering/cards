abstract class AnyPile {
  public view: View;
  public owning_game: Game;
  public cards: Card[];

  // Previous and next pile of the same type.  Game._create_piles() forms these into doubly-linked non-circular lists.
  public prev: AnyPile;
  public next: AnyPile;

  // The index at which this pile appears in its game's .piles or .foundations or whatever.
  public index: number;

  // These are set by the game, and used when dealing the cards at the start of the game.
  public num_to_deal_face_down: number;
  public num_to_deal_face_up: number;

  protected _surrounding: AnyPile[];
  protected _following: AnyPile[];

  constructor() {
    this.cards = [];
    this.prev = null;
    this.next = null;
    this.index = -1;
    this._surrounding = null;
    this._following = null;
    this.num_to_deal_face_down = 0;
    this.num_to_deal_face_up = 0;
  }

  // An integer that may be displayed below the pile.
  get counter(): number {
    return this.cards.length;
  }

  get first_card(): Card {
    return this.cards.length ? this.cards[0] : null;
  }
  get last_card(): Card {
    const cs = this.cards, l = cs.length;
    return l ? cs[l - 1] : null;
  }

  abstract may_take(cseq: CardSequence): boolean;

  // Implementations may assume the card is not from this pile (i.e. card.pile !== this).
  // Games like FreeCell (where moving multiple cards actually means many single-card moves) return 0 to mean that a move is legal but there aren't enough cells/spaces to perform it.
  abstract may_add(cseq: CardSequence): boolean | 0;

  // In generic code for hints etc it's easy to end up calling cseq.source.may_add(cseq), i.e. trying to move a card onto the pile it's already on.  For most games this doesn't matter, since the combination of .may_take() and .may_add() will already prohibit such moves, but in Russian Solitaire and Yukon this isn't true (because you can move any face-up card).  So generic code should call this rather than the above.
  may_add_maybe_from_self(cseq: CardSequence): boolean | 0 {
    return cseq.source === this ? false : this.may_add(cseq);
  }

  // ErrorMsg is used for the FreeCell legal-but-not-enough-spaces case.
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    return this.may_add_maybe_from_self(cseq) ? new Move(cseq, this) : null;
  }

  surrounding(): AnyPile[] {
    if(this._surrounding) return this._surrounding;
    const ps: AnyPile[] = [];
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
    const ps: AnyPile[] = [];
    let p: AnyPile;
    for(p = this.next; p && p !== this; p = p.next) ps.push(p);
    if(!p) { // next/prev links have *not* been formed into a loop
      let fst : AnyPile = this;
      while(fst.prev) fst = fst.prev;
      for(p = fst; p !== this; p = p.next) ps.push(p);
    }
    return this._following = ps;
  }

  // Should return an Action appropriate for the CardSequence being clicked on.
  action_for_click(cseq: CardSequence): Action {
    return cseq ? this.owning_game.best_action_for(cseq) : null;
  }

  // Return an array of candidates to consider moving when computing hints.
  hint_sources(): CardSequence[] {
    for(let cseq of this.all_cseqs()) if(this.may_take(cseq)) return [cseq];
    return [];
  }

  cseq_at(index: number): CardSequence {
    if(index < 0 || index >= this.cards.length) return null;
    return new CardSequence(this, index);
  }

  cseq_at_negative(index: number): CardSequence {
    return this.cseq_at(this.cards.length + index);
  }

  all_cseqs(): CardSequence[] {
    return this.cards.map((_, ix) => new CardSequence(this, ix));
  }
};


abstract class Stock extends AnyPile {
  may_take(cseq: CardSequence): boolean {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
  action_for_click(cseq: CardSequence): Action {
    return this.deal();
  }
  abstract deal(): Action;
};

class StockDealToWaste extends Stock {
  deal(): Action {
    return this.cards.length ? new DealToPile(this, this.owning_game.waste) : null;
  }
};

class StockDealToWasteOrRefill extends Stock {
  deal(): Action {
    return this.cards.length ? new DealToPile(this, this.owning_game.waste) : new RefillStock(this, this.owning_game.waste);
  }
};

class StockDealThreeOrRefill extends Stock {
  deal(): Action {
    return this.cards.length ? new DealThree(this, this.owning_game.waste as DealThreeWaste) : new RefillStock(this, this.owning_game.waste);
  }
};

class StockDealToFoundation extends Stock {
  deal(): Action {
    return this.cards.length ? new DealToPile(this, this.owning_game.foundation) : null;
  }
};

class StockDealToPiles extends Stock {
  deal(): Action {
    return this.cards.length ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles) : null;
  }
  get counter(): number {
    return Math.ceil(this.cards.length / this.owning_game.piles.length);
  }
};

class StockDealToPilesIfNoneAreEmpty extends StockDealToPiles {
  deal(): Action {
    if(!this.cards.length || this.owning_game.piles.some(p => !p.cards.length)) return null;
    return new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles);
  }
};

class StockDealToNonemptyPiles extends Stock {
  deal(): Action {
    return this.cards.length ? new DealToAsManyOfSpecifiedPilesAsPossible(this, this.owning_game.piles.filter(p => p.cards.length)) : null;
  }
};


class Waste extends AnyPile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
};

class DealThreeWaste extends Waste {
  first_visible_index: number;
  constructor() {
    super();
    this.first_visible_index = 0;
  }
};


class Cell extends AnyPile {
  may_take(cseq: CardSequence): boolean {
    return true;
  }
  may_add(cseq: CardSequence): boolean {
    return !this.cards.length && cseq.is_single;
  }
};


class Reserve extends AnyPile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single && is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
};


function may_take_descending_alt_colour(cseq: CardSequence): boolean {
  return is_face_up(cseq.first) && check_consecutive_cards(cseq, is_next_down_alt_colour);
}

function may_take_descending_same_suit(cseq: CardSequence): boolean {
  return is_face_up(cseq.first) && check_consecutive_cards(cseq, is_next_down_same_suit);
}

function may_add_to_gypsy_pile(card: Card, self: AnyPile): boolean {
  const last = self.last_card;
  return !last || (!is_same_colour(last, card) && card_number(last) === card_number(card) + 1);
}


abstract class Pile extends AnyPile {
};

class AcesUpPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single && is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return cseq.is_single && !this.cards.length;
  }
};

class FanPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single && is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return this.cards.length ? is_next_in_suit(cseq.first, this.last_card) : card_number(cseq.first) === 13;
  }
};

abstract class _FreeCellPile extends Pile {
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    const may = this.may_add_maybe_from_self(cseq);
    if(may) return new Move(cseq, this);
    return may === 0 ? new ErrorMsg("There are not enough free cells and/or spaces to do that.", "Click to continue playing") : null;
  }
};

class GypsyPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_alt_colour(cseq);
  }
  may_add(cseq: CardSequence): boolean {
    return may_add_to_gypsy_pile(cseq.first, this);
  }
};

class KlondikePile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return this.cards.length ? is_next_and_alt_colour(cseq.first, this.last_card) : card_number(cseq.first) === 13;
  }
};

class WaspPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return !this.cards.length || is_next_in_suit(cseq.first, this.last_card);
  }
  hint_sources(): CardSequence[] {
    return this.all_cseqs().filter(cseq => is_face_up(cseq.first));
  }
};


abstract class Foundation extends AnyPile {
};

class KlondikeFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    return cseq.is_single && (this.cards.length ? is_next_in_suit(this.last_card, cseq.first) : card_number(cseq.first) === 1);
  }
};

class UpDownMod13Foundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    return is_up_or_down_mod13(cseq.first, this.last_card);
  }
};
