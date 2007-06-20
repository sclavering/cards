var interruptAction = null; // null except during animation, when it's a function

const animations = {
  _timeouts: [],

  schedule: function(delay, func, args) {
    const stuff = Array.concat([func, delay], args || []);
    this._timeouts.push(setTimeout.apply(window, stuff));
  },

  interrupt: function() {
    for each(var t in this._timeouts) clearTimeout(t);
    for each(var i in this._interrupts) i();
    this._timeouts = [];
  }
};


const kAnimationDelay = 30;

function moveCards(firstCard, target) {
  const card = firstCard, origin = card.pile;
  if(!gFloatingPile.inUse) origin.view.updateForAnimationOrDrag(card);
  const finalOffset = target.view.getAnimationDestination();
  target.addCards(card, true); // doesn't update view

  // final coords (relative to gGameStack)
  const tview = target.view;
  const tx = tview.pixelLeft - gGameStackLeft + finalOffset.x;
  const ty = tview.pixelTop - gGameStackTop + finalOffset.y;
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
    done(origin);
  };

  // For 0 steps we still call animDone in a (0) timeout, for consistency
  const finishtime = steps * kAnimationDelay;
  for(var i = 1; i <= steps; ++i)
    animations.schedule(i * kAnimationDelay, gFloatingPile.moveBy, [stepX, stepY]);
  animations.schedule(finishtime, animDone, [origin]);

  interruptAction = function() {
    animations.interrupt();
    target.view.update();
    gFloatingPileNeedsHiding = true;
    return origin;
  };
};
