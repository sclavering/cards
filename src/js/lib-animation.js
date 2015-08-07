const gAnimations = {
  _timeouts: [],
  _on_cancel: [],
  _items: [],

  // the second arg is the delay *relative* to the previous scheduled timer
  schedule: function(relative_delay, func) {
    this._items.push([relative_delay, func]);
  },

  // pass (function, arg1, arg2, ...)
  on_cancel: function(func) {
    this._on_cancel.push(func);
  },

  run: function() {
    let time = 0;
    for(let [relative_delay, func] of this._items) {
      time += relative_delay;
      this._timeouts.push(setTimeout(func, time));
    }
    this._items = [];
  },

  cancel: function() {
    for(let t of this._timeouts) clearTimeout(t);
    for(let func of this._on_cancel) func();
    this._timeouts = [];
    this._on_cancel = [];
    // xxx kill this
    FreeCellMover.interrupt();
  },
};


const kAnimationDelay = 30;

function moveCards(firstCard, target, doneFunc) {
  const card = firstCard, origin = card.pile;
  if(gFloatingPile.lastCard !== card) origin.view.updateForAnimationOrDrag(card);
  const finalOffset = target.view.get_next_card_xy();

  // final coords (relative to ui.gameStack)
  const r = target.view.pixelRect();
  const tx = r.left + finalOffset.x;
  const ty = r.top + finalOffset.y;

  scheduleAnimatedMove(gFloatingPile._left, gFloatingPile._top, tx, ty);
  gAnimations.schedule(0, () => moveCards_callback(target, doneFunc));
  gAnimations.on_cancel(() => moveCards_callback(target, null));
};

function moveCards_callback(target, extraFunc) {
  target.view.update();
  gFloatingPileNeedsHiding = true;
  if(extraFunc) extraFunc();
}

// Schedule timeouts to slide the floating pile from (x0, y0) to (x1, y1)
function scheduleAnimatedMove(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  // Move 55px diagonally per step, adjusted to make all steps equal-sized.
  const steps = Math.round(Math.sqrt(dx * dx + dy * dy) / 55);
  if(!steps) return;
  const stepX = dx / steps, stepY = dy / steps;
  const step_func = () => gFloatingPile.moveBy(stepX, stepY);
  // The +1 step shows the cards at their destination but still floating.  This makes animations look a little better if the pile is a flex-fan that will re-pack the cards once actually added.
  for(let i = 1; i <= steps + 1; ++i) gAnimations.schedule(kAnimationDelay, step_func);
}

function showHints(card, destinations) {
  const view = card.pile.view;
  view.highlightHintFrom(card);
  const hint_cards = card.pile.cards.slice(card.index);
  gAnimations.schedule(300, () => {
    for(let d of destinations) d.view.draw_hint_destination(hint_cards);
  });
  const end_hint = () => {
    for(let d of destinations) d.view.update();
    if(view) view.update();
  };
  gAnimations.schedule(1700, end_hint);
  gAnimations.on_cancel(end_hint);
  gAnimations.run();
}
