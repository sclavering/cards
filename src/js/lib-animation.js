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


var gFloatingPileNeedsHiding = false; // see done()

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
  lastCard: null,

  hide: function() {
    this.moveTo(-1000, -1000);
    this.lastCard = null;
    gFloatingPileNeedsHiding = false;
  },

  // Show at (x, y).  Caller must set the size and paint into the context first.
  // 'card' has to be stored so that animations starting after a drag look right
  showFor: function(card, x, y) {
    this.lastCard = card;
    this.moveTo(x, y);
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
