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

  // the index in Game.piles/Game.foundations/etc. at which this pile appears
  index: -1,

  // Controls whether cards can *ever* be dropped onto this pile
  // (mayAddCard will still be called if true)
  canDrop: true,

  // cards: [], // actually happens in createPile, so that each pile has a different array
  get hasCards() { return this.cards.length != 0; },

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
  // BaseCardGame.buildLayout() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  // Should return an Action/ErrorMsg appropriate for the card being dropped on the pile.
  getActionForDrop: function(card) {
    const act = this.mayAddCard(card) ? new Move(card, this) : null;
    if(this.isFoundation && act) Game.setPreferredFoundationSuit(card, this); // xxx ick!!
    return act;
  },

  // the sourrounding piles
  get surrounding() {
    const ps = [];
    var prev = this.prev, next = this.next;
    while(prev && next) {
      ps.push(next); ps.push(prev);
      next = next.next; prev = prev.prev;
    }
    while(next) { ps.push(next); next = next.next; }
    while(prev) { ps.push(prev); prev = prev.prev; }
    return overrideGetter(this, "surrounding", ps);
  },

  get following() {
    const ps = [];
    for(var p = this.next; p && p != this; p = p.next) ps.push(p);
    if(!p) { // next/prev links have *not* been formed into a loop
      for(var fst = this; fst.prev; fst = fst.prev);
      for(p = fst; p != this; p = p.next) ps.push(p);
    }
    return overrideGetter(this, "following", ps);
  },

  addCardsFromArray: function(cards) {
    const cs = this.cards, num = cards.length, j0 = cs.length;
    for(var i = 0, j = j0; i != num; ++i, ++j) {
      var c = cards[i];
      c.index = j;
      c.pile = this;
      cs[j] = c;
    }
    this.updateView(j0);
  },

  // arg is a card within another pile's .cards array.
  // should add it and all cards with higher index
  addCards: function(card) {
    const p = card.pile, pcs = p.cards, ix = card.index;
    this.addCardsFromArray(pcs.slice(ix));
    p.removeCardsAfter(ix);
  },

  // Should generally not be called except by pile impls.
  removeCardsAfter: function(index) {
    this.cards = this.cards.slice(0, index);
    this.updateView(index);
  },

  updateView: function(index) {
    this.view.update(index, this.cards.length);
  },

  // card may be null if the pile is empty
  getClickAction: function(card) {
    return card ? Game.getBestActionFor(card) : null;
  }
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

  get counterValue() {
    return this.cards.length;
  },

  getClickAction: function(card) {
    return this.deal();
  }
};

const StockDealToWaste = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPile(Game.waste) : null;
  }
};

const StockDealToWasteOrRefill = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPile(Game.waste) : new RefillStock();
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
    return this.hasCards ? new DealToPile(Game.foundation) : null;
  }
};

const StockDealToPiles = {
  __proto__: _Stock,
  deal: function() {
    return this.hasCards ? new DealToPiles(Game.piles) : null;
  },
  get counterValue() {
    return Math.ceil(this.cards.length / Game.piles.length);
  }
};

const StockDealToPilesIfNoneAreEmpty = {
  __proto__: StockDealToPiles,
  deal: function() {
    if(!this.hasCards) return null;
    const ps = Game.piles, num = ps.length;
    for(var i = 0; i != num; ++i) if(!ps[i].hasCards) return null;
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

const PyramidWaste = {
  __proto__: Waste,
  canDrop: true,
  getActionForDrop: function(card) {
    const c = this.lastCard;
    return c && card.number + c.number == 13 ? new RemovePair(card, c) : null;
  }
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
  for(var i = card.index, j = i + 1; j != num; ++i, ++j) 
    if(cs[i].colour == cs[j].colour || cs[i].number != cs[j].upNumber) return false;
  return true;
}

function mayTakeIfFaceUp(card) {
  return card.faceUp;
}

function mayTakeDescendingRun(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j != num; ++i, ++j) 
    if(cs[i].number != cs[j].upNumber) return false;
  return true;
}

function mayTakeRunningFlush(card) {
  if(!card.faceUp) return false;
  const cs = card.pile.cards, num = cs.length;
  for(var i = card.index, j = i + 1; j != num; ++i, ++j) 
    if(cs[i].suit != cs[j].suit || cs[i].number != cs[j].upNumber) return false;
  return true;
}

function mayAddToGypsyPile(card) {
  const last = this.lastCard;
  return !last || (last.colour!=card.colour && last.number==card.upNumber);
}

function mayAddToKlondikePile(card) {
  const last = this.lastCard;
  return last ? last.number==card.upNumber && last.colour!=card.colour : card.isKing;
}

function mayAddSingleCardToEmpty(card) {
  return card.isLast && !this.hasCards;
}

function mayAddOntoDotUpOrEmpty(card) {
  return !this.hasCards || this.lastCard == card.up;
}

function mayAddOntoUpNumberOrEmpty(card) {
  return !this.hasCards || this.lastCard.number == card.upNumber;
}

function mayAddOntoDotUpOrPutKingInSpace(card) {
  return this.hasCards ? card.up == this.lastCard : card.isKing;
}



const AcesUpPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: mayAddSingleCardToEmpty
};

const BlackWidowPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeDescendingRun,
  mayAddCard: mayAddOntoUpNumberOrEmpty
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
  mayAddCard: mayAddOntoDotUpOrPutKingInSpace
};

const FortyThievesPile = {
  __proto__: Pile,
  isPile: true,

  mayTakeCard: mayTakeRunningFlush,

  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last && (card.suit!=last.suit || card.upNumber!=last.number)) return false;

    // check there are enough spaces to perform the move

    if(card.isLast) return true;

    var canMove = Game.countEmptyPiles(this, card.pile);
    if(canMove) canMove = canMove * (canMove + 1) / 2;
    canMove++;

    const toMove = card.pile.cards.length - card.index;
    return toMove <= canMove ? true : 0;
  }
};

const _FreeCellPile = {
  __proto__: Pile,
  // mayAddCard returns 0 to mean "legal, but not enough cells+spaces to do the move"
  getActionForDrop: function(card) {
    const may = this.mayAddCard(card);
    if(may) return new Move(card, this);
    return may === 0 ? new ErrorMsg("notEnoughSpaces") : null;
  }
};

const FreeCellPile = {
  __proto__: _FreeCellPile,
  isPile: true,

  mayTakeCard: mayTakeFromFreeCellPile,

  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last && (last.colour==card.colour || last.number!=card.upNumber)) return false

    // check there are enough cells+spaces to perform the move

    if(card.isLast) return true;

    var spaces = Game.countEmptyPiles(this, card.pile);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    var canMove = (Game.numEmptyCells + 1) * (spaces + 1);
    const toMove = card.pile.cards.length - card.index;
    return toMove <= canMove ? true : 0;
  }
};

const GolfPile = {
  __proto__: Pile,
  isPile: true,
  // don't allow drag_drop because it's slower than just clicking the cards
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: no
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

const MazePile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    if(this.hasCards) return false;
    var prev = this.prev.lastCard, next = this.next.lastCard;
    return (card.isQueen && next && next.isAce)
        || (card.isAce && prev && prev.isQueen)
        || (prev && prev==card.down)
        || (next && next==card.up);
  }
};

const MontanaPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    const lp = this.leftp;
    return !this.hasCards && (card.number == 2 ? !lp : card.down.pile == lp);
  }
};

const PenguinPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoDotUpOrPutKingInSpace
};

const PileOnPile = {
  __proto__: Pile,
  isPile: true,
  className: "fan-right pileon",
  // May move any group of cards all of the same rank.
  mayTakeCard: function(card) {
    const num = card.number, cs = card.pile.cards, len = cs.length;
    for(var i = card.index + 1; i != len; ++i) if(cs[i].number != num) return false;
    return true;
  },
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  mayAddCard: function(card) {
    const last = this.lastCard;
    if(last && last.number!=card.number) return false;
    const numCards = card.pile.cards.length - card.index;
    return this.cards.length + numCards <= 4;
  }
};

const _PyramidPile = { // used by TriPeaks too
  __proto__: Pile,
  isPile: true,

  // set in games' init()s
  leftParent: null,
  rightParent: null,
  leftChild: null,
  rightChild: null,

  mayAddCard: no
};

const PyramidPile = {
  __proto__: _PyramidPile,
  mayTakeCard: function(card) {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasCards && !rc.hasCards);
  },
  getActionForDrop: function(card) {
    const c = this.firstCard;
    if(!c || card.number + c.number != 13) return null;
    const l = this.leftChild, lc = l && l.firstCard;
    const r = this.rightChild, rc = r && r.firstCard;
    // can move if the only card covering this is the card being dragged
    // (which remains part of its source pile during dragging)
    return !l || ((!lc || lc == card) && (!rc || rc == card)) ? new RemovePair(card, c) : null;
  }
};

const RegimentPile = {
  __proto__: Pile,
  isPile: true,
  reserve: null,

  mayTakeCard: mayTakeSingleCard,

  mayAddCard: function(card) {
    // piles are built up or down (or both) within suit
    const l = this.lastCard;
    if(l) return card.suit == l.suit && (l.number == card.upNumber || card.number == l.upNumber);

    // empty piles must be filled from the closest reserve pile
    const source = card.pile;
    if(!source.isReserve) return false;

    const reserve = this.reserve;
    if(reserve == source) return true;

    if(reserve.hasCards) return false;

    var prev = reserve.prev, prevDist = 1;
    while(prev && !prev.hasCards && prev!=source) prev = prev.prev, prevDist++;
    var next = reserve.next, nextDist = 1;
    while(next && !next.hasCards && next!=source) next = next.next, nextDist++;

    // if trying to move from a reserve to the right
    if(source.col > this.col) return next==source && (!prev || prevDist>=nextDist);
    return prev==source && (!next || nextDist>=prevDist);
  }
};

const SpiderPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoUpNumberOrEmpty
};

const TowersPile = {
  __proto__: _FreeCellPile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last ? last != card.up : !card.isKing) return false;
    const toMove = card.pile.cards.length - card.index;
    return toMove <= 1 + Game.numEmptyCells ? true : 0;
  }
};

const TriPeaksPile = {
  __proto__: _PyramidPile,
  mayTakeCard: no
};

const UnionSquarePile = {
  __proto__: Pile,

  isPile: true,

  mayTakeCard: ifLast,

  // Piles built up or down in suit, but not both ways at once.
  mayAddCard: function(card) {
    const cs = this.cards, num = cs.length, last = this.lastCard;
    if(!last) return true;
    if(last.suit != card.suit) return false;
    if(num == 1) return last.number == card.upNumber || last.upNumber == card.number;
    return cs[0].number == cs[1].upNumber // going down?
        ? last.number == card.upNumber
        : last.upNumber == card.number;
  }
};

const WaspPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddOntoDotUpOrEmpty
};

const WhiteheadPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    const lst = this.lastCard;
    return !lst || lst==card.up || lst==card.on;
  }
};


function mayAddCardToKlondikeFoundation(card) {
  const last = this.lastCard;
  return card.isLast && (last ? last.suit==card.suit && last.upNumber==card.number : card.isAce);
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
    return l.number==card.upNumber || card.number==l.upNumber;
  }
};

const SpiderFoundation = {
  __proto__: NoWorryingBackFoundation,

  // This is typically only used for drag+drop (not autoplay), so needn't be optimal.
  // (For classic Spider it duplicates much of the work of pile.mayTakeCard(..).)
  mayAddCard: function(card) {
    const cs = card.pile.cards, len = cs.length, suit = card.suit;
    if(card.index != len - 13) return false;
    for(var i = card.index, j = i + 1; j != len; ++i, ++j)
      if(cs[i].suit != cs[j].suit || cs[i].number != cs[j].upNumber) return false;
    return true;
  }
};

const AcesUpFoundation = {
  __proto__: NoWorryingBackFoundation,
  mayAddCard: function(card) {
    const suit = card.suit, num = card.number, src = card.pile;
    var c = src.getCard(-2); // the card beneath |card|
    if(c && suit == c.suit && num < c.number) return true;
    const ps = src.following;
    for(var i = 0; i != 3; ++i) {
      var c = ps[i].lastCard;
      if(c && suit == c.suit && num < c.number) return true;
    }
    return false;
  }
};

// built A,A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundation = {
  __proto__: WorryingBackFoundation,

  mayAddCard: function(card) {
    if(!card.isLast) return false;
    if(!this.hasCards) return card.isAce && !card.twin.pile.isFoundation;
    const last = this.getCard(-1), prv = this.getCard(-2);
    return prv==last.twin ? card.down==last || card.down==prv : card.twin==last;
  }
};

const Mod3Foundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    if(card.pile == this) return false;
    const last = this.lastCard;
    return last ? last.inPlace && (card.down==last || card.twin.down==last)
                : !card.down && card.row==this.row;
  }
};

const PyramidFoundation = {
  __proto__: NoWorryingBackFoundation,
  getActionForDrop: function(card) {
    return card.isKing ? new RemovePair(card, null) : null;
  },
  mayAddCard: no
};

const RegimentAceFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    const last = this.lastCard, twin = card.twin;
    // must not start a second ace foundation for a suit
    if(card.isAce) return !last && !(twin.pile.isFoundation && twin.isFirst);
    return last && card.number == last.upNumber && card.suit == last.suit;
  }
};

const RegimentKingFoundation = {
  __proto__: WorryingBackFoundation,
  mayAddCard: function(card) {
    const last = this.lastCard, twin = card.twin;
    if(card.isKing) return !last && !(twin.pile.isFoundation && twin.isFirst);
    return last && last.number == card.upNumber && card.suit == last.suit;
  }
};

// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    if(!this.hasCards) return card.isAce && !card.twin.pile.isFoundation;
    const last = this.lastCard, pos = this.cards.length;
    if(last.suit != card.suit) return false;
    if(pos < 13) return last.upNumber==card.number;
    if(pos > 13) return last.number==card.upNumber;
    return card.isKing;
  }
};
