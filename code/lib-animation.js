const animations = {
  _timeouts: [],
  _interrupts: [],

  schedule: function() { // func, delay, func_arg_1, ...
    const args = Array.slice(arguments, 0);
    this._timeouts.push(setTimeout(args[0], args[1], args[2] || null, args[3] || null));
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
  if(gFloatingPile.lastCard != card) origin.view.updateForAnimationOrDrag(card);
  const finalOffset = target.view.getAnimationDestination();
  target.addCards(card, true); // doesn't update view
  Game.pileWhichLastHadCardRemoved = origin;

  // final coords (relative to gGameStack)
  const tview = target.view;
  const tx = tview.pixelLeft + finalOffset.x;
  const ty = tview.relativePixelTop + finalOffset.y;
  // change in coords
  const dx = tx - gFloatingPile._left;
  const dy = ty - gFloatingPile._top;

  // Move 55px diagonally per step, adjusted to whatever value leads to a whole number of steps
  var steps = Math.round(Math.sqrt(dx * dx + dy * dy) / 55);
  const stepX = steps && dx / steps; // guard against steps == 0
  const stepY = steps && dy / steps;

  // this function (called via a timer) that doesn't happen.
  function animDone() {
    gFloatingPileNeedsHiding = true;
    target.view.update();
    doneFunc();
  };

  // For 0 steps we still call animDone in a (0) timeout, for consistency
  for(var i = 1; i <= steps; ++i)
    animations.schedule(gFloatingPile.moveBy, i * kAnimationDelay, stepX, stepY);
  animations.schedule(animDone, steps * kAnimationDelay);
  animations.onInterruptRun(function() {
    target.view.update();
    gFloatingPileNeedsHiding = true;
  });
};


function showHints(card, destinations) {
  const view = card.pile.view;
  view.highlightHintFrom(card);
  animations.schedule(showHints_highlightDestinations, 300, destinations);
  animations.schedule(showHints_updateAll, 2500, destinations, view);
  animations.onInterruptRun(showHints_updateAll, destinations, view);
}
function showHints_highlightDestinations(destinations) {
  for each(var d in destinations) d.view.highlightHintTo();
}
function showHints_updateAll(destinations, sourceView) {
  for each(var d in destinations) d.view.update();
  if(sourceView) sourceView.update();
}
