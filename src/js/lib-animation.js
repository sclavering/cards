const animations = {
  _timeouts: [],
  _interrupts: [],
  _items: [],

  // the second arg is the delay *relative* to the previous scheduled timer
  schedule: function() { // func, delay, func_arg_1, ...
    this._items.push(Array.slice(arguments, 0));
  },

  setTimeouts: function() {
    var time = 0;
    for each(var item in this._items) {
      time = item[1] = item[1] + time;
      this._timeouts.push(setTimeout.apply(window, item));
    }
    this._items = [];
  },

  // pass (function, arg1, arg2, ...)
  onInterruptRun: function() {
    this._interrupts.push(Array.slice(arguments, 0));
  },

  interrupt: function() {
    for each(var t in this._timeouts) clearTimeout(t);
    for each(var i in this._interrupts)
      i[0].apply(window, i.slice(1));
    this._timeouts = [];
    this._interrupts = [];
    FreeCellMover.interrupt();
  }
};


const kAnimationDelay = 30;

function moveCards(firstCard, target, doneFunc) {
  const card = firstCard, origin = card.pile;
  if(gFloatingPile.lastCard !== card) origin.view.updateForAnimationOrDrag(card);
  const finalOffset = target.view.getAnimationDestination();

  // final coords (relative to ui.gameStack)
  const r = target.view.pixelRect();
  const tx = r.left + finalOffset.x;
  const ty = r.top + finalOffset.y;

  scheduleAnimatedMove(gFloatingPile._left, gFloatingPile._top, tx, ty);
  animations.schedule(moveCards_callback, 0, target, doneFunc);
  animations.onInterruptRun(moveCards_callback, target, null);
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
  for(var i = 1; i <= steps; ++i)
    animations.schedule(gFloatingPile.moveBy, kAnimationDelay, stepX, stepY);
}

function showHints(card, destinations) {
  const view = card.pile.view;
  view.highlightHintFrom(card);
  animations.schedule(showHints_highlightDestinations, 300, destinations);
  animations.schedule(showHints_updateAll, 1700, destinations, view);
  animations.onInterruptRun(showHints_updateAll, destinations, view);
  animations.setTimeouts();
}
function showHints_highlightDestinations(destinations) {
  for each(var d in destinations) d.view.highlightHintTo();
}
function showHints_updateAll(destinations, sourceView) {
  for each(var d in destinations) d.view.update();
  if(sourceView) sourceView.update();
}
