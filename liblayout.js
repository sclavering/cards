function createPileLayout(tagName, layout) {
  if(!layout) throw "createPileLayout called with layout=" + layout;
  const l = document.createElement(layout._tagName || tagName);
  l.offset = 0;
  extendObj(l, layout, true);
  if(layout.initLayout) l.initLayout();
  return l;
}


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
  isCard: false, // read as "is card *view*"
  isAnyPile: true,

  // Passed the index of a card in the pile or the length of the pile (i.e. the index of
  // the next card to be added to the pile).  Should return the pixel offset from the
  // top-left corner of the pile.
  getCardOffsets: function(ix) { return { x: 0, y: 0 }; },

  // Called when the contents of a pile have changed and thus the view needs fixing.
  // An index of i means that cards 0->i are unchanged, but from i upward cards may have
  // been added or removed.
  // When dragging some cards around they are *not* removed from the original pile, only hidden
  // from view.  This is done by passing a lastIx value: no card at index >= to that should be
  // shown.  Ordinarily lastIx == pile.cards.length
  update: function(index, lastIx) {
    throw "_Layout.update not overridden!";
  },

  // Attach this view to a Pile
  displayPile: function(pile) {
    this.pile = pile;
    this.update(0, pile.cards.length);
  },

  // replace with a function if needed
  initLayout: null,

  // Get the position + dimensions for a box that covers the card and any subsequent cards.
  // If the card is null then it should instead be a box highlighting the pile itself.
  // Coords are relative to top-left corner of the boxObject for this layout
  getHighlightBounds: function(card) {
    var x = 0, y = 0, w = gCardWidth, h = gCardHeight;
    if(card) {
      var o = this.getCardOffsets(card.index);
      x = o.x;
      y = o.y;
      var o2 = this.getCardOffsets(card.pile.cards.length - 1);
      w += o2.x - x;
      h += o2.y - y;
    }
    return { x: x, y: y, width: w, height: h };
  }
};


// A _Layout where only the top card is ever visible
const Layout = {
  __proto__: _Layout,
  initLayout: function() {
    this.appendChild(createCardView(null, 0, 0));
  },
  
  update: function(index, lastIx) {
    this.firstChild.update(lastIx ? this.pile.lastCard : null);
  }
};


const FanDownLayout = {
  __proto__: _Layout,

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes;
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

  getCardOffsets: function(ix) {
    const y = ix * (this.offset || gVFanOffset);
    return { x: 0, y: y };
  }
};


const FanRightLayout = {
  __proto__: _Layout,

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) this.appendChild(createCardView(cs[i], i * gHFanOffset, 0));
    for(; i < kids.length; ++i) kids[i].update(null);
  },

  getCardOffsets: function(ix) {
    return { x: ix * gHFanOffset, y: 0 };
  }
};


// this really needs modifying to allow for more than 6 cards!
const SlideLayout = {
  __proto__: _Layout,

  className: "slide",
  
  initLayout: function() {
    for(var i = 0; i != 6; ++i) appendNewCardView(this, null, i * gSlideOffset, i * gSlideOffset);
  },

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes;
    for(var i = index; i < 5 && i < num; ++i) kids[i].update(cs[i]);
    for(; i < 5; ++i) kids[i].update(null);
    kids[5].update(index >= 5 ? cs[num - 1] : null);
  },

  getCardOffsets: function(ix) {
    const offset = (ix > 6 ? 6 : ix) * gSlideOffset;
    return { x: offset, y: offset };
  }
};


const _Deal3WasteLayout = {
  __proto__: _Layout,
  _isHorizontal: false,
  
  initLayout: function() {
    const h = this._isHorizontal, ho = h * gHFanOffset, vo = !h * gVFanOffset;
    for(var i = 0; i != 3; ++i) appendNewCardView(this, null, i * ho, i * vo);
  },

  update: function(index, lastIx) {
    const p = this.pile, v = p.deal3v, t = p.deal3t, cs = p.cards, kids = this.childNodes;
    const visible = Math.max(1, v - (t - lastIx));
    const ixOffset = cs.length - visible;
    for(var i = 0; i != 3; ++i) kids[i].update(cs[ixOffset + i] || null);
  },

  // this assumes only the last card will ever be asked about
  // (which will be when it's the subject of a hint)
  getCardOffsets: function(ix) {
    for(var i = 2; i >= 0; --i) {
      if(this.childNodes[i].cardModel) break;
    }
    const x = i * gHFanOffset;
    return { x: x, y: 0 };
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

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx;
    this._c0.update(num > 1 ? cs[num - 2] : (num ? cs[num - 1] : null));
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getCardOffsets: function(ix) {
    const x = ix > 0 ? gVFanOffset : 0;
    return { x: x, y: 0 };
  }
};


const _SpiderFoundationLayout = {
  __proto__: _Layout,

  // only one A->K run will be added, but many may be removed (e.g. when clearing a game)
  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes, vindex = index / 13;
    if(index == num) { // an A->K run has been 
      for(var j = vindex; j != kids.length; ++j) kids[j].update(null);
    } else if(vindex < kids.length) { // an A->K run has been added
      dump("vindex: "+vindex+"\n");
      kids[vindex].update(cs[index]);
    } else { // an A->K run has been added, and we need a new view
      appendNewCardView(this, cs[index], 0, vindex * gVFanOffset);
    }
  },

  getCardOffsets: function(ix) {
    const y = ix / 13 * gVFanOffset;
    return { x: 0, y: y };
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
const UnionSquarePileLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare",

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx;
    this._c0.update(num ? cs[0] : null);
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getCardOffsets: function(ix) {
    const x = ix > 0 ? gHFanOffset : 0;
    return { x: x, y: 0 };
  }
};


// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundationLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare-f",

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx;
    this._c0.update(cs.length > 13 ? cs[12] : (cs.length ? cs[0] : null));
    this._c1.update(cs.length > 13 ? cs[num - 1] : null);
  },

  getCardOffsets: function(ix) {
    const x = ix >= 13 ? gHFanOffset : 0;
    return { x: x, y: 0 };
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
  },

  displayPile: function(pile) {
    this._cardview.stockModel = this.pile = pile;
    this.update(0, pile.cards.length);
  },

  update: function(index, lastIx) {
    this._cardview.className = lastIx ? "card facedown" : "stock-placeholder";
    this._counterlabel.setAttribute("value", this.pile.counterValue);
  }
};
