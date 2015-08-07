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
    for(var i = 1; i !== 14; ++i)
      off[l + i] = n * 13 + i - 1;
  off[''] = 4 * 13; // facedown image is last
}



// Base class for pile views.
const _View = {
  insertInto: function(parentNode) {
    parentNode.appendChild(this._rootNode);
  },

  pixelRect: function() { return this._canvas.getBoundingClientRect(); },

  _rootNode: null,
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

  // Shades the cards to be moved.
  highlightHintFrom: function(card) {
    const rect = this._get_hint_source_rect(card);
    this._context.fillStyle = "darkgrey";
    this._context.globalAlpha = 0.3;
    this._context.fillRect(rect.x, rect.y, rect.w, rect.h);
  },

  _get_hint_source_rect: function(card) {
    return { x: 0, y: 0, w: gCardWidth, h: gCardHeight };
  },

  // Receives an array of cards that are currently in another pile but which the hint suggests moving to this pile.
  // This method should render them into a temporary canvas, and then call ._draw_hint_destination(), which will render them ghosted out over the existing cards.
  draw_hint_destination: function(cards) {
    throw new Error("not implemented");
  },

  _draw_hint_destination: function(canvas_context, x, y) {
    const canvas = canvas_context.canvas;
    this._context.globalAlpha = 0.9;
    this._context.fillStyle = "white";
    this._context.fillRect(x + 1, y + 1, canvas.width - 2, canvas.height - 2);
    this._context.globalAlpha = 0.4;
    this._context.drawImage(canvas, x, y);
  },

  // Return relative CSS-pixel coords for where a card being added should be displayed, both for animated moves and for hints.
  get_next_card_xy: function() {
    return { x: 0, y: 0 };
  },

  // Takes an event (mousedown or contextmenu, at present) and returns a Card
  getTargetCard: function(event) {
    throw "getTargetCard not implemented";
  },

  needsUpdateOnResize: false,

  initView: function() {
    this._rootNode = this._canvas = document.createElement("canvas");
    this._canvas.pileViewObj = this;
    this._context = this._canvas.getContext("2d");
    if(this._counter) {
      this._rootNode = document.createDocumentFragment();
      this._rootNode.appendChild(this._canvas);
      this._counter = this._rootNode.appendChild(document.createElement("div"));
      this._counter.className = "counter";
    }
  }
};

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _View,

  _update: function(cs) {
    clear_and_resize_canvas(this._context, gCardWidth, gCardHeight);
    if(cs.length) drawCard(this._context, cs[cs.length - 1], 0, 0);
    else this._drawBackgroundForEmpty();
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  draw_hint_destination: function(cards) {
    const tmp = clear_and_resize_canvas(gTemporaryCanvasContext.get(), gCardWidth, gCardHeight);
    drawCard(tmp, cards[cards.length - 1], 0, 0);
    this._draw_hint_destination(tmp, 0, 0);
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
};

const _FanView = {
  __proto__: _View,

  // Controls the size of the <canvas>.  Set null to use all available space
  fixedWidth: gCardWidth,
  fixedHeight: gCardHeight,

  // Horizontal and vertical canvas-pixel offsets between cards
  _hOffset: 0,
  _vOffset: 0,

  _update: function(cs) {
    clear_and_resize_canvas(this._context, this.fixedWidth || this.widthToUse, this.fixedHeight || this.heightToUse);
    const num = cs.length;
    this._updateOffsets(num);
    const h = this._hOffset, v = this._vOffset;
    for(let i = 0; i !== num; ++i) drawCard(this._context, cs[i], h * i, v * i);
    if(!num) this._drawBackgroundForEmpty();
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  // Change offsets to allow num cards to fit in the space
  _updateOffsets: function(num) {},

  drawIntoFloatingPile: function(card) {
    const to_draw = this.pile.cards.slice(card.index);
    const h = this._hOffset, v = this._vOffset;
    gFloatingPile.sizeCanvas((to_draw.length - 1) * h + gCardWidth, (to_draw.length - 1) * v + gCardHeight);
    for(let i = 0; i < to_draw.length; ++i) drawCard(gFloatingPile.context, to_draw[i], h * i, v * i);
    return { x: card.index * h, y: card.index * v };
  },

  draw_hint_destination: function(cards) {
    const rect = this.get_next_card_xy();
    const num = cards.length, h_off = this._hOffset, v_off = this._vOffset;
    const w = (num - 1) * h_off + gCardWidth, h = (num - 1) * v_off + gCardHeight
    const tmp = clear_and_resize_canvas(gTemporaryCanvasContext.get(), w, h);
    for(let i = 0; i !== num; ++i) drawCard(tmp, cards[i], i * h_off, i * v_off);
    this._draw_hint_destination(tmp, rect.x, rect.y);
  },

  _get_hint_source_rect: function(card) {
    const offset = card.index, size = this.pile.cards.length - 1 - card.index;
    const h = this._hOffset, v = this._vOffset;
    return { x: offset * h, y: offset * v, w: size * h + gCardWidth, h: size * v + gCardHeight };
  },

  get_next_card_xy: function() {
    const offset = this._get_animation_offset();
    return { x: offset * this._hOffset, y: offset * this._vOffset };
  },

  _get_animation_offset: function() {
    return this.pile.cards.length;
  },

  getTargetCard: function(event) {
    const bounds = this._canvas.getBoundingClientRect();
    return this._get_target_card_at_relative_coords(event.pageX - bounds.left, event.pageY - bounds.top);
  },

  _get_target_card_at_relative_coords: function(x, y) {
    return this._get_target_card_at_relative_coords_from_list(x, y, this.pile.cards);
  },

  // handles only purely-horizontal or purely-vertical fans
  _get_target_card_at_relative_coords_from_list: function(x, y, cards) {
    if(this._hOffset) return this._get_target_card_at_relative_coords_from_list2(x, this._hOffset, gCardWidth, cards);
    return this._get_target_card_at_relative_coords_from_list2(y, this._vOffset, gCardHeight, cards);
  },

  _get_target_card_at_relative_coords_from_list2: function(pos, offset, cardsize, cards) {
    const ix = Math.floor(pos / offset);
    if(cards[ix]) return cards[ix];
    return pos < (cards.length - 1) * offset + cardsize ? cards[cards.length - 1] : null;
  },
};

const _SelectiveFanView = {
  __proto__: _FanView,

  _visible_cards_of: function(cs) {
    throw "not implemented";
  },

  _update: function(cards) {
    return _FanView._update.call(this, this._visible_cards_of(cards));
  },

  drawIntoFloatingPile: function(card) {
    // In practice this will only be drawing the top card (because of the pile types that use _SelectiveFanView).  Maybe we should just do that directly instead.
    _FanView.drawIntoFloatingPile.call(this, card);

    const offset = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: offset * this._hOffset, y: offset * this._vOffset };
  },

  _get_target_card_at_relative_coords: function(x, y) {
    return this._get_target_card_at_relative_coords_from_list(x, y, this._visible_cards_of(this.pile.cards));
  },

  _get_hint_source_rect: function(card) {
    // Only the top card will ever be the source of a hint.
    const num = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: num * this._hOffset, y: num * this._vOffset, w: gCardWidth, h: gCardHeight };
  },

  // Subclasses will need to override ._get_animation_offset(), except for waste-pile views, where it's irrelevant.
};

// Shows the top two cards
const _TwoCardSelectiveFanView = {
  __proto__: _SelectiveFanView,
  _get_animation_offset: function() {
    return this.pile.cards.length ? 1 : 0;
  },
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
  __proto__: _SelectiveFanView,
  _counter: true,
  _visible_cards_of: function(cards) {
    if(!cards.length) return [];
    const first = this.pile.deal3t - this.pile.deal3v;
    if(cards.length <= first) return cards.slice(-1);
    return cards.slice(first);
  },
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

// Shows the top *two* cards, so you can tell if they have the same number.
const DoubleSolFoundationView = {
  __proto__: _TwoCardSelectiveFanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
  _visible_cards_of: function(cards) {
    return cards.slice(-2);
  },
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

const PyramidView = {
  __proto__: View,
  initView: function() {
    View.initView.call(this);
    // We need this <div> to set a minimum-width on and thus space the piles out properly (the <canvas> is position:absolute).
    // Note: you might expect the <div> to need position:relative too to get the <canvas> in the right place, but actually setting that makes the <canvas> invisible (I don't know why).  It works fine without it, because we're leaving top/left unspecified (rather than setting them to 0), so the <canvas> retains the position it would've got from position:static, rather than being positioned relative to the nearest position:relative/absolute ancestor.
    const wrapper = this._rootNode = document.createElement("div");
    wrapper.className = "pyramid-pile-wrapper";
    wrapper.appendChild(this._canvas);
  },
  _update: function(cs) {
    View._update.call(this, cs);
    // We want empty piles to be hidden, so mouse clicks go to any pile that was overlapped instead.  But not for piles at the root of a pyramid (where we draw the empty-pile graphic instead).
    if(this.pile.leftParent || this.pile.rightParent) this._canvas.style.display = cs.length ? "block" : "none";
  }
};

// Just displays Kings from the start of each King->Ace run.
const _SpiderFoundationView = {
  __proto__: _SelectiveFanView,
  _vOffset: gVFanOffset,
  _visible_cards_of: function(cards) {
    return cards.filter((el, ix) => ix % 13 === 0);
  },
  _get_animation_offset: function() {
    return this.pile.cards.length / 13;
  },
};

const Spider4FoundationView = {
  __proto__: _SpiderFoundationView,
  fixedHeight: gCardHeight + 3 * gVFanOffset
};

const Spider8FoundationView = {
  __proto__: _SpiderFoundationView,
  fixedHeight: gCardHeight + 7 * gVFanOffset
};

// Shows the bottom cards and the top one, so you can tell whether pile is being built up or down.
const UnionSquarePileView = {
  __proto__: _TwoCardSelectiveFanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
  _visible_cards_of: function(cards) {
    if(cards.length > 1) return [cards[0], cards[cards.length - 1]];
    return cards.slice(0, 1);
  },
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
const UnionSquareFoundationView = {
  __proto__: _SelectiveFanView,
  _hOffset: gHFanOffset,
  fixedWidth: gCardWidth + gHFanOffset,
  _visible_cards_of: function(cards) {
    if(cards.length > 13) return [cards[12], cards[cards.length - 1]];
    return cards.slice(-1);
  },
  _get_animation_offset: function() {
    return this.pile.cards.length >= 13 ? 1 : 0;
  },
};

// a layout for Stocks, including a counter
const StockView = {
  __proto__: View,
  _counter: true,
  getTargetCard: function(event) {
    return this.pile.lastCard || this.pile.magicStockStubCard;
  }
};


const gTemporaryCanvasContext = {
  _context: null,
  get: function() {
    return this._context || (this._context = document.createElement("canvas").getContext("2d"));
  },
};

function clear_and_resize_canvas(context, width, height) {
  context.canvas.width = width;
  context.canvas.height = height;
  context.clearRect(0, 0, width, height);
  return context;
};
