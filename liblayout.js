// xxx these just need to die (and be done in CSS)
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide

function getCardImageClass(card) {
  return "card " + (card.faceUp ? card.displayStr : "facedown");
}
function cardView_update(card) {
  this.className = card ? getCardImageClass(card) : "card hidden";
  // so the drag-drop code can work out what you're starting to drag
  this.cardModel = card;
}
function createCardView(card, x, y) {
  const v = document.createElement("image");
  v.isCard = true; // drag-drop depends on this
  v.isAnyPile = false;
  v.top = v._top = y;
  v.left = v._left = x;
  v.update = cardView_update;
  v.update(card);
  return v;
}
function appendNewCardView(pile, card, x, y) {
  return pile.appendChild(createCardView(card, x, y));
}

const _Layout = {
  // these are used in the drag+drop code and similar places, to see what an element is
  isCard: false,
  isAnyPile: true,

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  getNextCardX: function(pile) { return 0; },
  getNextCardY: function(pile) { return 0; },

  // Called when the contents of a pile have changed and thus the view needs fixing.
  // An index of i means that cards 0->i are unchanged, but from i upward cards may have
  // been added or removed.
  update: function(pile, index) {
    throw "_Layout.update not overridden!";
  },

  // replace with a function if needed
  initLayout: null,

  // should return the coords of the top-left corner of the card relative to the css-box for this view
  getCardX: function(card) { return 0; },
  getCardY: function(card) { return 0; }
};

// A _Layout where only the top card is ever visible
const Layout = {
  __proto__: _Layout,
  initLayout: function() {
    this._cardview = this.appendChild(createCardView(null, 0, 0));
  },
  
  update: function(pile, ix) {
    this._cardview.update(pile.lastCard);
  }
};


const FanDownLayout = {
  __proto__: _Layout,

  getNextCardY: function(pile) {
    return pile.cards.length * (this.offset || gVFanOffset);
  },

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    const oldoffset = this.offset || gVFanOffset;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) this.appendChild(createCardView(cs[i], 0, i * oldoffset));
    for(; i < kids.length; ++i) kids[i].update(null);
  
    // the fixLayout of old
    if(num == 0) { this.offset = 0; return; }
    const firstbox = this.firstChild.boxObject;
    const space = window.innerHeight - firstbox.y - firstbox.height;
    const offset = this.offset = Math.min(space / kids.length, gVFanOffset);
    for(var v = 0, top = 0; v != kids.length; ++v, top += offset) kids[v].top = kids[v]._top = top;
  },

  getCardY: function(card) { return card.index * (this.offset || gVFanOffset); }
};


const FanRightLayout = {
  __proto__: _Layout,

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) this.appendChild(createCardView(cs[i], i * gHFanOffset, 0));
    for(; i < kids.length; ++i) kids[i].update(null);
  },

  getNextCardX: function(pile) {
    return pile.cards.length * gHFanOffset;
  },

  getCardX: function(card) { return card.index * gHFanOffset; }
};


// this really needs modifying to allow for more than 6 cards!
const SlideLayout = {
  __proto__: _Layout,

  className: "slide",
  
  initLayout: function() {
    for(var i = 0; i != 6; ++i) appendNewCardView(this, null, i * gSlideOffset, i * gSlideOffset);
  },

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    for(var i = index; i < 5 && i < num; ++i) kids[i].update(cs[i]);
    for(; i < 5; ++i) kids[i].update(null);
    kids[5].update(index >= 5 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    const n = pile.cards.length;
    return (n > 6 ? 6 : n) * gSlideOffset;
  },
  getNextCardY: function(pile) {
    const n = pile.cards.length;
    return (n > 6 ? 6 : n) * gSlideOffset;
  }
};


const _Deal3WasteLayout = {
  __proto__: _Layout,
  _isHorizontal: false,
  
  initLayout: function() {
    const h = this._isHorizontal, ho = h * gHFanOffset, vo = !h * gVFanOffset;
    for(var i = 0; i != 3; ++i) appendNewCardView(this, null, i * ho, i * vo);
  },

  update: function(pile, index) {
    const v = pile.deal3v, t = pile.deal3t, cs = pile.cards, kids = this.childNodes;
    const visible = Math.max(1, v - (t - cs.length));
    const ixOffset = cs.length - visible;
    for(var i = 0; i != 3; ++i) kids[i].update(cs[ixOffset + i] || null);
  }
};

const Deal3HWasteLayout = {
  __proto__: _Deal3WasteLayout,
  className: "draw3h-waste",
  _isHorizontal: true
};

const Deal3VWasteLayout = _Deal3WasteLayout;


const _TwoFanLayout = {
  __proto__: _Layout,
  _c0: null,
  _c1: null,
  initLayout: function() {
    this._c0 = this.appendChild(createCardView(null, 0, 0));
    this._c1 = this.appendChild(createCardView(null, gHFanOffset, 0));
  }
};

// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationLayout = {
  __proto__: _TwoFanLayout,

  className: "doublesol-foundation",

  update: function(pile, ix) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(num > 1 ? cs[num - 2] : (num ? cs[num - 1] : null));
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.hasCards ? gVFanOffset : 0;
  }
};


const _SpiderFoundationLayout = {
  __proto__: _Layout,

  // only one A->K run will be added, but many may be removed (e.g. when clearing a game)
  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes, vindex = index / 13;
    if(index == num) { // an A->K run has been 
      for(var j = vindex; j != kids.length; ++j) kids[j].update(null);
    } else if(vindex < kids.length) { // an A->K run has been added
      dump("vindex: "+vindex+"\n");
      kids[vindex].update(cs[index]);
    } else { // an A->K run has been added, and we need a new view
      appendNewCardView(this, cs[index], 0, vindex * gVFanOffset);
    }
  },

  getNextCardY: function(pile) {
    return pile.cards.length / 13 * gVFanOffset;
  }
};

const Spider4FoundationLayout = {
  __proto__: _SpiderFoundationLayout,
  className: "foundation4"
};

const Spider8FoundationLayout = {
  __proto__: _SpiderFoundationLayout,
  className: "foundation8"
};


// bottom + top cards visible, so you can tell whether pile is being built up or down
// xxx this contains bits of the model
const UnionSquarePileLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare",

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(num ? cs[0] : null);
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.hasCards ? gHFanOffset : 0;
  }
};


// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundationLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare-f",

  update: function(pile, ix) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(cs.length > 13 ? cs[12] : (cs.length ? cs[0] : null));
    this._c1.update(cs.length > 13 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.cards.length >= 13 ? gHFanOffset : 0;
  }
};


// a layout for Stocks, including a counter
const StockLayout = {
  __proto__: Layout,
  _tagName: "vbox",
  initLayout: function() {
    this._cardview = appendNewCardView(this, null, 0, 0);
    this._cardview.isCard = false;
    this.appendChild(document.createElement("space"));
    this._counterlabel = this.appendChild(document.createElement("label"));
    this._counterlabel.className = "stockcounter";
    this._cardview.stockModel = this; // xxx should be the model, not this view
  },

  update: function(pile, ix) {
    this._cardview.className = pile.hasCards ? "card facedown" : "stock-placeholder";
    this._counterlabel.setAttribute("value", pile.counterValue);
  }
};
