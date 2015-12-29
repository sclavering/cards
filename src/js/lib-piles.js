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
  get numCards() { return this.cards.length; },

  // lots of code used firstChild/lastChild -- these are for compatibility.
  // may be removed, long term
  get firstCard() { const cs = this.cards; return cs.length ? cs[0] : null; },
  get lastCard() { const cs = this.cards, l = cs.length; return l ? cs[l - 1] : null; },
  
  getCard: function(ix) {
    const cs = this.cards, len = cs.length;
    if(ix >= 0) return ix < len ? cs[ix] : null;
    ix = len + ix;
    return ix >= 0 ? cs[ix] : null;
  },

  // previous and next pile of the same type
  // Game.buildLayout() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  // Note that this *must* handle the case of card.pile === this
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  // Should return an Action/ErrorMsg appropriate for the card being dropped on the pile.
  getActionForDrop: function(card) {
    return this.mayAddCard(card) ? new Move(card, this) : null;
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
    for(let c of this.cards) if(c.mayTake) return [c];
    return [];
  },
};


function yes() { return true; }

function no() { return false; }

function mayTakeSingleCard(card) { return card.isLast && card.faceUp; }

function ifLast(card) { return card.isLast; }


const _Stock = {
  __proto__: Pile,
  isStock: true,
  canDrop: false,
  mayTakeCard: no,
  mayAddCard: no,

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
  mayAddCard: no,

  // Things to make draw3 waste piles work
  deal3v: 0, // The number of cards that should have been visible after the last deal.
  deal3t: 0  // The number of cards on this pile after the last deal.
};


const Cell = {
  __proto__: Pile,
  isCell: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    return !this.hasCards && card.isLast;
  }
};


const Reserve = {
  __proto__: Pile,
  isReserve: true,
  canDrop: false,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: no
};


function mayTakeFromFreeCellPile(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j !== num; ++i, ++j) 
    if(cs[i].colour === cs[j].colour || cs[i].number !== cs[j].upNumber) return false;
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
  if(card.pile === this) return false; // Gypsy and Canfield don't need this, but Yukon does
  const last = this.lastCard;
  return !last || (last.colour !== card.colour && last.number === card.upNumber);
}

function mayAddToKlondikePile(card) {
  const last = this.lastCard;
  return last ? last.number === card.upNumber && last.colour !== card.colour : card.isKing;
}

function mayAddSingleCardToEmpty(card) {
  return card.isLast && !this.hasCards;
}

function mayAddOntoDotUpOrEmpty(card) {
  return !this.hasCards || (card.pile !== this && this.lastCard === card.up);
}

function mayAddOntoUpNumberOrEmpty(card) {
  return !this.hasCards || (card.pile !== this && this.lastCard.number === card.upNumber);
}

function mayAddOntoNextUpInSuitOrPutKingInSpace(card) {
  const last = this.lastCard;
  return last ? (card.pile !== this && card.suit === last.suit && card.number + 1 === last.number) : card.isKing;
}

function mayAddOntoDotUpOrPutKingInSpace(card) {
  return this.hasCards ? (card.pile !== this && card.up === this.lastCard) : card.isKing;
}



const AcesUpPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: mayAddSingleCardToEmpty
};

const CanfieldPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddToGypsyPile
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
    const may = this.mayAddCard(card);
    if(may) return new Move(card, this);
    return may === 0 ? new ErrorMsg("There are not enough free cells and/or spaces to do that.", "Click to continue playing") : null;
  }
};

const GypsyPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeFromFreeCellPile,
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
  mayAddCard: mayAddOntoDotUpOrEmpty,
  getHintSources: function() {
    return [for(c of this.cards) if(c.faceUp) c];
  }
};


function mayAddCardToKlondikeFoundation(card) {
  const last = this.lastCard;
  return card.isLast && (last ? last.suit === card.suit && last.upNumber === card.number : card.isAce);
}

const NoWorryingBackFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: no
};

// "worrying back" is what removing cards from the foundation is called
const WorryingBackFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: ifLast
};

const KlondikeFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: mayAddCardToKlondikeFoundation
};

const FanFoundation = {
  __proto__: NoWorryingBackFoundation,
  mayAddCard: mayAddCardToKlondikeFoundation
};

const GolfFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    const l = this.lastCard;
    return l.number === card.upNumber || card.number === l.upNumber;
  }
};
