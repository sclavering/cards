interface ViewCoord {
  x: number;
  y: number;
}
interface ViewRect extends ViewCoord {
  w: number;
  h: number;
}

const g_v_fan_offset = 25; // num pixels between top edges of two cards in a vertical fan
const g_h_fan_offset = 15; // num pixels between left edges of two cards in a horizontal fan
const g_v_slide_offset = 1; // like above, for "slide" piles (compact stacks)
const g_h_slide_offset = 2;
const g_card_height = 123;
const g_card_width = 79;
const g_spacer_size = 10;

const MAGIC_PLACEHOLDER_TO_DRAW_FACEDOWN_CARD: Card = (0 as any);


var g_card_image_offsets: { [card: number]: number } = null;

function draw_card(canvascx: CanvasRenderingContext2D, card: Card, x: number, y: number): void {
  if(!g_card_image_offsets) init_card_image_offsets();
  // The "as any" is because the Card interface is a lie, and they're really just integers.
  const src_y = g_card_image_offsets[card as any] * g_card_height;
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  const scale_factor = retina_scale_factor();
  canvascx.drawImage(ui.card_images, 0, src_y * scale_factor, g_card_width * scale_factor, g_card_height * scale_factor, x, y, g_card_width, g_card_height);
}

function init_card_image_offsets(): void {
  g_card_image_offsets = {};
  const face_down_image_ix = 4 * 13; // The face-down card image is last.
  const suit_order_in_image: LookupBySuit<number> = { [Suit.S]: 0, [Suit.H]: 1, [Suit.D]: 2, [Suit.C]: 3 };
  for(let s in suit_order_in_image) {
    for(let num = 1; num !== 14; ++num) {
      g_card_image_offsets[make_card(num, +s, true) as any] = suit_order_in_image[s] * 13 + num - 1;
      g_card_image_offsets[make_card(num, +s, false) as any] = face_down_image_ix;
    }
  }
  g_card_image_offsets[MAGIC_PLACEHOLDER_TO_DRAW_FACEDOWN_CARD as any] = face_down_image_ix;
};



// Base class for pile views.
abstract class _View {
  _canvas: HTMLCanvasElement;
  _root_node: Node;
  _context: CanvasRenderingContext2D;
  _counter: HTMLElement;
  needs_update_on_resize: boolean;
  pile: AnyPile;

  // Note: these are only set on _FanView
  public update_canvas_width_on_resize?: boolean;
  public update_canvas_height_on_resize: boolean;
  public canvas_width?: number;
  public canvas_height?: number;

  constructor() {
    this.needs_update_on_resize = false;

    this._canvas = document.createElement("canvas");
    this._root_node = this._canvas;
    this._context = this._canvas.getContext("2d");
    this._counter = null;
  }

  public mark_canvas_for_event_handling(attr: string, val: string): void {
    this._canvas.setAttribute(attr, val);
  }

  // This is intended to be called by subclasses in their constructor.  It exists here both because a variety of different subclasses want it, and because it'd be fragile to have subclasses fiddling with the structure of the HTML.
  init_counter(): void {
    this._root_node = document.createDocumentFragment();
    this._root_node.appendChild(this._canvas);
    this._counter = this._root_node.appendChild(document.createElement("div")) as HTMLElement;
    this._counter.className = "counter";
  }

  // Attach this view to a Pile
  attach(pile: AnyPile): void {
    this.pile = pile;
    this.update();
  }

  insert_into(parent_node: Node): void {
    parent_node.appendChild(this._root_node);
  }

  pixel_rect(): ClientRect {
    return this._canvas.getBoundingClientRect();
  }

  // Redraw the pile.
  update(): void {
    const cs = this.pile.cards;
    this.update_with(cs);
  }

  // Show the supplied array of cards (which may be a prefix of pile's cards, during animation or dragging).
  abstract update_with(cards: Card[]): void;

  protected draw_background_into(ctx: CanvasRenderingContext2D, width?: number, height?: number): void {
    this._context.strokeStyle = "white";
    this._context.lineWidth = 2;
    const scale_factor = retina_scale_factor();
    round_rect_path(ctx, 1.5, 1.5, (width || ctx.canvas.width / scale_factor) - 3, (height || ctx.canvas.height / scale_factor) - 3, 5);
    this._context.stroke();
  }

  abstract draw_into(ctx: CanvasRenderingContext2D, cards: Card[], draw_background: boolean): void;

  coords_of_card(cseq: CardSequence): ViewCoord {
    return { x: 0, y: 0 };
  }

  show_hint_source(cseq: CardSequence): void {
    const rect = this.get_hint_source_rect(cseq);
    this._context.fillStyle = "darkgrey";
    this._context.globalAlpha = 0.3;
    this._context.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  protected get_hint_source_rect(cseq: CardSequence): ViewRect {
    return { x: 0, y: 0, w: g_card_width, h: g_card_height };
  }

  // Receives an array of cards that are currently in another pile but which the hint suggests moving to this pile.
  // This method should render them into a temporary canvas, and then call ._draw_hint_destination(), which will render them ghosted out over the existing cards.
  abstract draw_hint_destination(cards: Card[]): void;

  _draw_hint_destination(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const canvas = ctx.canvas;
    this._context.globalAlpha = 0.9;
    this._context.fillStyle = "white";
    const scale_factor = retina_scale_factor();
    this._context.fillRect(x + 1, y + 1, canvas.width / scale_factor - 2, canvas.height / scale_factor - 2);
    this._context.globalAlpha = 0.4;
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    this._context.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, canvas.width / scale_factor, canvas.height / scale_factor);
  }

  // Return relative CSS-pixel coords for where a card being added should be displayed, both for animated moves and for hints.
  get_next_card_xy(): ViewCoord {
    return { x: 0, y: 0 };
  }

  // Return a CardSequence (or null) for the card at the specified coords within the View's Pile.
  abstract cseq_at_coords(x: number, y: number): CardSequence;

  public handle_click_at(x: number, y: number): Action {
    const cseq = this.cseq_at_coords(x, y);
    return cseq ? this.pile.action_for_click(cseq) : null;
  }
};

// A view where only the top card is ever visible (used for foundations).
class View extends _View {
  update_with(cs: Card[]): void {
    this.draw_into(this._context, cs, !cs.length);
    if(this._counter) this._counter.textContent = this.pile.counter.toString();
  }

  draw_into(ctx: CanvasRenderingContext2D, cards: Card[], draw_background: boolean): void {
    clear_and_resize_canvas(ctx, g_card_width, g_card_height);
    if(draw_background) this.draw_background_into(ctx);
    if(cards.length) draw_card(ctx, cards[cards.length - 1], 0, 0);
  }

  draw_hint_destination(cards: Card[]): void {
    const tmp = g_temporary_canvas_context.get();
    this.draw_into(tmp, cards, false);
    this._draw_hint_destination(tmp, 0, 0);
  }

  cseq_at_coords(x: number, y: number): CardSequence {
    return this.pile.cseq_at_negative(-1);
  }
};

class CountedView extends View {
  constructor() {
    super();
    this.init_counter();
  }
};

class _FanView extends _View {
  protected _fan_x_offset: number;
  protected _fan_y_offset: number;
  protected _always_draw_background: boolean;

  constructor() {
    super();

    this.canvas_width = g_card_width;
    this.canvas_height = g_card_height;

    // Should the Layout update .canvas_width and/or .canvas_height when the window is resized?
    this.update_canvas_width_on_resize = false;
    this.update_canvas_height_on_resize = false;

    // Canvas-pixel offsets between each card.
    this._fan_x_offset = 0;
    this._fan_y_offset = 0;
  }

  update_with(cs: Card[]): void {
    this.recalculate_offsets(cs.length);
    this.draw_into(this._context, cs, !cs.length || this._always_draw_background);
    if(this._counter) this._counter.textContent = this.pile.counter.toString();
  }

  // Update the view's offsets to allow the specified number of cards to fit in the space.  Only implemented in _FlexFanView.
  protected recalculate_offsets(num: number): void {
  }

  draw_into(ctx: CanvasRenderingContext2D, cards: Card[], draw_background: boolean, use_minimum_size?: boolean): void {
    // The complexity around width/height is to make hint-destinations display correctly.  We need the pile's own <canvas> to use all the available space so that if we later paint a hint destination into it, it's big enough to show (and doesn't get clipped at the bottom/right edge of the final card).  But we need the <canvas> used for the hint-destination cards to be conservatively sized so that when we composite it into the main canvas, we don't end up with a big translucent white box extending beyond the cards.
    const num = cards.length, xo = this._fan_x_offset, yo = this._fan_y_offset;
    const width = use_minimum_size ? (num - 1) * xo + g_card_width : this.canvas_width;
    const height = use_minimum_size ? (num - 1) * yo + g_card_height : this.canvas_height;
    clear_and_resize_canvas(ctx, width, height);
    if(draw_background) this.draw_background_into(ctx);
    for(let i = 0; i !== num; ++i) draw_card(ctx, cards[i], xo * i, yo * i);
  }

  coords_of_card(cseq: CardSequence): ViewCoord {
    return { x: cseq.index * this._fan_x_offset, y: cseq.index * this._fan_y_offset };
  }

  draw_hint_destination(cards: Card[]): void {
    const rect = this.get_next_card_xy();
    const tmp = g_temporary_canvas_context.get();
    this.draw_into(tmp, cards, false, true);
    this._draw_hint_destination(tmp, rect.x, rect.y);
  }

  protected get_hint_source_rect(cseq: CardSequence): ViewRect {
    const size = this.pile.cards.length - 1 - cseq.index;
    const xo = this._fan_x_offset, yo = this._fan_y_offset;
    return { x: cseq.index * xo, y: cseq.index * yo, w: size * xo + g_card_width, h: size * yo + g_card_height };
  }

  get_next_card_xy(): ViewCoord {
    const offset = this.get_next_card_offset();
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  }

  protected get_next_card_offset(): number {
    return this.pile.cards.length;
  }

  cseq_at_coords(x: number, y: number): CardSequence {
    return this.pile.cseq_at(this.index_of_card_at_coords(x, y, this.pile.cards.length));
  }

  // Returns -1 for no-card.
  protected index_of_card_at_coords(x: number, y: number, num_cards: number): number {
    // Handles only purely-horizontal or purely-vertical fans, which is sufficient for now.
    if(this._fan_x_offset) return this._get_index_of_card_at_coord(x, this._fan_x_offset, g_card_width, num_cards);
    return this._get_index_of_card_at_coord(y, this._fan_y_offset, g_card_height, num_cards);
  }

  private _get_index_of_card_at_coord(coord: number, offset: number, card_size: number, num_cards: number): number | null {
    const ix = Math.floor(coord / offset);
    if(ix < num_cards) return ix;
    return coord < (num_cards - 1) * offset + card_size ? num_cards - 1 : -1;
  }
};

class _FixedFanView extends _FanView {
  constructor(options: { horizontal: boolean; capacity: number }) {
    super();
    this._always_draw_background = true;
    if(options.horizontal) {
      this.canvas_width = g_card_width + (options.capacity - 1) * g_h_fan_offset;
      this._fan_x_offset = g_h_fan_offset;
    } else {
      this.canvas_height = g_card_height + (options.capacity - 1) * g_v_fan_offset;
      this._fan_y_offset = g_v_fan_offset;
    }
  }
};

abstract class _SelectiveFanView extends _FixedFanView {
  protected abstract visible_cards_of(cards: Card[]): Card[];

  update_with(cs: Card[]): void {
    return super.update_with(this.visible_cards_of(cs));
  }

  coords_of_card(cseq: CardSequence): ViewCoord {
    const offset = this.visible_cards_of(this.pile.cards).indexOf(cseq.first);
    return { x: offset * this._fan_x_offset, y: offset * this._fan_y_offset };
  }

  cseq_at_coords(x: number, y: number): CardSequence {
    // Making this implementation fully generally would be somewhat hard, and completely pointless, as the only cases that matter are those where no cards can be removed (_SpiderFoundationView) and those where only the top card can be removed (most others).  In the latter case the logical top card is always the top visible card, so we can cheat a lot.
    const visible = this.visible_cards_of(this.pile.cards);
    const target_visible_ix = this.index_of_card_at_coords(x, y, visible.length);
    if(target_visible_ix !== visible.length - 1) return null;
    // This check is just paranoia - it'd apply to _SpiderFoundationView, but .may_take() would return false anyway.
    if(visible[target_visible_ix] !== this.pile.last_card) return null;
    return this.pile.cseq_at_negative(-1);
  }

  protected get_hint_source_rect(cseq: CardSequence): ViewRect {
    // Only the top card will ever be the source of a hint.
    const num = this.visible_cards_of(this.pile.cards).indexOf(cseq.first);
    return { x: num * this._fan_x_offset, y: num * this._fan_y_offset, w: g_card_width, h: g_card_height };
  }

  // Subclasses will need to override .get_next_card_offset(), except for waste-pile views, where it's irrelevant.
};

// A fan that stretches in one dimension, and varies the card offset so all its cards always visible
class _FlexFanView extends _FanView {
  protected _fan_x_default_offset: number;
  protected _fan_y_default_offset: number;

  constructor() {
    super();
    this.needs_update_on_resize = true;
    this._fan_x_default_offset = 0;
    this._fan_y_default_offset = 0;
  }

  protected recalculate_offsets(num: number): void {
    const xo = this._fan_x_default_offset, yo = this._fan_y_default_offset;
    if(xo) this._fan_x_offset = this.calculate_new_offset(xo, this.canvas_width - g_card_width, num);
    if(yo) this._fan_y_offset = this.calculate_new_offset(yo, this.canvas_height - g_card_height, num);
  }

  // prepare_freecell_move_animation() needs this
  public calculate_new_offset(preferred_offset: number, available_space: number, num_cards: number): number {
    let offset = Math.min(num_cards ? available_space / (num_cards - 1) : available_space, preferred_offset);
    if(offset > 2) offset = Math.floor(offset); // use integer offsets if possible, to avoid fuzzyness
    return offset;
  }

  protected draw_background_into(ctx: CanvasRenderingContext2D, width?: number, height?: number): void {
    super.draw_background_into(ctx, g_card_width, g_card_height);
  }
};

class FanDownView extends _FlexFanView {
  constructor() {
    super();
    this.update_canvas_height_on_resize = true;
    this._fan_y_default_offset = g_v_fan_offset;
  }
};

class FanRightView extends _FlexFanView {
  constructor() {
    super();
    this.update_canvas_width_on_resize = true;
    this._fan_x_default_offset = g_h_fan_offset;
  }
};

class _SlideView extends _FlexFanView {
  constructor(options: { slide_capacity: number }) {
    super();
    this._fan_x_default_offset = g_h_slide_offset;
    this._fan_y_default_offset = g_v_slide_offset;
    if(options && options.slide_capacity) {
      this.canvas_width = g_card_width + (options.slide_capacity - 1) * g_h_slide_offset;
      this.canvas_height = g_card_height + (options.slide_capacity - 1) * g_v_slide_offset;
    }
  }
  cseq_at_coords(x: number, y: number): CardSequence {
    // This implementation is sufficient for all the games it's currently used in.
    return this.pile.cseq_at_negative(-1);
  }
};

abstract class DealThreeWasteView extends _SelectiveFanView {
  protected visible_cards_of(cards: Card[]): Card[] {
    if(!cards.length) return [];
    const first = (this.pile as DealThreeWaste).first_visible_index;
    if(cards.length <= first) return cards.slice(-1);
    return cards.slice(first);
  }
};

class DealThreeWasteHorizontalView extends DealThreeWasteView {
  constructor() {
    super({ capacity: 3, horizontal: true });
    this.init_counter();
  }
};

class DealThreeWasteVerticalView extends DealThreeWasteView {
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
  protected visible_cards_of(cards: Card[]): Card[] {
    return cards.slice(-2);
  }
  protected get_next_card_offset(): number {
    return this.pile.cards.length ? 1 : 0;
  }
};

class RegimentSlideView extends _SlideView {
  constructor() {
    super({ slide_capacity: 13 });
  }
};

class RegimentPileView extends RegimentSlideView {
  draw_into(ctx: CanvasRenderingContext2D, cards: Card[], draw_background: boolean, use_minimum_size?: boolean): void {
    super.draw_into(ctx, cards, draw_background, use_minimum_size);
    if(cards.length <= 1) return;

    let prev: Card | null = null;
    let up = false, down = false;
    for(let c of cards) {
      if(prev && is_next(prev, c)) up = true;
      if(prev && is_next(c, prev)) down = true;
      prev = c;
    }

    const x_mid = ctx.canvas.width - 10;
    // This is quite high so that even when a pile has >13 cards in, the arrow remains over the face of the top card, rather than the edges of the cards beneath it (where it would be much harder to see).
    const y_top = 9;
    const head_half_w = 6;
    const head_h = 7;
    const connector_half_w = 2;
    const connector_half_h = 3;
    const y_mid = y_top + head_h + connector_half_h; 
    ctx.beginPath();
    ctx.moveTo(x_mid - connector_half_w, y_mid);
    if(up) {
      ctx.lineTo(x_mid - connector_half_w, y_mid - connector_half_h);
      ctx.lineTo(x_mid - head_half_w, y_mid - connector_half_h);
      ctx.lineTo(x_mid, y_mid - connector_half_h - head_h);
      ctx.lineTo(x_mid + head_half_w, y_mid - connector_half_h);
      ctx.lineTo(x_mid + connector_half_w, y_mid - connector_half_h);
    } else {
      ctx.lineTo(x_mid - connector_half_w, y_mid - connector_half_h - head_h);
      ctx.lineTo(x_mid + connector_half_w, y_mid - connector_half_h - head_h);
    }
    if(down) {
      ctx.lineTo(x_mid + connector_half_w, y_mid + connector_half_h);
      ctx.lineTo(x_mid + head_half_w, y_mid + connector_half_h);
      ctx.lineTo(x_mid, y_mid + connector_half_h + head_h);
      ctx.lineTo(x_mid - head_half_w, y_mid + connector_half_h);
      ctx.lineTo(x_mid - connector_half_w, y_mid + connector_half_h);
    } else {
      ctx.lineTo(x_mid + connector_half_w, y_mid + connector_half_h + head_h);
      ctx.lineTo(x_mid - connector_half_w, y_mid + connector_half_h + head_h);
    }
    ctx.closePath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
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
  protected _draw_covered_cards_face_down: boolean;

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
  update_with(cs: Card[]): void {
    const pile = this.pile as BasePyramidPile;
    if(this._draw_covered_cards_face_down && ((pile.left_child && pile.left_child.cards.length) || (pile.right_child && pile.right_child.cards.length))) {
      clear_and_resize_canvas(this._context, g_card_width, g_card_height);
      draw_card(this._context, MAGIC_PLACEHOLDER_TO_DRAW_FACEDOWN_CARD, 0, 0);
    } else {
      super.update_with(cs);
    }
    // We want empty piles to be hidden, so mouse clicks go to any pile that was overlapped instead.  But not for piles at the root of a pyramid (where we draw the empty-pile graphic instead).
    if(pile.left_parent || pile.right_parent) this._canvas.style.display = cs.length ? "block" : "none";
    if(this._draw_covered_cards_face_down) {
      if(pile.left_parent) pile.left_parent.view.update();
      if(pile.right_parent) pile.right_parent.view.update();
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
  protected visible_cards_of(cards: Card[]): Card[] {
    return cards.filter((el, ix) => ix % 13 === 0);
  }
  protected get_next_card_offset(): number {
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
  protected visible_cards_of(cards: Card[]): Card[] {
    if(cards.length > 1) return [cards[0], cards[cards.length - 1]];
    return cards.slice(0, 1);
  }
  protected get_next_card_offset(): number {
    return this.pile.cards.length ? 1 : 0;
  }
};

// Built A->K, and then K->A on top of those. We show the top card of each 13.
class UnionSquareFoundationView extends _SelectiveFanView {
  constructor() {
    super({ capacity: 2, horizontal: true });
  }
  protected visible_cards_of(cards: Card[]): Card[] {
    if(cards.length > 13) return [cards[12], cards[cards.length - 1]];
    return cards.slice(-1);
  }
  protected get_next_card_offset(): number {
    return this.pile.cards.length >= 13 ? 1 : 0;
  }
};

class StockView extends View {
  constructor() {
    super();
    this.init_counter();
  }
  // Stock piles hold their cards face-up (for convenience), and we just draw them face down.
  draw_into(ctx: CanvasRenderingContext2D, cards: Card[], draw_background: boolean): void {
    clear_and_resize_canvas(ctx, g_card_width, g_card_height);
    if(draw_background) this.draw_background_into(ctx);
    if(cards.length) draw_card(ctx, MAGIC_PLACEHOLDER_TO_DRAW_FACEDOWN_CARD, 0, 0);
  }
  public handle_click_at(x: number, y: number): Action {
    // We must override this to support RefillStock actions when clicking on an empty stock.
    return (this.pile as Stock).deal();
  }
};


class g_temporary_canvas_context {
  static _context: CanvasRenderingContext2D;
  static get() {
    return this._context || (this._context = document.createElement("canvas").getContext("2d"));
  }
};

function clear_and_resize_canvas(context: CanvasRenderingContext2D, width: number, height: number): CanvasRenderingContext2D {
  const scale_factor = retina_scale_factor();
  context.canvas.width = width * scale_factor;
  context.canvas.style.width = width + "px";
  context.canvas.height = height * scale_factor;
  context.canvas.style.height = height + "px";
  // So drawing works in non-retina coords, effectively.
  context.setTransform(scale_factor, 0, 0, scale_factor, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
};

function round_rect_path(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
