function createPile(impl) {
  return { __proto__: impl, cards: [] };
}

const Pile = {
  // exactly one of these will be set true
  isFoundation: false,
  isCell: false,
  isReserve: false,
  isStock: false,
  isWaste: false,
  isPile: false,

  // the index in gCurrentGame.piles/gCurrentGame.foundations/etc. at which this pile appears
  index: -1,

  // An integer that may be displayed below the pile.
  get counter() {
    return this.cards.length;
  },

  // Controls whether cards can *ever* be dropped onto this pile
  // (mayAddCard will still be called if true)
  canDrop: true,

  // cards: [], // actually happens in createPile, so that each pile has a different array
  get hasCards() { return this.cards.length !== 0; },

  get firstCard() { const cs = this.cards; return cs.length ? cs[0] : null; },
  get lastCard() { const cs = this.cards, l = cs.length; return l ? cs[l - 1] : null; },
  get secondToLastCard() { const cs = this.cards; return cs.length > 1 ? cs[cs.length - 2] : null; },

  // previous and next pile of the same type
  // Game.buildLayout() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },

  // Implementations may assume the card is not from this pile (i.e. card.pile !== this).
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  // In generic code for hints etc it's easy to end up calling card.pile.mayAddCard(card), i.e. trying to move a card onto the pile it's already on.  For most games this doesn't matter, since the combination of .mayTakeCard and .mayAddCard will already prohibit such moves, but in Russian Solitaire and Yukon this isn't true (because you can move any face-up card).  So generic code should call this rather than the above.
  mayAddCardMaybeToSelf: function(card) {
    return card.pile === this ? false : this.mayAddCard(card);
  },

  // Should return an Action/ErrorMsg appropriate for the card being dropped on the pile.
  getActionForDrop: function(card) {
    return this.mayAddCardMaybeToSelf(card) ? new Move(card, this) : null;
  },

  // the sourrounding piles
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

  addCardsFromArray: function(cards, doNotUpdateView) {
    const cs = this.cards, num = cards.length;
    for(var i = 0, j = cs.length; i !== num; ++i, ++j) {
      var c = cards[i];
      c.index = j;
      c.pile = this;
      cs[j] = c;
    }
    if(!doNotUpdateView) this.view.update();
  },

  // arg is a card within another pile's .cards array.
  // should add it and all cards with higher index
  addCards: function(card, doNotUpdateView) {
    const p = card.pile, pcs = p.cards, ix = card.index;
    this.addCardsFromArray(pcs.slice(ix), doNotUpdateView);
    p.removeCardsAfter(ix, doNotUpdateView);
  },

  // Should generally not be called except by pile impls.
  removeCardsAfter: function(index, doNotUpdateView) {
    this.cards = this.cards.slice(0, index);
    if(!doNotUpdateView) this.view.update();
  },

  // card may be null if the pile is empty
  getClickAction: function(card) {
    return card ? gCurrentGame.best_action_for(card) : null;
  },

  // Return an array of cards to consider moving when computing hints
  getHintSources: function() {
    for(let c of this.cards) if(c.pile.mayTakeCard(c)) return [c];
    return [];
  },
};


function mayTakeSingleCard(card) { return card.isLast && card.faceUp; }

function ifLast(card) { return card.isLast; }


const _Stock = {
  __proto__: Pile,
  isStock: true,
  canDrop: false,
  mayTakeCard: () => false,
  mayAddCard: () => false,

  dealCardTo: function(destination) {
    const card = this.lastCard;
    card.faceUp = true;
    destination.addCards(card);
  },

  undealCardFrom: function(source) {
    const card = source.lastCard;
    card.faceUp = false;
    this.addCards(card);
  },

  getClickAction: function(card) {
    return this.deal();
  },

  // The Layout mouse-handling code wants a Card as the target of the event. So
  // we provide a stub object that just lets it get from there to the pile to
  // call getClickAction.
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
  isWaste: true,
  canDrop: false,
  mayTakeCard: ifLast,
  mayAddCard: () => false,

  // Things to make draw3 waste piles work
  deal3v: 0, // The number of cards that should have been visible after the last deal.
  deal3t: 0  // The number of cards on this pile after the last deal.
};


const Cell = {
  __proto__: Pile,
  isCell: true,
  mayTakeCard: () => true,
  mayAddCard: function(card) {
    return !this.hasCards && card.isLast;
  }
};


const Reserve = {
  __proto__: Pile,
  isReserve: true,
  canDrop: false,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: () => false,
};


function may_take_descending_alt_colour(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(let i = card.index; i !== num - 1; ++i) if(!is_next_and_alt_colour(cs[i + 1], cs[i])) return false;
  return true;
}

function mayTakeIfFaceUp(card) {
  return card.faceUp;
}

function mayTakeDescendingRun(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].number !== cs[j].upNumber) return false;
  return true;
}

function mayTakeRunningFlush(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].suit !== cs[j].suit || cs[i].number !== cs[j].upNumber) return false;
  return true;
}

function mayAddToGypsyPile(card) {
  const last = this.lastCard;
  return !last || (last.colour !== card.colour && last.number === card.upNumber);
}

function mayAddToKlondikePile(card) {
  const last = this.lastCard;
  return last ? last.number === card.upNumber && last.colour !== card.colour : card.number === 13;
}

function mayAddSingleCardToEmpty(card) {
  return card.isLast && !this.hasCards;
}

function mayAddOntoUpNumberOrEmpty(card) {
  return !this.hasCards || (card.pile !== this && this.lastCard.number === card.upNumber);
}

function mayAddOntoNextUpInSuitOrPutKingInSpace(card) {
  const last = this.lastCard;
  return last ? (card.pile !== this && card.suit === last.suit && card.number + 1 === last.number) : card.number === 13;
}


const AcesUpPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: mayAddSingleCardToEmpty
};

const FanPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: mayAddOntoNextUpInSuitOrPutKingInSpace
};

const _FreeCellPile = {
  __proto__: Pile,
  // mayAddCard returns 0 to mean "legal, but not enough cells+spaces to do the move"
  getActionForDrop: function(card) {
    const may = this.mayAddCardMaybeToSelf(card);
    if(may) return new Move(card, this);
    return may === 0 ? new ErrorMsg("There are not enough free cells and/or spaces to do that.", "Click to continue playing") : null;
  }
};

const GypsyPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: may_take_descending_alt_colour,
  mayAddCard: mayAddToGypsyPile
};

const KlondikePile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddToKlondikePile
};

const WaspPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: function(card) {
    return !this.hasCards || is_next_in_suit(card, this.lastCard);
  },
  getHintSources: function() {
    return [for(c of this.cards) if(c.faceUp) c];
  }
};


function may_add_to_ascending_in_suit(card) {
  const last = this.lastCard;
  return card.isLast && (last ? last.suit === card.suit && last.upNumber === card.number : card.isAce);
}

const KlondikeFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: ifLast,
  mayAddCard: may_add_to_ascending_in_suit,
};

const FanFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: () => false,
  mayAddCard: may_add_to_ascending_in_suit,
};

const GolfFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: () => false,
  mayAddCard: function(card) {
    const l = this.lastCard;
    return l.number === card.upNumber || card.number === l.upNumber;
  }
};
