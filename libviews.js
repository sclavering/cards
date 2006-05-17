function createPileView(viewType) {
  const view = document.createElement(viewType._tagName);
  view.offset = 0; // xxx ?
  extendObj(view, viewType, true);
  if(viewType.initView) view.initView();
  return view;
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
  this.cardIndex = card ? card.index : -1;
}
function createCardView(card, x, y) {
  const v = document.createElement("image");
  v.top = v._top = y;
  v.left = v._left = x;
  v.update = cardView_update;
  v.update(card);
  return v;
}
function appendNewCardView(pile, card, x, y) {
  return pile.appendChild(createCardView(card, x, y));
}

const _View = {
  // these are used in the drag+drop code and similar places, to see what an element is
  isPileView: true,

  // override if desired
  _tagName: "stack",
  className: "pile",

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
    throw "_View.update not overridden!";
  },

  // Attach this view to a Pile
  displayPile: function(pile) {
    this.pile = pile;
    this.update(0, pile.cards.length);
  },

  // replace with a function if needed
  initView: null,

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
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    const t = event.target;
    return t == this ? null : this.pile.cards[t.cardIndex];
  }
};

// A _View where only the top card is ever visible
const View = {
  __proto__: _View,
  initView: function() {
    appendNewCardView(this, null, 0, 0);
  },
  
  update: function(index, lastIx) {
    this.firstChild.update(lastIx ? this.pile.cards[lastIx - 1] : null);
  },

  getTargetCard: function(event) {
    return this.pile.lastCard;
  }
};

const FanDownView = {
  __proto__: _View,

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes;
    const oldoffset = this.offset || gVFanOffset;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) appendNewCardView(this, cs[i], 0, i * oldoffset);
    for(; i < kids.length; ++i) kids[i].update(null);
  
    // the fixView of old
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

const FanRightView = {
  __proto__: _View,

  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) appendNewCardView(this, cs[i], i * gHFanOffset, 0);
    for(; i < kids.length; ++i) kids[i].update(null);
  },

  getCardOffsets: function(ix) {
    return { x: ix * gHFanOffset, y: 0 };
  }
};

const PileOnView = {
  __proto__: FanRightView,
  className: "pileon pile"
};

// this really needs modifying to allow for more than 6 cards!
const SlideView = {
  __proto__: _View,

  className: "pile slide",
  
  initView: function() {
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

const _Deal3WasteView = {
  __proto__: _View,
  _isHorizontal: false,
  
  initView: function() {
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
      if(this.childNodes[i].cardIndex != -1) break;
    }
    const x = i * gHFanOffset;
    return { x: x, y: 0 };
  }
};

const Deal3HWasteView = {
  __proto__: _Deal3WasteView,
  className: "pile draw3h-waste",
  _isHorizontal: true
};

const Deal3VWasteView = _Deal3WasteView;

const _TwoFanView = {
  __proto__: _View,
  _c0: null,
  _c1: null,
  initView: function() {
    this._c0 = appendNewCardView(this, null, 0, 0);
    this._c1 = appendNewCardView(this, null, gHFanOffset, 0);
  }
};

// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationView = {
  __proto__: _TwoFanView,

  className: "pile doublesol-foundation",

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

const _SpiderFoundationView = {
  __proto__: _View,

  // only one A->K run will be added, but many may be removed (e.g. when clearing a game)
  update: function(index, lastIx) {
    const cs = this.pile.cards, num = lastIx, kids = this.childNodes, vindex = index / 13;
    if(index == num) { // an A->K run has been 
      for(var j = vindex; j != kids.length; ++j) kids[j].update(null);
    } else if(vindex < kids.length) { // an A->K run has been added
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

const Spider4FoundationView = {
  __proto__: _SpiderFoundationView,
  className: "pile foundation4"
};

const Spider8FoundationView = {
  __proto__: _SpiderFoundationView,
  className: "pile foundation8"
};

// bottom + top cards visible, so you can tell whether pile is being built up or down
const UnionSquarePileView = {
  __proto__: _TwoFanView,

  className: "pile unionsquare",

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
const UnionSquareFoundationView = {
  __proto__: _TwoFanView,

  className: "pile unionsquare-f",

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
const StockView = {
  __proto__: View,
  _tagName: "vbox",
  initView: function() {
    this._cardview = appendNewCardView(this, null, 0, 0);
    this.appendChild(document.createElement("space"));
    this._counterlabel = this.appendChild(document.createElement("label"));
    this._counterlabel.className = "stockcounter";
  },

  update: function(index, lastIx) {
    this._cardview.className = lastIx ? "card facedown" : "stock-placeholder";
    this._counterlabel.setAttribute("value", this.pile.counterValue);
  }
};
