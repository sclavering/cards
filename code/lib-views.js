function createPileView(viewType) {
  const view =  { __proto__: viewType };
  view.initView();
  return view;
}

var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide
var gCardHeight = 96;
var gCardWidth = 71;
var gSlideExtraSpace = 10;


// This defines the interface expected of pile views, and also provides basic
// infrastructure for one based on <xul:box><html:canvas/></xul:box>. The box
// is used because other code used to expect a .boxObject, and to allow
// control of whether the canvas should be stretched or not.
const _View = {
  // The root XUL element for this view.  Must have .pileViewObj field set.
  element: null,

  // These will mask XULElement.boxObject.* vs HMTLElement.offset*
  get pixelLeft() { return this.element.boxObject.x; },
  get pixelTop() { return this.element.boxObject.y; },
  get pixelWidth() { return this.element.boxObject.width; },
  get pixelHeight() { return this.element.boxObject.height; },
  get pixelRight() { return this.pixelLeft + this.pixelWidth; },
  get pixelBottom() { return this.pixelTop + this.pixelHeight; },

  // override if desired
  className: "pile",
  _counter: null, // if set true, a <label> will be created and replace it

  // An array of Cards that are being displayed in the pile.
  // Either ==.pile.cards, or a prefix of it during drags or animations.
  // Note that some views will choose to show only a subset even of these.
  _cards: null,

  // Redraw the pile.  'card', if present, must be in the pile, and it and any
  // cards on top of it will not be shown.
  update: function(card) {
    const cs = this.pile.cards;
    this._cards = card ? cs.slice(0, card.index) : cs;
    this._update();
  },
  _update: function() {
    throw "_View._update not overridden!";
  },

  // Called when the user starts dragging 'card', or it's about to be moved
  // elsewhere with animation. Should update the view to hide it and the cards
  // after it, and draw them in gFloatingPile instead.
  updateForAnimationOrDrag: function(card) {
    throw "updateForAnimationOrDrag not implemented"
  },

  // Attach this view to a Pile
  displayPile: function(pile) {
    this.pile = pile;
    this.update();
  },

  highlightHintFrom: function(card) {
    // for the destination piles to use
    this.drawIntoFloatingPile(card);
    // shade the cards to be moved
    const bounds = card && this._getHighlightBounds(card.index, this.pile.numCards);
    const rect = bounds || { x: 0, y: 0, w: gCardWidth, h: gCardHeight };
    this._context.fillStyle = "darkgrey";
    this._context.globalAlpha = 0.3;
    this._context.fillRect(rect.x, rect.y, rect.w, rect.h);
  },

  highlightHintTo: function() {
    const numCards = this.pile.numCards;
    const rect = this._getHighlightBounds(numCards, numCards + 1);
    // Obscure the cards beneath a bit, since black stuff shows through a lot.
    if(numCards) {
      // area covered by existing cards
      const rect0 = this._getHighlightBounds(0, numCards);
      const overlapwidth = rect0.x + rect0.w - rect.x;
      const overlapheight = rect0.y + rect0.h - rect.y;
      // The ?1:2 stuff hides the final card's final (bottom/right) border
      const dim_h = overlapheight - (rect.y ? 1 : 2);
      const dim_w = overlapwidth  - (rect.x ? 1 : 2);
      this._context.globalAlpha = 0.9;
      this._context.fillStyle = "white";
      this._context.fillRect(rect.x + 1, rect.y + 1, dim_w, dim_h);
    }
    // Draw the cards
    this._context.globalAlpha = 0.4;
    this._context.drawImage(gFloatingPile.context.canvas, rect.x, rect.y);
  },

  // Get bounding-box in canvas-pixels of the card at index, assuming this pile
  // contains numCards cards.
  _getHighlightBounds: function(index, numCards) {
    return { x: 0, y: 0, w: gCardWidth, h: gCardHeight };
  },

  // Return relative CSS-pixel coords to start animated move of 'card' from.
  getAnimationOrigin: function(card) {
    return this._getCoordsForIndex(card.index);
  },

  // Return relative CSS-pixel coords for where an animated move should finish.
  getAnimationDestination: function() {
    return this._getCoordsForIndex(this.pile.cards.length);
  },

  _getCoordsForIndex: function(ix) {
    return { x: 0, y: 0 };
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    throw "getTargetCard not implemented for a canvas-based view";
  },

  initView: function() {
    const el = this.element = document.createElement("vbox");
    el.pileViewObj = this;
    el.className = this.className;
    const HTMLns = "http://www.w3.org/1999/xhtml";
    this._canvas = document.createElementNS(HTMLns, "canvas");
    el.appendChild(this._canvas);
    this._context = this._canvas.getContext("2d");
    if(this._counter) {
      this._counter = el.appendChild(document.createElement("label"));
      this._counter.className = "counter";
    }
  }
}

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _View,

  _update: function() {
    this._canvas.width = gCardWidth;
    this._canvas.height = 0; // changed values clears the canvas
    this._canvas.height = gCardHeight;
    const cs = this._cards, num = cs.length;
    if(num) this._context.drawImage(cs[num - 1].image, 0, 0);
    if(this._counter) this._counter.setAttribute("value", this.pile.counter);
  },

  updateForAnimationOrDrag: function(card) {
    this.drawIntoFloatingPile(card);
    gFloatingPile.showAt(this, 0, 0);
    this.update(card);
  },

  drawIntoFloatingPile: function(card) {
    gFloatingPile.sizeCanvas(gCardWidth, gCardHeight);
    gFloatingPile.context.drawImage(card.image, 0, 0);
  },

  getTargetCard: function(event) {
    return this.pile.lastCard;
  }
};

// Used for Waste piles and single foundations
const CountedView = {
  __proto__: View,
  _counter: true
}


function range(N) {
  for(var i = 0; i < N; ++i) yield i;
}

const _FanView = {
  __proto__: _View,
  // Horizontal and vertical canvas-pixel offsets between cards
  _hOffset: 0,
  _vOffset: 0,

  _update: function() {
    this._canvas.width = this.pixelWidth;
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = this.pixelHeight;
    const cs = this._cards, max = cs.length;
    const ixs = this.getVisibleCardIndexes(max), num = ixs.length;
    this._updateOffsets(num - 1);
    const h = this._hOffset, v = this._vOffset;
    for(var i = 0; i != num; ++i)
      this._context.drawImage(cs[ixs[i]].image, h * i, v * i);
    if(this._counter) this._counter.setAttribute("value", this.pile.counter);
  },

  updateForAnimationOrDrag: function(card) {
    const first = this.drawIntoFloatingPile(card);
    gFloatingPile.showAt(this, first * this._hOffset, first * this._vOffset);
    this.update(card);
  },

  drawIntoFloatingPile: function(card) {
    const cs = this.pile.cards;
    const ixs = this.getVisibleCardIndexes(cs.length), inum = ixs.length;
    const first = ixs.indexOf(card.index);
    const h = this._hOffset, v = this._vOffset;
    const numFloating = inum - first;
    const extras = numFloating - 1;
    const width = extras * h + gCardWidth, height = extras * v + gCardHeight;
    gFloatingPile.sizeCanvas(width, height);
    for(var i = 0, j = first; i < numFloating; ++i, ++j)
      gFloatingPile.context.drawImage(cs[ixs[j]].image, h * i, v * i);
    return first;
  },

  _getHighlightBounds: function(index, numCards) {
    const ixs = this.getVisibleCardIndexes(numCards);
    const vIx = ixs.indexOf(index);
    const num = ixs.pop() - vIx; // num cards to be highlighted
    const h = this._hOffset, v = this._vOffset;
    return { x: h * vIx, y: v * vIx, w: h * num + gCardWidth, h: v * num + gCardHeight };
  },

  // This exists to allow games to show a subset of the cards in a pile.
  // 'ix' is like the 'max' of View.update
  getVisibleCardIndexes: function(ix) {
    return [i for(i in range(ix))];
  },

  _getCoordsForIndex: function(ix) {
    const ixs = this.getVisibleCardIndexes(ix + 1);
    const visualIx = ixs.indexOf(ix);
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

  _basicVOffset: 0,
  _basicHOffset: 0,

  // change offsets to allow num+1 cards to fit in the space
  _updateOffsets: function(num) {
    var h = this._basicHOffset, v = this._basicVOffset;
    if(num > 0) { // avoid divide by zero
      h = Math.min((this.pixelWidth - gCardWidth) / num, h);
      v = Math.min((this.pixelHeight - gCardHeight) / num, v);
      // use integer offset where possible to avoid fuzzyness
      if(h > 1) h = Math.floor(h);
      if(v > 1) v = Math.floor(v)
    }
    this._hOffset = h;
    this._vOffset = v;
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

// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationView = {
  __proto__: FanRightView,
  className: "pile hfan2",
  getVisibleCardIndexes: function(num) {
    if(num >= 2) return [num - 2, num - 1];
    return num ? [num - 1] : [];
  }
};

const _SpiderFoundationView = {
  __proto__: FanDownView,
  getVisibleCardIndexes: function(lastIx) {
    const ixs = [], cs = this.pile.cards;
    for(var i = 0; i < lastIx; i += 13) ixs.push(i);
    return ixs;
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
  __proto__: FanRightView,
  className: "pile hfan2",
  getVisibleCardIndexes: function(num) {
    if(num > 1) return [0, num - 1];
    return num ? [0] : [];
  }
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
const UnionSquareFoundationView = {
  __proto__: FanRightView,
  className: "pile hfan2",
  getVisibleCardIndexes: function(num) {
    if(num > 13) return [12, num - 1];
    return num ? [num - 1] : [];
  }
};

// a layout for Stocks, including a counter
const StockView = {
  __proto__: View,
  _counter: true,
  getVisibleCardIndexes: function(max) {
    return max ? [0] : [];
  },
  getTargetCard: function(event) {
    return this.pile.lastCard || this.pile.magicStockStubCard;
  }
};
