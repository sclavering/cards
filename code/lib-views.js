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
var gCardHeight = 96;
var gCardWidth = 71;

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

  // Return an {x:,y:} obj giving pixel offset from top-left corner for where
  // an animation for adding cards should finish at.
  getAddedCardOffsets: function(card) {
    return this.getCardOffsets(this.pile.cards.length);
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    const t = event.target;
    return t == this ? null : this.pile.cards[t.cardIndex];
  }
};

// Uses <xul:box><html:canvas/></xul:box> to draw.  The box is because other
// code expects a .boxObject of views, and to allow control of whether the
// canvas should be stretched or not.
const _CanvasView = {
  __proto__: _View,
  _tagName: "vbox",

  initView: function() {
    const HTMLns = "http://www.w3.org/1999/xhtml";
    this._canvas = document.createElementNS(HTMLns, "canvas");
    this.appendChild(this._canvas);
    this._context = this._canvas.getContext("2d");
  },

  // _View's version would just fail with a cryptic warning.
  getTargetCard: function(event) {
    throw "getTargetCard not implemented for a canvas-based view";
  }
}

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _CanvasView,

  update: function(index, lastIndex) {
    // setting the size also clears the canvas
    this._canvas.width = gCardWidth;
    this._canvas.height = gCardHeight;
    const card = lastIndex ? this.pile.cards[lastIndex - 1] : null;
    if(card) this._context.drawImage(card.image, 0, 0);
//     else this._context.drawImage(gPileImg, 0, 0);
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
    const offset = this.offset = Math.min(space / cs.length, gVFanOffset);
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
  __proto__: _CanvasView,

  className: "pile hfan2",

  _numShowing: 0, // num cards visible, needed when dealing with events

  update: function(index, lastIndex) {
    // setting dimensions clears it
    this._canvas.width = gCardWidth + gHFanOffset;
    this._canvas.height = gCardHeight;
    const ixs = this._getTwoCardIndicesToShow(lastIndex);
    const cs = this.pile.cards, l = ixs[0], r = ixs[1];
    if(cs[l]) this._context.drawImage(cs[l].image, 0, 0);
    if(cs[r]) this._context.drawImage(cs[r].image, gHFanOffset, 0);
    this._numShowing = cs[l] ? (cs[r] ? 2 : 1) : 0;
  },

  getCardOffsets: function(ix) {
    // ask for ixs to show *as if any extra cards had alread been added*
    const ixs = this._getTwoCardIndicesToShow(ix + 1);
    const x = ixs[1] != -1 && ix >= ixs[1] ? 1 : 0;
    return { x: x * gHFanOffset, y: 0 };
  },

  getTargetCard: function(event) {
    const x = event.pageX - this._canvas.offsetLeft;
    var vIx = -1; // ix in the *visible* list
    switch(this._numShowing) {
      case 2: vIx = x > gHFanOffset ? 1 : 0; break;
      case 1: vIx = x < gCardWidth ? 0 : -1; break;
    }
    // convert to real ix, and thence to a Card
    if(vIx == -1) return null;
    const cs = this.pile.cards, ixs = this._getTwoCardIndicesToShow(cs.length);
    return cs[ixs[vIx]] || null; // the null guards agains an ix of -1
  },

  // Should return a 2-element array of indices into this.cards (-1 for blank).
  // 'num' is the number of cards in the stack, though like _View.update's
  // lastIndex arg, it may lie if cards from this pile are mid-drag.
  _getTwoCardIndicesToShow: function(num) {
    throw "_getTwoCardIndicesToShow needs implementing when extending _TwoFanView";
  }
};

// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationView = {
  __proto__: _TwoFanView,

  _getTwoCardIndicesToShow: function(num) {
    if(num > 1) return [num - 2, num - 1];
    return [0, -1];
  }
};

const _SpiderFoundationView = {
  __proto__: _CanvasView,
  _maxNum: 4, // override with the max number of cards to be shown

  // only one A->K run will be added, but many may be removed (e.g. when clearing a game)
  update: function(index, lastIx) {
    this._canvas.width = gCardWidth;
    this._canvas.height = gCardHeight + gVFanOffset * (this._maxNum - 1);
    const cs = this.pile.cards;
    for(var i = 0, c = 12; c <= lastIx; ++i, c += 13)
      this._context.drawImage(cs[c].image, 0, i * gVFanOffset);
  },

  getCardOffsets: function(ix) {
    const y = ix / 13 * gVFanOffset;
    return { x: 0, y: y };
  },

  // correct impl is not required by any of the games using this view
  getTargetCard: function(event) {
    return null;
  }
};

const Spider4FoundationView = {
  __proto__: _SpiderFoundationView,
  _maxNum: 4,
  className: "pile foundation4"
};

const Spider8FoundationView = {
  __proto__: _SpiderFoundationView,
  _maxNum: 8,
  className: "pile foundation8"
};

// bottom + top cards visible, so you can tell whether pile is being built up or down
const UnionSquarePileView = {
  __proto__: _TwoFanView,

  _getTwoCardIndicesToShow: function(num) {
    return [num ? 0 : -1, num > 1 ? num - 1 : -1];
  }
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
const UnionSquareFoundationView = {
  __proto__: _TwoFanView,

  _getTwoCardIndicesToShow: function(num) {
    if(num > 13) return [12, num - 1];
    return [num - 1, -1];
  }
};

// a layout for Stocks, including a counter
const StockView = {
  __proto__: View,

  initView: function() {
    StockView.__proto__.initView.apply(this);
    this.appendChild(document.createElement("space"));
    this._counterlabel = this.appendChild(document.createElement("label"));
    this._counterlabel.className = "stockcounter";
  },

  update: function(index, lastIx) {
    this._canvas.width = gCardWidth;
    this._canvas.height = gCardHeight;
    if(lastIx) this._context.drawImage(images.facedowncard, 0, 0);
    this._counterlabel.setAttribute("value", this.pile.counterValue);
  }
};
