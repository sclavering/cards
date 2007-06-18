var interruptAction = null; // null except during animation, when it's a function

const kAnimationDelay = 30;

function moveCards(firstCard, target) {
  const card = firstCard, origin = card.pile;
  gFloatingPile.showForMove(card);
  target.addCards(card, true); // doesn't update view

  // final coords (relative to gGameStack)
  const tview = target.view;
  const finalOffset = tview.getAnimationDestination();
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
      gFloatingPile.left = gFloatingPile._left += stepX;
      gFloatingPile.top = gFloatingPile._top += stepY;
      steps--;
    } else {
      clearInterval(interval);
      gFloatingPile.left = gFloatingPile._left = tx;
      gFloatingPile.top = gFloatingPile._top = ty;
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
