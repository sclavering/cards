// xxx these need to become cardset dependent
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide


// two objects can be supplied to provide the methods + properties for the pile because layouts
// do not consistently appear with the same mayAddCard/mayTakeCard functions.
// |layout| may be null
function createPile(type, impl, layout) {
  if(!impl) throw "createPile called with impl="+impl;
  const p = document.createElement(type);
  p.offset = 0; // why?
  for(var m in impl) {
    var getter = impl.__lookupGetter__(m);
    if(getter) p.__defineGetter__(m, getter);
    else p[m] = impl[m];
  }
  // add any methods+getters not provided by |impl|
  if(layout) {
    for(m in layout) {
      if(m in impl) continue;
      getter = layout.__lookupGetter__(m);
      if(getter) p.__defineGetter__(m, getter);
      else p[m] = layout[m];
    }
  }
  p.source = p;
  return p;
}


// all piles get these
const BaseLayout = {
  isCard: false,
  isAnyPile: true,
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

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  nextCardLeft: 0,
  nextCardTop: 0,

  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  getActionForDrop: function(card) { throw "getActionForDrop() not implemented"; },

  // xxx this should be made a "private" function, implemented only by piles not overriding addCards
  addCard: function(card) {
    this.appendChild(card);
    card.top = card.left = card._top = card._left = 0;
  },

  fixLayout: function() {},

  // transfers the card and all those that follow it
  // Any replacement implementation *must* call first.parentNode's fixLayout() method
  addCards: function(first) {
    var next, card = first, source = first.parentNode.source;
    if(!this.offset) this.offset = source.offset;
    while(card) {
      next = card.nextSibling;
      this.addCard(card);
      card = next;
    }
    this.fixLayout();
    source.fixLayout();
  },

  dealTo: function(cards, down, up) {
    const num = down + up;
    for(var i = 0; i != num; i++) {
      var card = cards.pop();
      if(!card) continue;
      this.addCard(card);
      if(i>=down) card.setFaceUp();
    }
  },

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
  }
};


function addCardsKeepingTheirLayout(card) {
  var src = card.parentNode.source;
  var left = card._left, top = card._top - this.nextCardTop;
  for(var next = card.nextSibling; card; card = next) {
    next = card.nextSibling;
    this.appendChild(card);
    card.top = card._top -= top;
    card.left = card._left -= left;
  }
  // For gFloatingPile - avoids not-repainting artifacts after cards are removed
  var last = this.lastChild;
  this.width = last._left + last.boxObject.width;
  this.height = last._top + last.boxObject.height;
  src.fixLayout();
  this.fixLayout();
}


const FanDownLayout = {
  __proto__: BaseLayout,

  // doing this avoids the cards changing layout twice if they come from a packed fan and
  // this fan ends up packed (once to realyout using this.offset, then again with a new
  // offset once .fixLayout() is called)
  addCards: addCardsKeepingTheirLayout,

    get nextCardTop() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.offset || gVFanOffset);
    },

    fixLayout: function() {
      if(!this.hasChildNodes()) {
        this.offset = 0;
        return;
      }

      const firstbox = this.firstChild.boxObject;
      var space = window.innerHeight - firstbox.y - firstbox.height;
      const offset = Math.min(space / this.childNodes.length, gVFanOffset);
      var old = this.offset || gVFanOffset;
      this.offset = offset;
      var top = 0;
      var card = this.firstChild;
      while(card) {
        card.top = card._top = top;
        top += offset;
        card = card.nextSibling;
      }
    }
};

const FanRightLayout = {
  __proto__: BaseLayout,

    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.left = card._left = prev ? prev._left + gHFanOffset : 0;
      card.top = card._top = 0;
    },

    get nextCardLeft() {
      return this.hasChildNodes() ? this.lastChild._left + gHFanOffset : 0;
    }
};

// this really needs modifying to allow for more than 6 cards!
const SlideLayout = {
  __proto__: BaseLayout,

  className: "slide",

    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(!prev) {
        card.top = card.left = card._top = card._left = 0;
        return;
      }
      var offset = this.childNodes.length<6 ? gSlideOffset : 0;
      card.top = card._top = prev._top + offset
      card.left = card._left = prev._left + offset;
    },

    get nextCardLeft() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._left + (this.childNodes.length<6 ? gSlideOffset : 0);
    },

    get nextCardTop() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.childNodes.length<6 ? gSlideOffset : 0);
    }
};

const PyramidLayout = {
  __proto__: BaseLayout,
  className: "pyramid-pile",
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
  __proto__: BaseLayout,
  isStock: true,
  mayTakeCard: function(card) { return false; },
  mayAddCard: function(card) { return false; },

  dealCardTo: function(destination) {
    const card = this.lastChild;
    card.setFaceUp();
    destination.addCards(card);
  },

  undealCardFrom: function(source) {
    const card = source.lastChild;
    card.setFaceDown();
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
  isWaste: true,
  mayTakeCard: function(card) { return !card.nextSibling; },
  mayAddCard: function() { return false; }
};

const Deal3Waste = {
  __proto__: BaseLayout,

  isWaste: true,

  className: "draw3-waste",

  depth: 0, // used in positioning

  // only ever has to handle one card
  addCards: function(card) {
    const depth = ++this.depth;
    this.appendChild(card);
    card.top = card._top = 0;
    card.left = card._left = depth>0 ? depth * gHFanOffset : 0;
  },

  // only called after a card is removed from the waste pile
  fixLayout: function() {
    --this.depth;
  },

  mayTakeCard: function(card) { return !card.nextSibling; },

  mayAddCard: function(card) { return false; }
};



const Cell = {
  __proto__: BaseLayout,

  isCell: true,

  mayTakeCard: function(card) { return true; },

  mayAddCard: function(card) {
    return !this.hasChildNodes() && !card.nextSibling;
  }
};



const Reserve = {
  isReserve: true,
  mayTakeCard: function(card) { return !card.nextSibling; },
  mayAddCard: function(card) { return false; }
};



function mayTakeFromFreeCellPile(card) {
  if(card.faceDown) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.colour==next.colour || card.number!=next.upNumber) return false;
  return true;
}

function mayTakeIfFaceUp(card) {
  return card.faceUp;
}

function mayTakeSingleCard(card) {
  return !card.nextSibling && card.faceUp;
}

function mayTakeDescendingRun(card) {
  if(card.faceDown) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.number!=next.upNumber) return false;
  return true;
}

function mayTakeRunningFlush(card) {
  if(card.faceDown) return false;
  for(var next = card.nextSibling; next; card = next, next = next.nextSibling)
    if(card.suit!=next.suit || card.number!=next.upNumber) return false;
  return true;
}

// works fine in mod13 games (e.g. Demon)
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

const AcesUpPile = {
  __proto__: FanDownLayout,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: mayAddSingleCardToEmpty
};

const BlackWidowPile = {
  isPile: true,
  mayTakeCard: mayTakeDescendingRun,
  mayAddCard: mayAddOntoUpNumberOrEmpty
};

const FanPile = {
  __proto__: FanRightLayout,
  isPile: true,
  mayTakeCard: mayTakeSingleCard,
  mayAddCard: function(card) {
    return this.hasChildNodes ? this.lastChild==card.up : card.isKing;
  }
};

const FortyThievesPile = {
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
  isPile: true,
  // don't allow drag_drop because it's slower than just clicking the cards
  mayTakeCard: function(card) { return false; },
  mayAddCard: function(card) { return false; }
};

const GypsyPile = {
  isPile: true,
  mayTakeCard: mayTakeFromFreeCellPile,
  mayAddCard: mayAddToKlondikePile
};

const KlondikePile = {
  __proto__: FanDownLayout,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddToKlondikePile
};

const MazePile = {
  __proto__: BaseLayout,
  isPile: true,
  mayTakeCard: function(card) { return true; },

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
  __proto__: BaseLayout,
  isPile: true,
  mayTakeCard: function() { return true; },
  mayAddCard: function(card) {
    const lp = this.leftp;
    return !this.hasChildNodes() && (lp ? card.down.parentNode==lp : card.number==2);
  }
};

const PenguinPile = {
  __proto__: FanDownLayout,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    const last = this.lastChild;
    return last ? card.up==last : card.isKing;
  }
};

const PileOnPile = {
  __proto__: FanRightLayout,
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
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoUpNumberOrEmpty
};

const TowersPile = {
  __proto__: FanDownLayout,
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

const UnionSquarePile = {
  __proto__: BaseLayout,

  isPile: true,

  className: "unionsquare",

  // A record of whether the pile is being built up (1) or down (-1), or neither (0).
  direction: 0,

  // First and last card of a pile are visible (so player can see which way it's being built).
  addCards: function(card) {
    var src = card.parentNode;
    this.appendChild(card);
    const prv = card.previousSibling;
    card.top = card._top = 0;
    card.left = card._left = prv ? gHFanOffset : 0;
    if(this.childNodes.length==2)
      this.direction = card.number==prv.upNumber ? 1 : -1;
    src.fixLayout();
  },

  fixLayout: function() {
    if(this.childNodes.length==1) this.direction = 0;
  },

  get nextCardLeft() {
    return this.hasChildNodes() ? gHFanOffset : 0;
  },

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
  __proto__: FanDownLayout,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: mayAddOntoDotUpOrEmpty
};

const WhiteheadPile = {
  __proto__: FanDownLayout,
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
  __proto__: BaseLayout,
  isFoundation: true,
  mayTakeCard: function() { return false; }
};

// "worrying back" is what removing cards from the foundation is called
const WorryingBackFoundation = {
  __proto__: BaseLayout,
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

const BaseSpiderFoundation = {
  __proto__: NoWorryingBackFoundation,

  addCards: function(card) {
    var last = this.lastChild;
    var top = last ? last._top + gVFanOffset : 0;
    while(card) {
      var next = card.nextSibling;
      this.appendChild(card);
      card.top = card._top = top;
      card.left = card._left = 0;
      card = next;
    }
  },

  get nextCardTop() {
    return this.hasChildNodes() ? this.lastChild._top + gVFanOffset : 0;
  },

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

const Spider4Foundation = {
  __proto__: BaseSpiderFoundation,
  className: "foundation4"
};

const Spider8Foundation = {
  __proto__: BaseSpiderFoundation,
  className: "foundation8"
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

  className: "doublesol-foundation",

  addCards: function(card) {
    const l = this.lastChild;
    if(l) l.left = l._left = 0;
    while(card) {
      var nxt = card.nextSibling;
      this.appendChild(card);
      card.top = card.left = card._top = card._left = 0;
      card = nxt;
    }
    const n = this.lastChild;
    n.left = n._left = l ? gVFanOffset : 0;
    n.top = n._top = 0;
  },

  get nextCardLeft() {
    return this.hasChildNodes() ? gVFanOffset : 0;
  },

  fixLayout: function() {
    const l = this.lastChild;
    if(l) l.left = l._left = gVFanOffset;
  },

  mayAddCard: function(card) {
    if(card.nextSibling) return false;
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    var last = this.lastChild, prv = last.previousSibling;
    return prv==last.twin ? card.down==last || card.down==prv : card.twin==last;
  }
};

const Mod3Foundation = {
  __proto__: SlideLayout,

  isFoundation: true,

  mayTakeCard: function(card) {
    return !card.nextSibling;
  },

  mayAddCard: function(card) {
    if(card.parentNode == this) return false;
    var last = this.lastChild;
    return last ? last.inPlace && (card.down==last || card.twin.down==last) : !card.down && card.row==this.row;
  }
};

// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundation = {
  __proto__: NoWorryingBackFoundation,

  className: "unionsquare-f",

  addCards: function(card) {
    const src = card.parentNode;
    this.appendChild(card);
    card.top = card._top = 0;
    card.left = card._left = this.childNodes.length>13 ? gHFanOffset : 0;
    src.fixLayout();
  },

  get nextCardLeft() {
    return this.childNodes.length>=13 ? gHFanOffset : 0;
  },


  mayAddCard: function(card) {
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    const last = this.lastChild, pos = this.childNodes.length;
    if(last.suit != card.suit) return false;
    if(pos < 13) return last.upNumber==card.number;
    if(pos > 13) return last.number==card.upNumber;
    return card.isKing;
  }
};
