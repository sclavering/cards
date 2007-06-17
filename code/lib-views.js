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
var gSlideExtraSpace = 10;

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
    this._canvas.width = gCardWidth;
    this._canvas.height = 0; // changed values clears the canvas
    this._canvas.height = gCardHeight;
    const card = lastIndex ? this.pile.cards[lastIndex - 1] : null;
    if(card) this._context.drawImage(card.image, 0, 0);
//     else this._context.drawImage(gPileImg, 0, 0);
  },

  getTargetCard: function(event) {
    return this.pile.lastCard;
  }
};

function range(N) {
  for(var i = 0; i < N; ++i) yield i;
}

const _FanView = {
  __proto__: _CanvasView,
  // Pixel offsets between cards used during the last update() call.
  // Needed by getTargetCard().
  _hOffset: 0,
  _vOffset: 0,
  // For the default _getLayoutOffsets.  Views would override one or both.
  _basicVOffset: 0,
  _basicHOffset: 0,

  update: function(index, lastIx) {
    const box = this.boxObject;
    this._canvas.width = box.width;
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = box.height;
    const ixs = this.getVisibleCardIndexes(lastIx), num = ixs.length;
    const off = this._getLayoutOffsets(box.width, box.height, num);
    // use an int offset where possible to avoid fuzzy card borders
    const h = this._hOffset = off[0] < 1 ? off[0] : Math.floor(off[0]);
    const v = this._vOffset = off[1] < 1 ? off[1] : Math.floor(off[1]);
    const cs = this.pile.cards;
    for(var i = 0; i != num; ++i)
      this._context.drawImage(cs[ixs[i]].image, h * i, v * i);
  },

  // See _View.update for meaning of lastIx.
  // This exists to allow games to show a subset of the cards in a pile.
  getVisibleCardIndexes: function(ix) {
    return [i for(i in range(ix))];
  },

  // xxx this may not work right.  it's written to work for the animation-
  // destination case, not the hint-highlighting case.
  getCardOffsets: function(ix) {
    // what would be shown if that ix existed?
    const ixs = this.getVisibleCardIndexes(ix + 1);
    var visualIx = ixs.indexOf(ix);
    return { x: visualIx * this._hOffset, y: visualIx * this._vOffset };
  },

  getTargetCard: function(event) {
    const cs = this.pile.cards;
    const ixs = this.getVisibleCardIndexes(cs.length);
    const visualIx = this._getTargetCardVisualIndex(event, ixs.length);
    return visualIx != -1 ? cs[ixs[visualIx]] : null;
  },

  // handles only purely-horizontal or purely-vertical fans
  _getTargetCardVisualIndex: function(event, numVisible) {
    var pos, offset, cardsize;
    if(this._hOffset) {
      pos = event.pageX - this._canvas.offsetLeft;
      offset = this._hOffset;
      cardsize = gCardHeight;
    } else {
      pos = event.pageY - this._canvas.offsetTop;
      offset = this._vOffset;
      cardsize = gCardWidth;
    }
    const ix = Math.floor(pos / offset);
    const last = numVisible - 1;
    if(ix <= last) return ix;
    return pos < last * offset + cardsize ? last : -1;
  },

  // Given the pixel width and height of the pile view (usually set by either
  // explicit CSS sizes or by using XUL flex) and the number of cards being
  // shown in the pile, return a [horizontal, vertical] pair of pixel offsets.
  _getLayoutOffsets: function(width, height, num) {
    var h = this._basicHOffset, v = this._basicVOffset;
    if(num <= 1) return [h, v]; // avoid NaN in the next bit
    h = Math.min((width - gCardWidth) / (num - 1), h);
    v = Math.min((height - gCardHeight) / (num - 1), v);
    return [h, v];
  }
};

const FanDownView = {
  __proto__: _FanView,
  _basicVOffset: gVFanOffset
}

const FanRightView = {
  __proto__: _FanView,
  _basicHOffset: gHFanOffset
};

const PileOnView = {
  __proto__: FanRightView,
  className: "pileon pile"
};

// this really needs modifying to allow for more than 6 cards!
const SlideView = {
  __proto__: _FanView,
  className: "pile slide",
  _basicHOffset: gSlideOffset,
  _basicVOffset: gSlideOffset,
  // Only used in mod3, where this simple version is adequate.
  getTargetCard: function(event) {
    return this.pile.lastCard;
  }
};

const _Deal3WasteView = {
  __proto__: _FanView,

  getVisibleCardIndexes: function(lastIx) {
    const first = this.pile.deal3t - this.pile.deal3v;
    if(!lastIx) return [];
    if(lastIx <= first) return [lastIx - 1]; // gone below the latest 3
    return [first + i for(i in range(lastIx - first))];
  }
};

const Deal3HWasteView = {
  __proto__: _Deal3WasteView,
  className: "pile draw3h-waste",
  _basicHOffset: gHFanOffset
};

const Deal3VWasteView = {
  __proto__: _Deal3WasteView,
  _basicVOffset: gVFanOffset
};

const _TwoFanView = {
  __proto__: FanRightView,
  className: "pile hfan2",
  getVisibleCardIndexes: function(lastIx) {
    const ixs = this._getTwoCardIndicesToShow(lastIx);
    const res = [];
    if(cs[ixs[0]]) res.push(ixs[0]);
    if(cs[ixs[1]]) res.push(ixs[1]);
    return res;
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
    this._canvas.height = 0; // changed value clears the canvas
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
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = gCardHeight;
    if(lastIx) this._context.drawImage(images.facedowncard, 0, 0);
    this._counterlabel.setAttribute("value", this.pile.counterValue);
  }
};
