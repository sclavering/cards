var gVFanOffset = 25; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 15; // num pixels between left edges of two cards in a horizontal fan
var gVSlideOffset = 1; // like above, for "slide" piles (compact stacks)
var gHSlideOffset = 2;
var gCardHeight = 123;
var gCardWidth = 79;
var gSpacerSize = 10;


var gCardImageOffsets = null;

function drawCard(canvascx, card, x, y) {
  return draw_card_by_name(canvascx, x, y, card.faceUp ? card.displayStr : "");
}

function draw_card_by_name(canvascx, x, y, name) {
  if(!gCardImageOffsets) initCardImageOffsets();
  const src_y = gCardImageOffsets[name] * gCardHeight;
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  canvascx.drawImage(ui.cardImages, 0, src_y, gCardWidth, gCardHeight, x, y, gCardWidth, gCardHeight);
}

function initCardImageOffsets() {
  const off = gCardImageOffsets = {};
  for(let [l, n] of [["S", 0], ["H", 1], ["D", 2], ["C", 3]])
    for(var i = 1; i !== 14; ++i)
      off[l + i] = n * 13 + i - 1;
  off[''] = 4 * 13; // facedown image is last
}



// Base class for pile views.
class _View {
  constructor() {
    this.needs_update_on_resize = false;

    this._canvas = document.createElement("canvas");
    this._root_node = this._canvas;
    this._canvas.pileViewObj = this;
    this._context = this._canvas.getContext("2d");
    this._counter = null;
  }

  // This is intended to be called by subclasses in their constructor.  It exists here both because a variety of different subclasses want it, and because it'd be fragile to have subclasses fiddling with the structure of the HTML.
  init_counter() {
    this._root_node = document.createDocumentFragment();
    this._root_node.appendChild(this._canvas);
    this._counter = this._root_node.appendChild(document.createElement("div"));
    this._counter.className = "counter";
  }

  // Attach this view to a Pile
  attach(pile) {
    this.pile = pile;
    this.update();
  }

  insert_into(parent_node) {
    parent_node.appendChild(this._root_node);
  }

  pixel_rect() {
    return this._canvas.getBoundingClientRect();
  }

  // Redraw the pile.
  update() {
    const cs = this.pile.cards;
    this.update_with(cs);
  }

  // Show the supplied array of cards (which may be a prefix of pile's cards, during animation or dragging).
  update_with(cards) {
    throw "not implemented";
  }

  _draw_background_into(ctx, width, height) {
    this._context.strokeStyle = "white";
    this._context.lineWidth = 2;
    round_rect_path(ctx, 1.5, 1.5, (width || ctx.canvas.width) - 3, (height || ctx.canvas.height) - 3, 5);
    this._context.stroke();
  }

  draw_into(ctx, cards, draw_background) {
    throw "not implemented";
  }

  coords_of_card(card) {
    return { x: 0, y: 0 };
  }

  show_hint_source(card) {
    const rect = this._get_hint_source_rect(card);
    this._context.fillStyle = "darkgrey";
    this._context.globalAlpha = 0.3;
    this._context.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  _get_hint_source_rect(card) {
    return { x: 0, y: 0, w: gCardWidth, h: gCardHeight };
  }

  // Receives an array of cards that are currently in another pile but which the hint suggests moving to this pile.
  // This method should render them into a temporary canvas, and then call ._draw_hint_destination(), which will render them ghosted out over the existing cards.
  draw_hint_destination(cards) {
    throw "not implemented";
  }

  _draw_hint_destination(canvas_context, x, y) {
    const canvas = canvas_context.canvas;
    this._context.globalAlpha = 0.9;
    this._context.fillStyle = "white";
    this._context.fillRect(x + 1, y + 1, canvas.width - 2, canvas.height - 2);
    this._context.globalAlpha = 0.4;
    this._context.drawImage(canvas, x, y);
  }

  // Return relative CSS-pixel coords for where a card being added should be displayed, both for animated moves and for hints.
  get_next_card_xy() {
    return { x: 0, y: 0 };
  }

  // Return a CardSequence (or null) for the card at the specified coords within the View's Pile.
  cseq_at_coords(x, y) {
    throw "not implemented";
  }
};

// A view where only the top card is ever visible (used for foundations).
class View extends _View {
  update_with(cs) {
    this.draw_into(this._context, cs, !cs.length);
    if(this._counter) this._counter.textContent = this.pile.counter;
  }

  draw_into(ctx, cards, draw_background) {
    clear_and_resize_canvas(ctx, gCardWidth, gCardHeight);
    if(draw_background) this._draw_background_into(ctx);
    if(cards.length) drawCard(ctx, cards[cards.length - 1], 0, 0);
  }

  draw_hint_destination(cards) {
    const tmp = gTemporaryCanvasContext.get();
    this.draw_into(tmp, cards, false);
    this._draw_hint_destination(tmp, 0, 0);
  }

  cseq_at_coords(x, y) {
    return CardSequence.from_card(this.pile.lastCard);
  }
};

class CountedView extends View {
  constructor() {
    super();
    this.init_counter();
  }
};

class _FanView extends _View {
  constructor() {
    super();

    this.canvas_width = gCardWidth;
    this.canvas_height = gCardHeight;

    // Should the Layout update .canvas_width and/or .canvas_height when the window is resized?
    this.update_canvas_width_on_resize = false;
    this.update_canvas_height_on_resize = false;

    // Canvas-pixel offsets between each card.
    this._fan_x_offset = 0;
    this._fan_y_offset = 0;
  }

  update_with(cs) {
    this._recalculate_offsets(cs.length);
    this.draw_into(this._context, cs, !cs.length || this._always_draw_background);
    if(this._counter) this._counter.textContent = this.pile.counter;
  }

  // Update the view's offsets to allow the specified number of cards to fit in the space.  Only implemented in _FlexFanView.
  _recalculate_offsets(num) {
  }

  draw_into(ctx, cards, draw_background, use_minimum_size) {
    // The complexity around width/height is to make hint-destinations display correctly.  We need the pile's own <canvas> to use all the available space so that if we later paint a hint destination into it, it's big enough to show (and doesn't get clipped at the bottom/right edge of the final card).  But we need the <canvas> used for the hint-destination cards to be conservatively sized so that when we composite it into the main canvas, we don't end up with a big translucent white box extending beyond the cards.
    const num = cards.length, xo = this._fan_x_offset, yo = this._fan_y_offset;
    const width = use_minimum_size ? (num - 1) * xo + gCardWidth : this.canvas_width;
    const height = use_minimum_size ? (num - 1) * yo + gCardHeight : this.canvas_height;
    clear_and_resize_canvas(ctx, width, height);
    if(draw_background) this._draw_background_into(ctx);
    for(let i = 0; i !== num; ++i) drawCard(ctx, cards[i], xo * i, yo * i);
  }

  coords_of_card(card) {
    return { x: card.index * this._fan_x_offset, y: card.index * this._fan_y_offset };
  }

  draw_hint_destination(cards) {
    const rect = this.get_next_card_xy();
    const tmp = gTemporaryCanvasContext.get();
    this.draw_into(tmp, cards, false, true);
    this._draw_hint_destination(tmp, rect.x, rect.y);
  }

  _get_hint_source_rect(card) {
    const offset = card.index, size = this.pile.cards.length - 1 - card.index;
    const xo = this._fan_x_offset, yo = this._fan_y_offset;
    return { x: offset * xo, y: offset * yo, w: size * xo + gCardWidth, h: size * yo + gCardHeight };
  }

  get_next_card_xy() {
    const offset = this._get_next_card_offset();
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  }

  _get_next_card_offset() {
    return this.pile.cards.length;
  }

  cseq_at_coords(x, y) {
    return CardSequence.from_card(this._get_target_card_at_relative_coords_from_list(x, y, this.pile.cards));
  }

  // handles only purely-horizontal or purely-vertical fans
  _get_target_card_at_relative_coords_from_list(x, y, cards) {
    if(this._fan_x_offset) return this._get_target_card_at_relative_coords_from_list2(x, this._fan_x_offset, gCardWidth, cards);
    return this._get_target_card_at_relative_coords_from_list2(y, this._fan_y_offset, gCardHeight, cards);
  }

  _get_target_card_at_relative_coords_from_list2(pos, offset, cardsize, cards) {
    const ix = Math.floor(pos / offset);
    if(cards[ix]) return cards[ix];
    return pos < (cards.length - 1) * offset + cardsize ? cards[cards.length - 1] : null;
  }
};

class _FixedFanView extends _FanView {
  constructor(options) {
    super();
    this._always_draw_background = true;
    if(options.horizontal) {
      this.canvas_width = gCardWidth + (options.capacity - 1) * gHFanOffset;
      this._fan_x_offset = gHFanOffset;
    } else {
      this.canvas_height = gCardHeight + (options.capacity - 1) * gVFanOffset;
      this._fan_y_offset = gVFanOffset;
    }
  }
};

class _SelectiveFanView extends _FixedFanView {
  _visible_cards_of(cs) {
    throw "not implemented";
  }

  update_with(cards) {
    return super.update_with(this._visible_cards_of(cards));
  }

  coords_of_card(card) {
    const offset = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  }

  cseq_at_coords(x, y) {
    return CardSequence.from_card(this._get_target_card_at_relative_coords_from_list(x, y, this._visible_cards_of(this.pile.cards)))
  }

  _get_hint_source_rect(card) {
    // Only the top card will ever be the source of a hint.
    const num = this._visible_cards_of(this.pile.cards).indexOf(card);
    return { x: num * this._fan_x_offset, y: num * this._fan_y_offset, w: gCardWidth, h: gCardHeight };
  }

  // Subclasses will need to override ._get_next_card_offset(), except for waste-pile views, where it's irrelevant.
};

// A fan that stretches in one dimension, and varies the card offset so all its cards always visible
class _FlexFanView extends _FanView {
  constructor() {
    super();
    this.needs_update_on_resize = true;
    this._fan_x_default_offset = 0;
    this._fan_y_default_offset = 0;
  }

  _recalculate_offsets(num) {
    const xo = this._fan_x_default_offset, yo = this._fan_y_default_offset;
    if(xo) this._fan_x_offset = this._calculate_new_offset(xo, this.canvas_width - gCardWidth, num);
    if(yo) this._fan_y_offset = this._calculate_new_offset(yo, this.canvas_height - gCardHeight, num);
  }

  _calculate_new_offset(preferred_offset, available_space, num_cards) {
    let offset = Math.min(num_cards ? available_space / (num_cards - 1) : available_space, preferred_offset);
    if(offset > 2) offset = Math.floor(offset); // use integer offsets if possible, to avoid fuzzyness
    return offset;
  }

  _draw_background_into(ctx) {
    super._draw_background_into(ctx, gCardWidth, gCardHeight);
  }
};

class FanDownView extends _FlexFanView {
  constructor() {
    super();
    this.update_canvas_height_on_resize = true;
    this._fan_y_default_offset = gVFanOffset;
  }
};

class FanRightView extends _FlexFanView {
  constructor() {
    super();
    this.update_canvas_width_on_resize = true;
    this._fan_x_default_offset = gHFanOffset;
  }
};

class _SlideView extends _FlexFanView {
  constructor(options) {
    super();
    this._fan_x_default_offset = gHSlideOffset;
    this._fan_y_default_offset = gVSlideOffset;
    if(options && options.slide_capacity) {
      this.canvas_width = gCardWidth + (options.slide_capacity - 1) * gHSlideOffset;
      this.canvas_height = gCardHeight + (options.slide_capacity - 1) * gVSlideOffset;
    }
  }
  cseq_at_coords(x, y) {
    // This implementation is sufficient for all the games it's currently used in.
    return CardSequence.from_card(this.pile.lastCard);
  }
};

class _Deal3WasteView extends _SelectiveFanView {
  _visible_cards_of(cards) {
    if(!cards.length) return [];
    const first = this.pile.deal3t - this.pile.deal3v;
    if(cards.length <= first) return cards.slice(-1);
    return cards.slice(first);
  }
};

class Deal3HWasteView extends _Deal3WasteView {
  constructor() {
    super({ capacity: 3, horizontal: true });
    this.init_counter();
  }
};

class Deal3VWasteView extends _Deal3WasteView {
  constructor() {
    super({ capacity: 3, horizontal: false });
    this.init_counter();
  }
};

// Shows the top *two* cards, so you can tell if they have the same number.
class DoubleSolFoundationView extends _SelectiveFanView {
  constructor() {
    super({ capacity: 2, horizontal: true });
  }
  _visible_cards_of(cards) {
    return cards.slice(-2);
  }
  _get_next_card_offset() {
    return this.pile.cards.length ? 1 : 0;
  }
};

class RegimentSlideView extends _SlideView {
  constructor() {
    super({ slide_capacity: 13 });
  }
};

class Mod3SlideView extends _SlideView {
  constructor() {
    super({ slide_capacity: 4 });
  }
};

class PileOnView4 extends _FixedFanView {
  constructor() {
    super({ capacity: 4, horizontal: true });
  }
};

class PileOnView8 extends _FixedFanView {
  constructor() {
    super({ capacity: 8, horizontal: true });
  }
};

class PyramidView extends View {
  constructor() {
    super();
    // In TriPeaks, cards in the peaks should only be face-up when there are no cards on top of them.  It's simpler to handle this at the View level rather than the Pile level.
    this._draw_covered_cards_face_down = false;

    // We need this <div> to set a minimum-width on and thus space the piles out properly (the <canvas> is position:absolute).
    // Note: you might expect the <div> to need position:relative too to get the <canvas> in the right place, but actually setting that makes the <canvas> invisible (I don't know why).  It works fine without it, because we're leaving top/left unspecified (rather than setting them to 0), so the <canvas> retains the position it would've got from position:static, rather than being positioned relative to the nearest position:relative/absolute ancestor.
    const wrapper = this._root_node = document.createElement("div");
    wrapper.className = "pyramid-pile-wrapper";
    wrapper.appendChild(this._canvas);
  }
  update_with(cs) {
    if(this._draw_covered_cards_face_down &&
        ((this.pile.leftChild && this.pile.leftChild.hasCards) || (this.pile.rightChild && this.pile.rightChild.hasCards))
    ) {
      clear_and_resize_canvas(this._context, gCardWidth, gCardHeight);
      draw_card_by_name(this._context, 0, 0, "");
    } else {
      super.update_with(cs);
    }
    // We want empty piles to be hidden, so mouse clicks go to any pile that was overlapped instead.  But not for piles at the root of a pyramid (where we draw the empty-pile graphic instead).
    if(this.pile.leftParent || this.pile.rightParent) this._canvas.style.display = cs.length ? "block" : "none";
    if(this._draw_covered_cards_face_down) {
      if(this.pile.leftParent) this.pile.leftParent.view.update();
      if(this.pile.rightParent) this.pile.rightParent.view.update();
    }
  }
};

class TriPeaksView extends PyramidView {
  constructor() {
    super();
    this._draw_covered_cards_face_down = true;
  }
};

// Just displays Kings from the start of each King->Ace run.
class _SpiderFoundationView extends _SelectiveFanView {
  _visible_cards_of(cards) {
    return cards.filter((el, ix) => ix % 13 === 0);
  }
  _get_next_card_offset() {
    return this.pile.cards.length / 13;
  }
};

class Spider4FoundationView extends _SpiderFoundationView {
  constructor() {
    super({ capacity: 4, horizontal: false });
  }
};

class Spider8FoundationView extends _SpiderFoundationView {
  constructor() {
    super({ capacity: 8, horizontal: false });
  }
};

// Shows the bottom cards and the top one, so you can tell whether pile is being built up or down.
class UnionSquarePileView extends _SelectiveFanView {
  constructor() {
    super({ capacity: 2, horizontal: true });
  }
  _visible_cards_of(cards) {
    if(cards.length > 1) return [cards[0], cards[cards.length - 1]];
    return cards.slice(0, 1);
  }
  _get_next_card_offset() {
    return this.pile.cards.length ? 1 : 0;
  }
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
class UnionSquareFoundationView extends _SelectiveFanView {
  constructor() {
    super({ capacity: 2, horizontal: true });
  }
  _visible_cards_of(cards) {
    if(cards.length > 13) return [cards[12], cards[cards.length - 1]];
    return cards.slice(-1);
  }
  _get_next_card_offset() {
    return this.pile.cards.length >= 13 ? 1 : 0;
  }
};

class StockView extends View {
  constructor() {
    super();
    this.init_counter();
  }
  cseq_at_coords(x, y) {
    return CardSequence.from_card(this.pile.lastCard || this.pile.magic_stock_stub_card || null);
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
