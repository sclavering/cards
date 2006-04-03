function createPile(type, impl, layout) {
  if(!impl) throw "createPile called with impl=" + impl;
  if(!layout) throw "createPile called with layout=" + layout;

  const p = document.createElement(type);
  p.offset = 0; // why?
  for(var m in impl) {
    var getter = impl.__lookupGetter__(m);
    if(getter) p.__defineGetter__(m, getter);
    else p[m] = impl[m];
  }
  // add any methods+getters not provided by |impl|
  for(m in layout) {
    if(m in impl) throw "createPile: layout has property '" + m + "' which was already provided by impl";
    getter = layout.__lookupGetter__(m);
    if(getter) p.__defineGetter__(m, getter);
    else p[m] = layout[m];
  }
  p.source = p;
  return p;
}


const Pile = {
  // exactly one of these will be set true
  isFoundation: false,
  isCell: false,
  isReserve: false,
  isStock: false,
  isWaste: false,
  isPile: false,

  // the pile itself, except for gFloatingPile, where it's a pointer to the pile from which the
  // cards originally came.
  source: null,

  // previous and next pile of the same type
  // BaseCardGame.buildLayout() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },
  getActionForDrop: function(card) { throw "getActionForDrop() not implemented"; },

  // the sourrounding piles
  get surrounding() {
    delete this.surrounding; // so we can replace the getter with an ordinary property
    var ps = this.surrounding = [];
    var prev = this.prev, next = this.next;
    while(prev && next) {
      ps.push(next); ps.push(prev);
      next = next.next; prev = prev.prev;
    }
    while(next) { ps.push(next); next = next.next; }
    while(prev) { ps.push(prev); prev = prev.prev; }
    return ps;
  },

  // future replacement for the nasty DOM-based addCards() (which comes from Layout, or a subtype)
  addCardsFromArray: function(cards) {
//    dump("addCardsFromArray: (" + cards.length+") " +cards+"\n");
    for(var i = 0; i != cards.length; ++i) this.addCard(cards[i]);
  }
};


function yes() { return true; }

function no() { return false; }

function mayTakeSingleCard(card) {
  return !card.nextSibling && card.faceUp;
}




const PyramidPileBase = {
  __proto__: Pile,

  className: "pyramid-pile", // xxx kill this

  // set in games' init()s
  leftParent: null,
  rightParent: null,
  leftChild: null,
  rightChild: null,

  get free() {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasChildNodes() && !rc.hasChildNodes());
  }
};



const BasicStock = {
  __proto__: Pile,
  isStock: true,
  mayTakeCard: no,
  mayAddCard: no,

  dealCardTo: function(destination) {
    const card = this.lastChild;
    card.faceUp = true;
    card.updateView();
    destination.addCards(card);
  },

  undealCardFrom: function(source) {
    const card = source.lastChild;
    card.faceUp = false;
    card.updateView();
    this.addCards(card);
  },

  get counterStart() {
    return this.childNodes.length;
  }
};

const StockDealToWaste = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new DealToPile(Game.waste) : null;
  }
};

const StockDealToWasteOrRefill = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new DealToPile(Game.waste) : new RefillStock();
  }
};

const Deal3OrRefillStock = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new Deal3Action() : new RefillStock();
  }
};

const StockDealToFoundation = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new DealToPile(Game.foundation) : null;
  }
};

const StockDealToPiles = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new DealToPiles(Game.piles) : null;
  },
  get counterStart() {
    return Math.ceil(this.childNodes.length / Game.piles.length);
  }
};

const StockDealToPilesIfNoneAreEmpty = {
  __proto__: StockDealToPiles,
  deal: function() {
    if(!this.hasChildNodes()) return null;
    const ps = Game.piles, num = ps.length;
    for(var i = 0; i != num; ++i) if(!ps[i].hasChildNodes()) return null;
    return new DealToPiles(ps);
  }
};

const StockDealToNonemptyPiles = {
  __proto__: BasicStock,
  deal: function() {
    return this.hasChildNodes() ? new DealToNonEmptyPilesAction() : null;
  }
};


const Waste = {
  __proto__: Pile,
  isWaste: true,
  mayTakeCard: function(card) { return !card.nextSibling; },
  mayAddCard: no
};


const Cell = {
  __proto__: Pile,
  isCell: true,
  mayTakeCard: yes,
  mayAddCard: function(card) {
    return !this.hasChildNodes() && !card.nextSibling;
  }
};


const Reserve = {
  __proto__: Pile,
  isReserve: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: no
};


function mayTakeFromFreeCellPile(card) {
  if(!card.faceUp) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.colour==next.colour || card.number!=next.upNumber) return false;
  return true;
}

function mayTakeIfFaceUp(card) {
  return card.faceUp;
}

function mayTakeDescendingRun(card) {
  if(!card.faceUp) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.number!=next.upNumber) return false;
  return true;
}

function mayTakeRunningFlush(card) {
  if(!card.faceUp) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.suit!=next.suit || card.number!=next.upNumber) return false;
  return true;
}

function mayAddToGypsyPile(card) {
  const last = this.lastChild;
  return !last || (last.colour!=card.colour && last.number==card.upNumber);
}

function mayAddToKlondikePile(card) {
  const last = this.lastChild;
  return last ? last.number==card.upNumber && last.colour!=card.colour : card.isKing;
}

function mayAddSingleCardToEmpty(card) {
  return !card.nextSibling && !this.hasChildNodes();
}

function mayAddOntoDotUpOrEmpty(card) {
  return !this.hasChildNodes() || this.lastChild==card.up;
}

function mayAddOntoUpNumberOrEmpty(card) {
  return !this.hasChildNodes() || this.lastChild.number==card.upNumber;
}

function mayAddOntoDotUpOrPutKingInSpace(card) {
  return this.hasChildNodes() ? card.up == this.lastChild : card.isKing;
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
    var last = this.lastChild;
    if(last && (card.suit!=last.suit || card.upNumber!=last.number)) return false;

    // check there are enough spaces to perform the move

    if(!card.nextSibling) return true;

    var canMove = Game.countEmptyPiles(this, card.parentNode.source);
    if(canMove) canMove = canMove * (canMove + 1) / 2;
    canMove++;

    var toMove = 0;
    for(var next = card; next; next = next.nextSibling) toMove++;

    return (toMove <= canMove) ? true : 0;
  }
};

const FreeCellPile = {
  __proto__: Pile,
  isPile: true,

  mayTakeCard: mayTakeFromFreeCellPile,

  mayAddCard: function(card) {
    var last = this.lastChild;
    if(last && (last.colour==card.colour || last.number!=card.upNumber)) return false

    // check there are enough cells+spaces to perform the move

    if(!card.nextSibling) return true;

    var spaces = Game.countEmptyPiles(this, card.parentNode.source);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    var canMove = (Game.numEmptyCells + 1) * (spaces + 1);
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    return (numToMove <= canMove) ? true : 0;
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
    if(this.hasChildNodes()) return false;
    var prev = this.prev.lastChild, next = this.next.lastChild;
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
    return !this.hasChildNodes() && (card.number==2 ? !lp : card.down.parentNode==lp);
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
    const num = card.number;
    while((card = card.nextSibling)) if(card.number!=num) return false;
    return true;
  },
  // May put a card/group in a space, or on another card of the same number.
  // No more than 4 cards may ever be in any single pile.
  mayAddCard: function(card) {
    const last = this.lastChild;
    if(last && last.number!=card.number) return false;
    var num = 1;
    while((card = card.nextSibling)) ++num;
    return (this.childNodes.length + num) <= 4;
  }
};

const SpiderPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoUpNumberOrEmpty
};

const TowersPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    var last = this.lastChild;
    if(last ? last != card.up : !card.isKing) return false;
    // check if there are enough cells to perform the move
    var toMove = 0;
    for(var next = card; next; next = next.nextSibling) toMove++;
    return (toMove <= 1 + Game.numEmptyCells) ? true : 0;
  }
};

const TriPeaksPile = {
  __proto__: PyramidPileBase,
  isPeak: false,
  isPile: true,
  // like Golf
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: no
};

const UnionSquarePile = {
  __proto__: Pile,

  isPile: true,

  mayTakeCard: function(card) {
    return !card.nextSibling;
  },

  // Piles built up or down in suit, but not both ways at once.
  mayAddCard: function(card) {
    if(!this.hasChildNodes()) return true;
    var last = this.lastChild;
    if(last.suit != card.suit) return false;
    if(this.direction==1) return last.upNumber==card.number;
    if(this.direction==-1) return last.number==card.upNumber;
    return last.number==card.upNumber || last.upNumber==card.number;
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
    const lst = this.lastChild;
    return !lst || lst==card.up || lst==card.on;
  }
};


function mayAddCardToKlondikeFoundation(card) {
  const last = this.lastChild;
  return !card.nextSibling && (last ? last.suit==card.suit && last.upNumber==card.number : card.isAce);
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
  mayTakeCard: function(card) { return !card.nextSibling; }
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
    const l = this.lastChild;
    return l.number==card.upNumber || card.number==l.upNumber;
  }
};

const SpiderFoundation = {
  __proto__: NoWorryingBackFoundation,

  // This is typically only used for drag+drop (not autoplay), so needn't be optimal.
  // (For classic Spider it duplicates much of the work of pile.mayTakeCard(..).)
  mayAddCard: function(card) {
    const sibs = card.parentNode.childNodes, i = sibs.length - 13;
    if(i < 0 || sibs[i]!=card) return false;
    const suit = card.suit; var num;
    do { num = card.number; card = card.nextSibling; }
    while(card && card.suit==suit && num==card.upNumber);
    return !card; // all cards should be part of the run
  }
};


const AcesUpFoundation = {
  __proto__: NoWorryingBackFoundation,
  mayAddCard: function(card) {
    const ps = Game.piles;
    for(var i = 0; i != 4; i++) {
      var top = ps[i].lastChild;
      if(top==card) top = top.previousSibling; // only relevant when |card| was middle-clicked
      if(top && card.suit==top.suit && card.number<top.number) return true;
    }
    return false;
  }
};

// built A,A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundation = {
  __proto__: WorryingBackFoundation,

  mayAddCard: function(card) {
    if(card.nextSibling) return false;
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    var last = this.lastChild, prv = last.previousSibling;
    return prv==last.twin ? card.down==last || card.down==prv : card.twin==last;
  }
};

const Mod3Foundation = {
  __proto__: Pile,

  isFoundation: true,

  mayTakeCard: function(card) {
    return !card.nextSibling;
  },

  mayAddCard: function(card) {
    if(card.parentNode == this) return false;
    const last = this.lastChild;
    return last ? last.inPlace && (card.down==last || card.twin.down==last)
                : !card.down && card.row==this.row;
  }
};

// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  mayAddCard: function(card) {
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    const last = this.lastChild, pos = this.childNodes.length;
    if(last.suit != card.suit) return false;
    if(pos < 13) return last.upNumber==card.number;
    if(pos > 13) return last.number==card.upNumber;
    return card.isKing;
  }
};
