const gAnimations = {
  _active: false,

  // args: {
  //   steps: [relative delay in ms, function],
  //   piles_to_update: [Pile],
  // },
  // onsuccess: optional function called after the animation completes
  run: function(args, onsuccess) {
    this._active = true;
    this._args = args;
    this._onsuccess = onsuccess || null;
    this._timeouts = [];
    let time = 0;
    for(let [relative_delay, func] of args.steps) {
      time += relative_delay;
      this._timeouts.push(setTimeout(func, time));
    }
    this._timeouts.push(setTimeout(() => gAnimations._finished(true), time));
  },

  cancel: function() {
    if(!this._active) return;
    if(this._timeouts) for(let t of this._timeouts) clearTimeout(t);
    this._finished(false);
  },

  _finished: function(success) {
    this._active = false;
    gFloatingPile.hide();
    for(let p of this._args.piles_to_update) p.view.update();
    const func = this._onsuccess;
    this._onsuccess = this._args = this._timeouts = null;
    if(success && func) func();
  },
};


const kAnimationDelay = 20;
const kAnimationRepackDelay = 100;

function prepare_move_animation(card, destination) {
  // xxx It's slightly icky that this line has immediate effect, rather than just preparing stuff to run later.
  gFloatingPile.start_animation_or_drag(card);
  const finalOffset = destination.view.get_next_card_xy(destination.cards);

  // final coords (relative to ui.gameStack)
  const r = destination.view.pixel_rect();
  const x1 = r.left + finalOffset.x, y1 = r.top + finalOffset.y;
  const r0 = gFloatingPile.boundingRect();
  const x0 = r0.x, y0 = r0.y;

  const transition_duration_ms = gFloatingPile.get_transition_duration_ms(x0, y0, x1, y1);
  const steps = [
    [0, function() { gFloatingPile.transition_from_to(x0, y0, x1, y1, transition_duration_ms); }],
    // The small extra delay also serves to briefly show the cards at their destination but still floating.  This makes animations look a little better if the pile is a flex-fan that will re-pack the cards once actually added.
    [transition_duration_ms + kAnimationDelay, function() {
      gFloatingPile._canvas.style.transition = "";
    }]
  ];
  return { steps: steps, piles_to_update: [card.pile, destination] };
}


function showHints(card, destinations) {
  const view = card.pile.view;
  view.show_hint_source(card);
  const hint_cards = card.pile.cards.slice(card.index);
  gAnimations.run({
    piles_to_update: destinations.concat(card.pile),
    steps: [
      [300, () => { for(let d of destinations) d.view.draw_hint_destination(hint_cards); }],
      [1700, () => null], // so hint stays visible a while
    ],
  });
}


// A <canvas/> used to show cards being dragged or animated.
const gFloatingPile = {
  init: function() {
    this._canvas = document.createElement("canvas");
    this._canvas.style.position = "absolute";
    document.body.appendChild(this._canvas);
    this.hide();
    this.context = this._canvas.getContext("2d");
  },

  boundingRect: function() { return this._canvas.getBoundingClientRect(); },

  // When dropping cards, moveCards() needs to if a drag was in progress so that it can animate from the drop, rather than from the original pile.  And in the current set-up, we need to track the source card/pile, or else all subsequent automoves would animate from the dragged card's source-pile, though that's probably just because we don't clear this field until .hide(), which gets deferred until after sequences of autoplay moves.
  _prev_card: null,

  hide: function() {
    gFloatingPile._canvas.style.transition = "";
    this.moveTo(-1000, -1000);
    this._prev_card = null;
  },

  start_animation_or_drag: function(card) {
    if(this._prev_card === card) return;
    this._prev_card = card;

    const pile = card.pile, view = pile.view;
    const cards_taken = pile.cards.slice(card.index);
    view.draw_into(this.context, cards_taken, false);
    const coords = view.coords_of_card(card);
    const r = view.pixel_rect();
    this.moveTo(r.left + coords.x, r.top + coords.y);
    const cards_remaining = pile.cards.slice(0, card.index);
    view.update_with(cards_remaining);
  },

  // It's always of just the top card
  start_freecell_animation: function(src, cards_remaining, moving_card, x, y) {
    const view = src.view;
    view.draw_into(this.context, [moving_card], false);
    this.moveTo(x, y);
    view.update_with(cards_remaining);
  },

  moveTo: function(x, y) {
    this._canvas.style.left = x + "px";
    this._canvas.style.top = y + "px";
  },

  transition_from_to: function(x0, y0, x1, y1, duration_ms) {
    this.moveTo(x0, y0);
    this._canvas.style.transition = "left " + duration_ms + "ms, top " + duration_ms + "ms";
    this.moveTo(x1, y1);
  },

  get_transition_duration_ms: function(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    // We move 55px diagonally per kAnimationDelay.  (This is left over from when animation was done without CSS transitions).
    return Math.round(Math.sqrt(dx * dx + dy * dy) / 55 * kAnimationDelay);
  },
};
