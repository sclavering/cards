function createPileView(viewType) {
  const view = document.createElement(viewType._tagName);
  extendObj(view, viewType, true);
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
// is used because other code expects a .boxObject of views, and to allow
// control of whether the canvas should be stretched or not.
const _View = {
  // this is used in the drag+drop code and similar places, to see what an element is
  isPileView: true,

  // override if desired
  _tagName: "vbox",
  className: "pile",

  // Passed the index of a card in the pile or the length of the pile (i.e. the index of
  // the next card to be added to the pile).  Should return the pixel offset from the
  // top-left corner of the pile.
  getCardOffsets: function(ix) { return { x: 0, y: 0 }; },

  // Redraw the pile, showing only this.pile.cards[0 .. max).
  // Cards are temporarily hidden e.g. during drag+drop, and max allows that.
  update: function(max) {
    if(typeof max == "undefined") max = this.pile.cards.length;
    this._update(max);
  },
  _update: function(max) {
    throw "_View._update not overridden!";
  },

  // Attach this view to a Pile
  displayPile: function(pile) {
    this.pile = pile;
    this.update();
  },

  drawHintHighlight: function(card) {
    const rect = this.getHighlightBounds(card);
    this._context.fillStyle = "rgba(169,169,169, 0.3)"; // darkgrey
    this._context.fillRect(rect.x, rect.y, rect.w, rect.h);
  },

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
    return { x: x, y: y, w: w, h: h };
  },

  // Return an {x:,y:} obj giving pixel offset from top-left corner for where
  // an animation for adding cards should finish at.
  getAddedCardOffsets: function(card) {
    return this.getCardOffsets(this.pile.cards.length - 1);
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    throw "getTargetCard not implemented for a canvas-based view";
  },

  initView: function() {
    const HTMLns = "http://www.w3.org/1999/xhtml";
    this._canvas = document.createElementNS(HTMLns, "canvas");
    this.appendChild(this._canvas);
    this._context = this._canvas.getContext("2d");
  }
}

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _View,

  _update: function(max) {
    this._canvas.width = gCardWidth;
    this._canvas.height = 0; // changed values clears the canvas
    this._canvas.height = gCardHeight;
    const card = max ? this.pile.cards[max - 1] : null;
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
  __proto__: _View,
  // Pixel offsets between cards used during the last update() call.
  // Needed by getTargetCard().
  _hOffset: 0,
  _vOffset: 0,
  // For the default _getLayoutOffsets.  Views would override one or both.
  _basicVOffset: 0,
  _basicHOffset: 0,

  _update: function(max) {
    const box = this.boxObject;
    this._canvas.width = box.width;
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = box.height;
    const ixs = this.getVisibleCardIndexes(max), num = ixs.length;
    const off = this._getLayoutOffsets(box.width, box.height, num);
    // use an int offset where possible to avoid fuzzy card borders
    const h = this._hOffset = off[0] < 1 ? off[0] : Math.floor(off[0]);
    const v = this._vOffset = off[1] < 1 ? off[1] : Math.floor(off[1]);
    const cs = this.pile.cards;
    for(var i = 0; i != num; ++i)
      this._context.drawImage(cs[ixs[i]].image, h * i, v * i);
  },

  // This exists to allow games to show a subset of the cards in a pile.
  // 'ix' is like the 'max' of View.update
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

  initView: function() {
    StockView.__proto__.initView.apply(this);
    this.appendChild(document.createElement("space"));
    this._counterlabel = this.appendChild(document.createElement("label"));
    this._counterlabel.className = "stockcounter";
  },

  update: function(max) {
    this._canvas.width = gCardWidth;
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = gCardHeight;
    if(max) this._context.drawImage(images.facedowncard, 0, 0);
    this._counterlabel.setAttribute("value", this.pile.counterValue);
  }
};
