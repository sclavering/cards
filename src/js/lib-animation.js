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


const kAnimationDelay = 30;

function prepare_move_animation(card, target) {
  const steps = [];

  gFloatingPile.start_animation_or_drag(card);
  const finalOffset = target.view.get_next_card_xy();

  // final coords (relative to ui.gameStack)
  const r = target.view.pixelRect();
  const x1 = r.left + finalOffset.x, y1 = r.top + finalOffset.y;
  const x0 = gFloatingPile._left, y0 = gFloatingPile._top;

  const dx = x1 - x0, dy = y1 - y0;
  // Move 55px diagonally per step, adjusted to make all steps equal-sized.
  let num_steps = Math.round(Math.sqrt(dx * dx + dy * dy) / 55);
  // xxx not sure how best to handle the case where we're already really close.
  if(!num_steps) num_steps = 1;
  const stepX = dx / num_steps, stepY = dy / num_steps;
  const step_func = () => gFloatingPile.moveBy(stepX, stepY);
  // The +1 step shows the cards at their destination but still floating.  This makes animations look a little better if the pile is a flex-fan that will re-pack the cards once actually added.
  for(let i = 1; i <= num_steps + 1; ++i) steps.push([kAnimationDelay, step_func]);

  return { steps: steps, piles_to_update: [card.pile, target] };
}


function showHints(card, destinations) {
  const view = card.pile.view;
  view.highlightHintFrom(card);
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
    this._left = 0;
    this._top = 0;
  },

  boundingRect: function() { return this._canvas.getBoundingClientRect(); },

  // When dropping cards, moveCards() needs to if a drag was in progress so that it can animate from the drop, rather than from the original pile.  And in the current set-up, we need to track the source card/pile, or else all subsequent automoves would animate from the dragged card's source-pile, though that's probably just because we don't clear this field until .hide(), which gets deferred until after sequences of autoplay moves.
  _prev_card: null,

  hide: function() {
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
    const r = view.pixelRect();
    this.moveTo(r.left + coords.x, r.top + coords.y);
    const cards_remaining = pile.cards.slice(0, card.index);
    view.update_with(cards_remaining);
  },

  moveBy: function(dx, dy) {
    this.moveTo(this._left + dx, this._top + dy);
  },

  moveTo: function(x, y) {
    this._left = x;
    this._top = y;
    this._canvas.style.left = this._left + 'px';
    this._canvas.style.top = this._top + 'px';
  },
};
