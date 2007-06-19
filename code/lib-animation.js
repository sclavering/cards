var interruptAction = null; // null except during animation, when it's a function

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
  if(steps == 0) {
    gFloatingPileNeedsHiding = true;
    target.view.update();
    done(origin);
    return;
  }

  const stepX = dx / steps;
  const stepY = dy / steps;
  steps--; // so it's 0 when the move is complete

  var interval = null;

  // We want the cards to be displayed over their destination while the transfer happens.  Without
  // this function (called via a timer) that doesn't happen.
  function animDone() {
    gFloatingPileNeedsHiding = true;
    target.view.update();
    done(origin);
  };

  function step() {
    if(steps) {
      gFloatingPile.moveBy(stepX, stepY);
      steps--;
    } else {
      clearInterval(interval);
      gFloatingPile.moveTo(tx, ty);
      const timeout = setTimeout(animDone, 0);
      interruptAction = function() {
        clearTimeout(timeout);
        target.view.update();
        gFloatingPileNeedsHiding = true;
      };
    }
  };

  function interrupt() {
    clearInterval(interval);
    target.view.update();
    gFloatingPileNeedsHiding = true;
    return origin;
  };

  interval = setInterval(step, kAnimationDelay);
  interruptAction = interrupt;
}
