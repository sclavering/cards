var moveCards = null; // function pointer

var interruptAction = null; // null except during animation, when it's a function


function enableAnimation(enable) {
  moveCards = enable ? moveCards1 : moveCards2;
}

function toggleAnimation(menuitem) {
  var enable = menuitem.getAttribute("checked")=="true";
  enableAnimation(enable);
  gPrefs.setBoolPref("use-animation",enable);
}


const kAnimationDelay = 30;

function moveCards1(firstCard, target) {
  const card = firstCard, origin = card.pile;

  // show the cards in the floating pile if they aren't already
  const cs = gFloatingPile.pile.cards;
  if(!cs.length || cs[0] !== card) {
    const pview = origin.view, pbox = pview.boxObject;
    const offset = pview.getCardOffsets(card.index);
    gFloatingPile.show(card, pbox.x + offset.x, pbox.y + offset.y);
  }

  // final coords (relative to gGameStack)
  const tview = target.view, tbox = tview.boxObject;
  const finalOffset = tview.getCardOffsets(target.cards.length);
  const tx = tbox.x - gGameStackLeft + finalOffset.x;
  const ty = tbox.y - gGameStackTop + finalOffset.y;
  // change in coords
  const dx = tx - gFloatingPile._left;
  const dy = ty - gFloatingPile._top;

  // Move 55px diagonally per step, adjusted to whatever value leads to a whole number of steps
  var steps = Math.round(Math.sqrt(dx * dx + dy * dy) / 55);
  if(steps == 0) {
    gFloatingPileNeedsHiding = true;
    target.addCards(card);
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
    target.addCards(card);
    gFloatingPileNeedsHiding = true;
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
        target.addCards(card);
        gFloatingPileNeedsHiding = true;
      };
    }
  };

  function interrupt() {
    clearInterval(interval);
    target.addCards(card);
    gFloatingPileNeedsHiding = true;
    return origin;
  };

  interval = setInterval(step, kAnimationDelay);
  interruptAction = interrupt;
}



function moveCards2(card, to) {
  const source = card.parentNode;
  to.addCards(card);
  const t = setTimeout(done, kAnimationDelay, source);
  interruptAction = function() {
    clearTimeout(t);
    return source;
  }
}
