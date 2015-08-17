function createPileView(viewType) {
  const view =  { __proto__: viewType };
  view.init();
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
  const off = gCardImageOffsets = {};
  for(let [l, n] of [["S", 0], ["H", 1], ["D", 2], ["C", 3]])
    for(var i = 1; i !== 14; ++i)
      off[l + i] = n * 13 + i - 1;
  off[''] = 4 * 13; // facedown image is last
}



// Base class for pile views.
const _View = {
  _root_node: null,
  _canvas: null, // the <canvas>; all views use one
  _context: null,
  _counter: null, // if set true, a <label> will be created and replace it

  init: function() {
    this._root_node = this._canvas = document.createElement("canvas");
    this._canvas.pileViewObj = this;
    this._context = this._canvas.getContext("2d");
    if(this._counter) {
      this._root_node = document.createDocumentFragment();
      this._root_node.appendChild(this._canvas);
      this._counter = this._root_node.appendChild(document.createElement("div"));
      this._counter.className = "counter";
    }
  },

  // Attach this view to a Pile
  attach: function(pile) {
    this.pile = pile;
    this.update();
  },

  insert_into: function(parent_node) {
    parent_node.appendChild(this._root_node);
  },

  pixel_rect: function() {
    return this._canvas.getBoundingClientRect();
  },

  // Redraw the pile.
  update: function() {
    const cs = this.pile.cards;
    this.update_with(cs);
  },

  // Show the supplied array of cards (which may be a prefix of pile's cards, during animation or dragging).
  update_with: function(cards) {
    throw "not implemented";
  },

  _draw_background_into: function(ctx, width, height) {
    this._context.strokeStyle = "white";
    this._context.lineWidth = 2;
    round_rect_path(ctx, 1.5, 1.5, (width || ctx.canvas.width) - 3, (height || ctx.canvas.height) - 3, 5);
    this._context.stroke();
  },

  draw_into: function(ctx, cards, draw_background) {
    throw "not implemented";
  },

  coords_of_card: function(card) {
    return { x: 0, y: 0 };
  },

  show_hint_source: function(card) {
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
    throw "not implemented";
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

  card_at_coords: function(x, y) {
    throw "not implemented";
  },

  needs_update_on_resize: false,
};

// A view where only the top card is ever visible (used for foundations).
const View = {
  __proto__: _View,

  update_with: function(cs) {
    this.draw_into(this._context, cs, !cs.length);
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  draw_into: function(ctx, cards, draw_background) {
    clear_and_resize_canvas(ctx, gCardWidth, gCardHeight);
    if(draw_background) this._draw_background_into(ctx);
    if(cards.length) drawCard(ctx, cards[cards.length - 1], 0, 0);
  },

  draw_hint_destination: function(cards) {
    const tmp = gTemporaryCanvasContext.get();
    this.draw_into(tmp, cards, false);
    this._draw_hint_destination(tmp, 0, 0);
  },

  card_at_coords: function(x, y) {
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

  canvas_width: gCardWidth,
  canvas_height: gCardHeight,

  // Should the Layout update .canvas_width and/or .canvas_height when the window is resized?
  update_canvas_width_on_resize: false,
  update_canvas_height_on_resize: false,

  // Canvas-pixel offsets between each card.
  _fan_x_offset: 0,
  _fan_y_offset: 0,

  update_with: function(cs) {
    this._recalculate_offsets(cs.length);
    this.draw_into(this._context, cs, !cs.length || this._always_draw_background);
    if(this._counter) this._counter.textContent = this.pile.counter;
  },

  // Update the view's offsets to allow the specified number of cards to fit in the space.  Only implemented in _FlexFanView.
  _recalculate_offsets: function(num) {},

  draw_into: function(ctx, cards, draw_background, use_minimum_size) {
    // The complexity around width/height is to make hint-destinations display correctly.  We need the pile's own <canvas> to use all the available space so that if we later paint a hint destination into it, it's big enough to show (and doesn't get clipped at the bottom/right edge of the final card).  But we need the <canvas> used for the hint-destination cards to be conservatively sized so that when we composite it into the main canvas, we don't end up with a big translucent white box extending beyond the cards.
    const num = cards.length, xo = this._fan_x_offset, yo = this._fan_y_offset;
    const width = use_minimum_size ? (num - 1) * xo + gCardWidth : this.canvas_width;
    const height = use_minimum_size ? (num - 1) * yo + gCardHeight : this.canvas_height;
    clear_and_resize_canvas(ctx, width, height);
    if(draw_background) this._draw_background_into(ctx);
    for(let i = 0; i !== num; ++i) drawCard(ctx, cards[i], xo * i, yo * i);
  },

  coords_of_card: function(card) {
    return { x: card.index * this._fan_x_offset, y: card.index * this._fan_y_offset };
  },

  draw_hint_destination: function(cards) {
    const rect = this.get_next_card_xy();
    const tmp = gTemporaryCanvasContext.get();
    this.draw_into(tmp, cards, false, true);
    this._draw_hint_destination(tmp, rect.x, rect.y);
  },

  _get_hint_source_rect: function(card) {
    const offset = card.index, size = this.pile.cards.length - 1 - card.index;
    const xo = this._fan_x_offset, yo = this._fan_y_offset;
    return { x: offset * xo, y: offset * yo, w: size * xo + gCardWidth, h: size * yo + gCardHeight };
  },

  get_next_card_xy: function() {
    const offset = this._get_next_card_offset();
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  },

  _get_next_card_offset: function() {
    return this.pile.cards.length;
  },

  card_at_coords: function(x, y) {
    return this._get_target_card_at_relative_coords_from_list(x, y, this.pile.cards);
  },

  // handles only purely-horizontal or purely-vertical fans
  _get_target_card_at_relative_coords_from_list: function(x, y, cards) {
    if(this._fan_x_offset) return this._get_target_card_at_relative_coords_from_list2(x, this._fan_x_offset, gCardWidth, cards);
    return this._get_target_card_at_relative_coords_from_list2(y, this._fan_y_offset, gCardHeight, cards);
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

  update_with: function(cards) {
    return _FanView.update_with.call(this, this._visible_cards_of(cards));
  },

  coords_of_card: function(card) {
    const offset = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  },

  card_at_coords: function(x, y) {
    return this._get_target_card_at_relative_coords_from_list(x, y, this._visible_cards_of(this.pile.cards));
  },

  _get_hint_source_rect: function(card) {
    // Only the top card will ever be the source of a hint.
    const num = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: num * this._fan_x_offset, y: num * this._fan_y_offset, w: gCardWidth, h: gCardHeight };
  },

  // Subclasses will need to override ._get_next_card_offset(), except for waste-pile views, where it's irrelevant.
};

// Shows the top two cards
const _TwoCardSelectiveFanView = {
  __proto__: _SelectiveFanView,
  _always_draw_background: true,
  _get_next_card_offset: function() {
    return this.pile.cards.length ? 1 : 0;
  },
};

// A fan that stretches in one dimension, and varies the card offset to make
// all its cards always visible
const _FlexFanView = {
  __proto__: _FanView,

  _fan_x_default_offset: 0,
  _fan_y_default_offset: 0,

  _recalculate_offsets: function(num) {
    const xo = this._fan_x_default_offset, yo = this._fan_y_default_offset;
    if(xo) this._fan_x_offset = this._calculate_new_offset(xo, this.canvas_width - gCardWidth, num);
    if(yo) this._fan_y_offset = this._calculate_new_offset(yo, this.canvas_height - gCardHeight, num);
  },

  _calculate_new_offset: function(preferred_offset, available_space, num_cards) {
    let offset = Math.min(num_cards ? available_space / (num_cards - 1) : available_space, preferred_offset);
    if(offset > 2) offset = Math.floor(offset); // use integer offsets if possible, to avoid fuzzyness
    return offset;
  },

  _draw_background_into: function(ctx) {
    _View._draw_background_into.call(this, ctx, gCardWidth, gCardHeight);
  },

  needs_update_on_resize: true,
};

const FanDownView = {
  __proto__: _FlexFanView,
  update_canvas_height_on_resize: true,
  _fan_y_default_offset: gVFanOffset,
};

const FanRightView = {
  __proto__: _FlexFanView,
  update_canvas_width_on_resize: true,
  _fan_x_default_offset: gHFanOffset,
};

const _SlideView = {
  __proto__: _FlexFanView,
  _fan_x_default_offset: gHSlideOffset,
  _fan_y_default_offset: gVSlideOffset,
  // Adequate in all the games it's used in
  card_at_coords: function(x, y) {
    return this.pile.lastCard;
  },
};

const _Deal3WasteView = {
  __proto__: _SelectiveFanView,
  _counter: true,
  _always_draw_background: true,
  _visible_cards_of: function(cards) {
    if(!cards.length) return [];
    const first = this.pile.deal3t - this.pile.deal3v;
    if(cards.length <= first) return cards.slice(-1);
    return cards.slice(first);
  },
};

const Deal3HWasteView = {
  __proto__: _Deal3WasteView,
  canvas_width: gCardWidth + 2 * gHFanOffset,
  _fan_x_offset: gHFanOffset
};

const Deal3VWasteView = {
  __proto__: _Deal3WasteView,
  canvas_height: gCardHeight + 2 * gVFanOffset,
  _fan_y_offset: gVFanOffset
};

// Shows the top *two* cards, so you can tell if they have the same number.
const DoubleSolFoundationView = {
  __proto__: _TwoCardSelectiveFanView,
  _fan_x_offset: gHFanOffset,
  canvas_width: gCardWidth + gHFanOffset,
  _visible_cards_of: function(cards) {
    return cards.slice(-2);
  },
};

const FoundationSlideView = {
  __proto__: _SlideView,
  canvas_width: gCardWidth + 12 * gHSlideOffset,
  canvas_height: gCardHeight + 12 * gVSlideOffset
};

const Mod3SlideView = {
  __proto__: _SlideView,
  canvas_width: gCardWidth + 3 * gHSlideOffset,
  canvas_height: gCardHeight + 3 * gVSlideOffset
};

const PileOnView4 = {
  __proto__: _FanView,
  _fan_x_offset: gHFanOffset,
  _always_draw_background: true,
  canvas_width: gCardWidth + 3 * gHFanOffset
};

const PileOnView8 = {
  __proto__: _FanView,
  _fan_x_offset: gHFanOffset,
  _always_draw_background: true,
  canvas_width: gCardWidth + 7 * gHFanOffset
};

const PyramidView = {
  __proto__: View,
  init: function() {
    View.init.call(this);
    // We need this <div> to set a minimum-width on and thus space the piles out properly (the <canvas> is position:absolute).
    // Note: you might expect the <div> to need position:relative too to get the <canvas> in the right place, but actually setting that makes the <canvas> invisible (I don't know why).  It works fine without it, because we're leaving top/left unspecified (rather than setting them to 0), so the <canvas> retains the position it would've got from position:static, rather than being positioned relative to the nearest position:relative/absolute ancestor.
    const wrapper = this._root_node = document.createElement("div");
    wrapper.className = "pyramid-pile-wrapper";
    wrapper.appendChild(this._canvas);
  },
  update_with: function(cs) {
    View.update_with.call(this, cs);
    // We want empty piles to be hidden, so mouse clicks go to any pile that was overlapped instead.  But not for piles at the root of a pyramid (where we draw the empty-pile graphic instead).
    if(this.pile.leftParent || this.pile.rightParent) this._canvas.style.display = cs.length ? "block" : "none";
  }
};

// Just displays Kings from the start of each King->Ace run.
const _SpiderFoundationView = {
  __proto__: _SelectiveFanView,
  _fan_y_offset: gVFanOffset,
  _always_draw_background: true,
  _visible_cards_of: function(cards) {
    return cards.filter((el, ix) => ix % 13 === 0);
  },
  _get_next_card_offset: function() {
    return this.pile.cards.length / 13;
  },
};

const Spider4FoundationView = {
  __proto__: _SpiderFoundationView,
  canvas_height: gCardHeight + 3 * gVFanOffset
};

const Spider8FoundationView = {
  __proto__: _SpiderFoundationView,
  canvas_height: gCardHeight + 7 * gVFanOffset
};

// Shows the bottom cards and the top one, so you can tell whether pile is being built up or down.
const UnionSquarePileView = {
  __proto__: _TwoCardSelectiveFanView,
  _fan_x_offset: gHFanOffset,
  canvas_width: gCardWidth + gHFanOffset,
  _visible_cards_of: function(cards) {
    if(cards.length > 1) return [cards[0], cards[cards.length - 1]];
    return cards.slice(0, 1);
  },
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
const UnionSquareFoundationView = {
  __proto__: _SelectiveFanView,
  _fan_x_offset: gHFanOffset,
  canvas_width: gCardWidth + gHFanOffset,
  _always_draw_background: true,
  _visible_cards_of: function(cards) {
    if(cards.length > 13) return [cards[12], cards[cards.length - 1]];
    return cards.slice(-1);
  },
  _get_next_card_offset: function() {
    return this.pile.cards.length >= 13 ? 1 : 0;
  },
};

// a layout for Stocks, including a counter
const StockView = {
  __proto__: View,
  _counter: true,
  card_at_coords: function(x, y) {
    return this.pile.lastCard || this.pile.magicStockStubCard;
  },
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

function round_rect_path(ctx, x, y, w, h, r) {
  const deg_to_rad = Math.PI / 180;
  const x2 = x + w, y2 = y + h;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x2 - r, y);
  ctx.arc(x2 - r, y + r, r, 270 * deg_to_rad, 360 * deg_to_rad, false);
  ctx.lineTo(x2, y2 - r);
  ctx.arc(x2 - r, y2 - r, r, 0 * deg_to_rad, 90 * deg_to_rad, false);
  ctx.lineTo(x + r, y2);
  ctx.arc(x + r, y2 - r, r, 90 * deg_to_rad, 180 * deg_to_rad, false);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, 180 * deg_to_rad, 270 * deg_to_rad, false);
  ctx.closePath();
};
