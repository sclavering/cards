function createPileView(viewType) {
  const view =  { __proto__: viewType };
  view.initView();
  return view;
}

var gVFanOffset = 25; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 15; // num pixels between left edges of two cards in a horizontal fan
var gVSlideOffset = 1; // like above, for "slide" piles (compact stacks)
var gHSlideOffset = 2;
var gCardHeight = 123;
var gCardWidth = 79;
var gSpacerSize = 10;


var gCardImageOffsets = null;

function drawCard(canvascx, card, x, y) {
  if(!gCardImageOffsets) initCardImageOffsets();
  var srcY = gCardImageOffsets[card.faceUp ? card.displayStr : ''] * gCardHeight;
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  canvascx.drawImage(ui.cardImages, 0, srcY, gCardWidth, gCardHeight, x, y, gCardWidth, gCardHeight);
}

function initCardImageOffsets() {
  var off = gCardImageOffsets = {};
  for(let [l, n] in Iterator({ 'S': 0, 'H': 1, 'D': 2, 'C': 3 }))
    for(var i = 1; i != 14; ++i)
      off[l + i] = n * 13 + i - 1;
  off[''] = 4 * 13; // facedown image is last
}



// Base class for pile views.
const _View = {
  insertInto: function(parentNode) {
    parentNode.appendChild(this._fragment || this._canvas);
  },

  pixelRect: function() { return this._canvas.getBoundingClientRect(); },

  _fragment: null,
  _canvas: null, // the <canvas>; all views use one
  _context: null,
  _counter: null, // if set true, a <label> will be created and replace it

  // Redraw the pile.
  update: function() {
    const cs = this.pile.cards;
    this._update(cs);
  },

  // Show the supplied array of cards (which may be a prefix of pile's cards, during animation or dragging).
  _update: function(cards) {
    throw "_View._update not overridden!";
  },

  _drawBackgroundForEmpty: function() {
    this._context.strokeStyle = "white";
    this._context.lineWidth = 2;
    // note: strokeRect seems incapable of rounded corners
    this._context.strokeRect(2, 2, this._canvas.width - 4, this._canvas.height - 4);
  },

  // Called when the user starts dragging 'card', or it's about to be moved
  // elsewhere with animation. Should update the view to hide it and the cards
  // after it, and draw them in gFloatingPile instead.
  updateForAnimationOrDrag: function(card) {
    const coords = this.drawIntoFloatingPile(card);
    const r = this.pixelRect();
    gFloatingPile.showFor(card, r.left + coords.x, r.top + coords.y);
    const cs = this.pile.cards.slice(0, card.index);
    this._update(cs);
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

  // Return relative CSS-pixel coords for where an animated move should finish.
  getAnimationDestination: function() {
    return { x: 0, y: 0 };
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    throw "getTargetCard not implemented";
  },

  needsUpdateOnResize: false,

  initView: function() {
    this._canvas = document.createElement("canvas");
    this._canvas.pileViewObj = this;
    this._context = this._canvas.getContext("2d");
    if(this._counter) {
      this._fragment = document.createDocumentFragment();
      this._fragment.appendChild(this._canvas);
      this._counter = this._fragment.appendChild(document.createElement("div"));
      this._counter.className = "counter";
    }
  }
}

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _View,

  _update: function(cs) {
    this._canvas.width = gCardWidth;
    this._canvas.height = 0; // changed values clears the canvas
    this._canvas.height = gCardHeight;
    if(cs.length) drawCard(this._context, cs[cs.length - 1], 0, 0);
    else this._drawBackgroundForEmpty();
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  drawIntoFloatingPile: function(card) {
    gFloatingPile.sizeCanvas(gCardWidth, gCardHeight);
    drawCard(gFloatingPile.context, card, 0, 0);
    return { x: 0, y: 0 };
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


const _FanView = {
  __proto__: _View,

  // Controls the size of the <canvas>.  Set null to use all available space
  fixedWidth: gCardWidth,
  fixedHeight: gCardHeight,

  // Horizontal and vertical canvas-pixel offsets between cards
  _hOffset: 0,
  _vOffset: 0,

  _update: function(cs) {
    this._canvas.width = this.fixedWidth || this.widthToUse;
    this._canvas.height = 0; // changed value clears the canvas
    this._canvas.height = this.fixedHeight || this.heightToUse;
    const ixs = this.getVisibleCardIndexes(cs.length), num = ixs.length;
    this._updateOffsets(num);
    const h = this._hOffset, v = this._vOffset;
    for(var i = 0; i != num; ++i) drawCard(this._context, cs[ixs[i]], h * i, v * i);
    if(!num) this._drawBackgroundForEmpty();
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  // Change offsets to allow num cards to fit in the space
  _updateOffsets: function(num) {},

  drawIntoFloatingPile: function(card) {
    const cs = this.pile.cards;
    const ixs = this.getVisibleCardIndexes(cs.length), inum = ixs.length;
    const first = ixs.indexOf(card.index);
    const h = this._hOffset, v = this._vOffset;
    const numFloating = inum - first;
    const extras = numFloating - 1;
    const width = extras * h + gCardWidth, height = extras * v + gCardHeight;
    gFloatingPile.sizeCanvas(width, height);
    for(var i = 0, j = first; i < numFloating; ++i, ++j) drawCard(gFloatingPile.context, cs[ixs[j]], h * i, v * i);
    return { x: first * h, y: first * v };
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
  getVisibleCardIndexes: range,

  getAnimationDestination: function() {
    const ix = this.pile.cards.length;
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
      pos = event.pageX - this._canvas.getBoundingClientRect().left;
      offset = this._hOffset;
      cardsize = gCardHeight;
    } else {
      pos = event.pageY - this._canvas.getBoundingClientRect().top;
      offset = this._vOffset;
      cardsize = gCardWidth;
    }
    const ix = Math.floor(pos / offset);
    const last = numVisible - 1;
    if(ix <= last) return ix;
    return pos < numVisible * offset + cardsize ? last : -1;
  }
};

// A fan that stretches in one dimension, and varies the card offset to make
// all its cards always visible
const _FlexFanView = {
  __proto__: _FanView,

  _basicVOffset: 0,
  _basicHOffset: 0,

  // change offsets to allow num+1 cards to fit in the space
  _updateOffsets: function(num) {
    const r = this.pixelRect(), h = this._basicHOffset, v = this._basicVOffset;
    if(h) this._hOffset = this._calculate_new_offset(h, r.right - r.left - gCardWidth, num);
    if(v) this._vOffset = this._calculate_new_offset(v, r.bottom - r.top - gCardHeight, num);
  },

  _calculate_new_offset: function(preferred_offset, available_space, num_cards) {
    let offset = Math.min(num_cards ? available_space / num_cards - 1 : available_space, preferred_offset);
    if(offset > 2) offset = Math.floor(offset); // use integer offsets if possible, to avoid fuzzyness
    return offset;
  },

  _drawBackgroundForEmpty: function() {
    this._context.strokeStyle = "white";
    this._context.lineWidth = 2;
    this._context.strokeRect(2, 2, gCardWidth - 4, gCardHeight - 4);
  },

  needsUpdateOnResize: true,

  initView: function() {
    const el = document.createElement("canvas");
    this._canvas = el;
    el.pileViewObj = this;
    this._context = this._canvas.getContext("2d");
  }
};

const FanDownView = {
  __proto__: _FlexFanView,
  fixedHeight: null,
  _basicVOffset: gVFanOffset
};

const FanRightView = {
  __proto__: _FlexFanView,
  fixedWidth: null,
  _basicHOffset: gHFanOffset
};

const _SlideView = {
  __proto__: _FlexFanView,
  _basicHOffset: gHSlideOffset,
  _basicVOffset: gVSlideOffset,
  // Adequate in all the games it's used in
  getTargetCard: function(event) {
    return this.pile.lastCard;
  }
};

const _Deal3WasteView = {
  __proto__: _FanView,
  _counter: true,

  getVisibleCardIndexes: function(lastIx) {
    const first = this.pile.deal3t - this.pile.deal3v;
    if(!lastIx) return [];
    if(lastIx <= first) return [lastIx - 1]; // gone below the latest 3
    return range2(first, lastIx);
  }
};

const Deal3HWasteView = {
  __proto__: _Deal3WasteView,
  fixedWidth: gCardWidth + 2 * gHFanOffset,
  _hOffset: gHFanOffset
};

const Deal3VWasteView = {
  __proto__: _Deal3WasteView,
  fixedHeight: gCardHeight + 2 * gVFanOffset,
  _vOffset: gVFanOffset
};


// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationView = {
  __proto__: _FanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
  getVisibleCardIndexes: function(num) {
    if(num >= 2) return [num - 2, num - 1];
    return num ? [num - 1] : [];
  }
};

const FoundationSlideView = {
  __proto__: _SlideView,
  fixedWidth: gCardWidth + 12 * gHSlideOffset,
  fixedHeight: gCardHeight + 12 * gVSlideOffset
};

const Mod3SlideView = {
  __proto__: _SlideView,
  fixedWidth: gCardWidth + 3 * gHSlideOffset,
  fixedHeight: gCardHeight + 3 * gVSlideOffset
};

const PileOnView4 = {
  __proto__: _FanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + 3 * gHFanOffset
};

const PileOnView8 = {
  __proto__: _FanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + 7 * gHFanOffset
};

// Collapses to nothing when it has no cards
const PyramidView = {
  __proto__: View,
  insertInto: function(parentNode) {
    parentNode.appendChild(this._canvas);
    this._canvas.parentNode.className += ' pyramid-pile-parent';
  },
  _update: function(cs) {
    View._update.call(this, cs);
    // We don't want to collapse roots
    if(this.pile.leftParent || this.pile.rightParent) this._canvas.className = cs.length ? "pyramid-uncollapse" : "pyramid-collapse";
  }
};

const _SpiderFoundationView = {
  __proto__: _FanView,
  _vOffset: gVFanOffset,
  getVisibleCardIndexes: function(lastIx) {
    const ixs = [], cs = this.pile.cards;
    for(var i = 0; i < lastIx; i += 13) ixs.push(i);
    return ixs;
  }
};

const Spider4FoundationView = {
  __proto__: _SpiderFoundationView,
  fixedHeight: gCardHeight + 3 * gVFanOffset
};

const Spider8FoundationView = {
  __proto__: _SpiderFoundationView,
  fixedHeight: gCardHeight + 7 * gVFanOffset
};

// bottom + top cards visible, so you can tell whether pile is being built up or down
const UnionSquarePileView = {
  __proto__: _FanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
  getVisibleCardIndexes: function(num) {
    if(num > 1) return [0, num - 1];
    return num ? [0] : [];
  }
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
const UnionSquareFoundationView = {
  __proto__: _FanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
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
