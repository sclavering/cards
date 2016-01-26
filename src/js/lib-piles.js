function createPile(impl) {
  return {
    __proto__: impl,
    cards: [],
    // Previous and next pile of the same type.  Game._create_piles() forms these into doubly-linked non-circular lists.
    prev: null,
    next: null,
    // The index at which this pile appears in its game's .piles or .foundations or whatever.
    index: -1,
  };
};

const Pile = {
  // Exactly one of these will be true.
  is_foundation: false,
  is_cell: false,
  is_reserve: false,
  is_stock: false,
  is_waste: false,
  is_pile: false,

  // An integer that may be displayed below the pile.
  get counter() {
    return this.cards.length;
  },

  is_drop_target: true,

  get hasCards() { return this.cards.length !== 0; },
  get firstCard() { const cs = this.cards; return cs.length ? cs[0] : null; },
  get lastCard() { const cs = this.cards, l = cs.length; return l ? cs[l - 1] : null; },
  get secondToLastCard() { const cs = this.cards; return cs.length > 1 ? cs[cs.length - 2] : null; },

  may_take_card: function(card) { throw "may_take_card not implemented!"; },

  // Implementations may assume the card is not from this pile (i.e. card.pile !== this).
  may_add_card: function(card) { throw "may_add_card not implemented!"; },

  // In generic code for hints etc it's easy to end up calling card.pile.may_add_card(card), i.e. trying to move a card onto the pile it's already on.  For most games this doesn't matter, since the combination of .may_take_card and .may_add_card will already prohibit such moves, but in Russian Solitaire and Yukon this isn't true (because you can move any face-up card).  So generic code should call this rather than the above.
  may_add_card_maybe_to_self: function(card) {
    return card.pile === this ? false : this.may_add_card(card);
  },

  // Should return an Action/ErrorMsg appropriate for the card being dropped on the pile.
  action_for_drop: function(card) {
    return this.may_add_card_maybe_to_self(card) ? new Move(card, this) : null;
  },

  surrounding: function() {
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
  },
  _surrounding: null,

  following: function() {
    if(this._following) return this._following;
    const ps = [];
    let p;
    for(p = this.next; p && p !== this; p = p.next) ps.push(p);
    if(!p) { // next/prev links have *not* been formed into a loop
      let fst = this;
      while(fst.prev) fst = fst.prev;
      for(p = fst; p !== this; p = p.next) ps.push(p);
    }
    return this._following = ps;
  },
  _following: null,

  add_cards_from_array: function(cards, do_not_update_view) {
    const cs = this.cards, num = cards.length;
    for(var i = 0, j = cs.length; i !== num; ++i, ++j) {
      var c = cards[i];
      c.index = j;
      c.pile = this;
      cs[j] = c;
    }
    if(!do_not_update_view) this.view.update();
  },

  // Add the passed card and all other cards of higher .index from the same pile.
  add_cards: function(card, do_not_update_view) {
    const p = card.pile, pcs = p.cards, ix = card.index;
    this.add_cards_from_array(pcs.slice(ix), do_not_update_view);
    p.remove_cards_after(ix, do_not_update_view);
  },

  // Should generally not be called except by pile impls.
  remove_cards_after: function(index, do_not_update_view) {
    this.cards = this.cards.slice(0, index);
    if(!do_not_update_view) this.view.update();
  },

  action_for_click: function(card) {
    return card ? gCurrentGame.best_action_for(card) : null;
  },

  // Return an array of cards to consider moving when computing hints.
  hint_sources: function() {
    for(let c of this.cards) if(c.pile.may_take_card(c)) return [c];
    return [];
  },
};


function mayTakeSingleCard(card) { return card.isLast && card.faceUp; }

function ifLast(card) { return card.isLast; }


const _Stock = {
  __proto__: Pile,
  is_stock: true,
  is_drop_target: false,
  may_take_card: _ => false,
  may_add_card: _ => false,

  deal_card_to: function(destination) {
    const card = this.lastCard;
    card.faceUp = true;
    destination.add_cards(card);
  },

  undeal_card_from: function(source) {
    const card = source.lastCard;
    card.faceUp = false;
    this.add_cards(card);
  },

  action_for_click: function(card) {
    return this.deal();
  },

  // The Layout mouse-handling code wants a Card as the target of the event. So we provide a stub object that just lets it get from there to the pile to call action_for_click.
  _stubCard: null,
  get magicStockStubCard() {
    return this._stubCard || (this._stubCard = { pile: this });
  }
};

const StockDealToWaste = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPile(gCurrentGame.waste) : null;
  }
};

const StockDealToWasteOrRefill = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPile(gCurrentGame.waste) : new RefillStock();
  }
};

const Deal3OrRefillStock = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new Deal3Action() : new RefillStock();
  }
};

const StockDealToFoundation = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPile(gCurrentGame.foundation) : null;
  }
};

const StockDealToPiles = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPiles(gCurrentGame.piles) : null;
  },
  get counter() {
    return Math.ceil(this.cards.length / gCurrentGame.piles.length);
  }
};

const StockDealToPilesIfNoneAreEmpty = {
  __proto__: StockDealToPiles,
  deal: function() {
    if(!this.hasCards) return null;
    const ps = gCurrentGame.piles, num = ps.length;
    for(var i = 0; i !== num; ++i) if(!ps[i].hasCards) return null;
    return new DealToPiles(ps);
  }
};

const StockDealToNonemptyPiles = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToNonEmptyPilesAction() : null;
  }
};


const Waste = {
  __proto__: Pile,
  is_waste: true,
  is_drop_target: false,
  may_take_card: ifLast,
  may_add_card: _ => false,

  // Things to make draw3 waste piles work
  deal3v: 0, // The number of cards that should have been visible after the last deal.
  deal3t: 0  // The number of cards on this pile after the last deal.
};


const Cell = {
  __proto__: Pile,
  is_cell: true,
  may_take_card: _ => true,
  may_add_card: function(card) {
    return !this.hasCards && card.isLast;
  },
};


const Reserve = {
  __proto__: Pile,
  is_reserve: true,
  is_drop_target: false,
  may_take_card: mayTakeSingleCard,
  may_add_card: _ => false,
};


function may_take_descending_alt_colour(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(let i = card.index; i !== num - 1; ++i) if(!is_next_and_alt_colour(cs[i + 1], cs[i])) return false;
  return true;
}

function mayTakeDescendingRun(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].number !== cs[j].number + 1) return false;
  return true;
}

function mayTakeRunningFlush(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].suit !== cs[j].suit || cs[i].number !== cs[j].number + 1) return false;
  return true;
}

function mayAddToGypsyPile(card) {
  const last = this.lastCard;
  return !last || (last.colour !== card.colour && last.number === card.number + 1);
}

function mayAddOntoUpNumberOrEmpty(card) {
  return !this.hasCards || this.lastCard.number === card.number + 1;
}


const AcesUpPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeSingleCard,
  may_add_card: function(card) {
    return card.isLast && !this.hasCards;
  },
};

const FanPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeSingleCard,
  may_add_card: function(card) {
    return this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13;
  },
};

const _FreeCellPile = {
  __proto__: Pile,
  // may_add_card returns 0 to mean "legal, but not enough cells+spaces to do the move"
  action_for_drop: function(card) {
    const may = this.may_add_card_maybe_to_self(card);
    if(may) return new Move(card, this);
    return may === 0 ? new ErrorMsg("There are not enough free cells and/or spaces to do that.", "Click to continue playing") : null;
  },
};

const GypsyPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: may_take_descending_alt_colour,
  may_add_card: mayAddToGypsyPile,
};

const KlondikePile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: card => card.faceUp,
  may_add_card: function(card) {
    return this.hasCards ? is_next_and_alt_colour(card, this.lastCard) : card.number === 13;
  },
};

const WaspPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: card => card.faceUp,
  may_add_card: function(card) {
    return !this.hasCards || is_next_in_suit(card, this.lastCard);
  },
  hint_sources: function() {
    return [for(c of this.cards) if(c.faceUp) c];
  },
};

const KlondikeFoundation = {
  __proto__: Pile,
  is_foundation: true,
  may_take_card: ifLast,
  may_add_card: function(card) {
    return card.isLast && (this.hasCards ? is_next_in_suit(this.lastCard, card) : card.number === 1);
  },
};

const UpDownMod13Foundation = {
  __proto__: Pile,
  is_foundation: true,
  may_take_card: _ => false,
  may_add_card: function(card) {
    return is_up_or_down_mod13(card, this.lastCard);
  },
};
