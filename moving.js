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
  const card = firstCard;
  const pile = card.pile, source = pile.source;
  const pview = pile.view, pbox = pview.boxObject;
  const tview = target.view, tbox = tview.boxObject;

  const px = pview.getCardX(card);
  const py = pview.getCardY(card);
  // initial coords
  const sx = pbox.x + px - gGameStackLeft;
  const sy = pbox.y + py - gGameStackTop;
  // final coords
  const tx = tbox.x - gGameStackLeft + tview.getNextCardX(target);
  const ty = tbox.y - gGameStackTop + tview.getNextCardY(target);
  // change in coords
  const dx = tx - sx;
  const dy = ty - sy;

  // Move 55px diagonally per step, adjusted to whatever value leads to a whole number of steps
  var steps = Math.round(Math.sqrt(dx * dx + dy * dy) / 55);
  if(steps == 0) {
    if(pile == gFloatingPile) gFloatingPileNeedsHiding = true;
    target.addCards(card);
    done(source);
    return;
  }

  const stepX = dx / steps;
  const stepY = dy / steps;
  steps--; // so it's 0 when the move is complete

  if(pile != gFloatingPile) {
    gFloatingPile.left = gFloatingPile._left = sx;
    gFloatingPile.top = gFloatingPile._top = sy;
    gFloatingPile.addCards(card);
  }

  var interval = null;

  // We want the cards to be displayed over their destination while the transfer happens.  Without
  // this function (called via a timer) that doesn't happen.
  function animDone() {
    target.addCards(card);
    gFloatingPileNeedsHiding = true;
    done(source);
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
    return source;
  };

  interval = setInterval(step, kAnimationDelay);
  interruptAction = interrupt;
}



function moveCards2(card, to) {
  const source = card.parentNode.source;
  to.addCards(card);
  const t = setTimeout(done, kAnimationDelay, source);
  interruptAction = function() {
    clearTimeout(t);
    return source;
  }
}
