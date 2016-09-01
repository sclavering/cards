interface AnimationRunArgs {
  steps: [number, () => void][];
  piles_to_update?: AnyPile[];
}

class g_animations {
  static _active: boolean = false;
  static _args: AnimationRunArgs;
  static _onsuccess: () => void;
  static _timeouts: number[];

  // args: {
  //   steps: [relative delay in ms, function],
  //   piles_to_update: [Pile],
  // },
  // onsuccess: optional function called after the animation completes
  static run(args: AnimationRunArgs, onsuccess?: () => void): void {
    this._active = true;
    this._args = args;
    this._onsuccess = onsuccess || null;
    this._timeouts = [];
    let time = 0;
    for(let [relative_delay, func] of args.steps) {
      time += relative_delay;
      this._timeouts.push(setTimeout(func, time));
    }
    this._timeouts.push(setTimeout(() => g_animations._finished(true), time));
  }

  static cancel() {
    if(!this._active) return;
    if(this._timeouts) for(let t of this._timeouts) clearTimeout(t);
    this._finished(false);
  }

  static _finished(success) {
    this._active = false;
    g_floating_pile.hide();
    for(let p of this._args.piles_to_update) p.view.update();
    const func = this._onsuccess;
    this._onsuccess = this._args = this._timeouts = null;
    if(success && func) func();
  }
};


const k_animation_delay = 20;
const k_animation_repack_delay = 100;

function prepare_move_animation(card, destination) {
  // xxx It's slightly icky that this line has immediate effect, rather than just preparing stuff to run later.
  g_floating_pile.start_animation_or_drag(card);
  const final_offset = destination.view.get_next_card_xy(destination.cards);

  // final coords (relative to ui.gameStack)
  const r = destination.view.pixel_rect();
  const x1 = r.left + final_offset.x, y1 = r.top + final_offset.y;
  const r0 = g_floating_pile.bounding_rect();
  const x0 = r0.left, y0 = r0.top;

  const transition_duration_ms = g_floating_pile.get_transition_duration_ms(x0, y0, x1, y1);
  const steps = [
    [0, function() { g_floating_pile.transition_from_to(x0, y0, x1, y1, transition_duration_ms); }],
    // The small extra delay also serves to briefly show the cards at their destination but still floating.  This makes animations look a little better if the pile is a flex-fan that will re-pack the cards once actually added.
    [transition_duration_ms + k_animation_delay, function() {
      g_floating_pile._canvas.style.transition = "";
    }]
  ];
  return { steps: steps, piles_to_update: [card.pile, destination] };
}


function show_hints(card, destinations) {
  const view = card.pile.view;
  view.show_hint_source(card);
  const hint_cards = card.pile.cards.slice(card.index);
  g_animations.run({
    piles_to_update: destinations.concat(card.pile),
    steps: [
      [300, () => { for(let d of destinations) d.view.draw_hint_destination(hint_cards); }],
      [1700, () => null], // so hint stays visible a while
    ],
  });
}


// A <canvas/> used to show cards being dragged or animated.
class g_floating_pile {
  static _canvas: HTMLCanvasElement;
  static context: CanvasRenderingContext2D;
  static _prev_card: Card;

  static init() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.position = "absolute";
    // So people don't accidentally right-click and then pick the "View Image" item that's first in Firefox's menu.
    this._canvas.oncontextmenu = function(ev) { return false; };
    document.body.appendChild(this._canvas);
    this.hide();
    this.context = this._canvas.getContext("2d");
    this._prev_card = null;
  }

  static bounding_rect() {
    return this._canvas.getBoundingClientRect();
  }

  static hide() {
    g_floating_pile._canvas.style.transition = "";
    this.set_position(-1000, -1000);
    this._prev_card = null;
  }

  static start_animation_or_drag(card) {
    // If we're already dragging a card and are about to animate its drop onto a pile, we want the animation to run from the current location, not from the original pile.
    if(this._prev_card === card) return;
    this._prev_card = card;

    const pile = card.pile, view = pile.view;
    const cards_taken = pile.cards.slice(card.index);
    view.draw_into(this.context, cards_taken, false);
    const coords = view.coords_of_card(card);
    const r = view.pixel_rect();
    this.set_position(r.left + coords.x, r.top + coords.y);
    const cards_remaining = pile.cards.slice(0, card.index);
    view.update_with(cards_remaining);
  }

  // It's always of just the top card
  static start_freecell_animation(src, cards_remaining, moving_card, x, y) {
    const view = src.view;
    view.draw_into(this.context, [moving_card], false);
    this.set_position(x, y);
    view.update_with(cards_remaining);
  }

  static set_position(x, y) {
    this._canvas.style.left = x + "px";
    this._canvas.style.top = y + "px";
  }

  static transition_from_to(x0, y0, x1, y1, duration_ms) {
    this.set_position(x0, y0);
    this._canvas.style.transition = "left " + duration_ms + "ms, top " + duration_ms + "ms";
    this.set_position(x1, y1);
  }

  static get_transition_duration_ms(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    // We move 55px diagonally per k_animation_delay.  (This is left over from when animation was done without CSS transitions).
    return Math.round(Math.sqrt(dx * dx + dy * dy) / 55 * k_animation_delay);
  }
};
