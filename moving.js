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
    var parent = firstCard.parentNode, source = parent.source;
    var cards = gFloatingPile;

    // initial coords
    var sx = firstCard.boxObject.x - gGameStackLeft;
    var sy = firstCard.boxObject.y - gGameStackTop;
    // final coords
    var tx = target.boxObject.x - gGameStackLeft + target.nextCardLeft;
    var ty = target.boxObject.y - gGameStackTop + target.nextCardTop;
    // change in coords
    var dx = tx - sx;
    var dy = ty - sy;

    // we'd like to move 55px diagonally per step, but have to settle for the closest distance that
    // allows a *whole number* of steps, each of the same size
    var steps = Math.round(Math.sqrt(dx*dx + dy*dy) / 55);
//    var steps = (dx && dy) ? Math.round(Math.sqrt(dx*dx + dy*dy)) : (dx || dy);

    if(steps==0) {
      if(parent==gFloatingPile) gFloatingPileNeedsHiding = true;
      target.addCards(firstCard);
      done(source);
      return;
    }

    var stepX = dx / steps;
    var stepY = dy / steps;
    steps--; // so it's 0 when the move is complete

    if(parent!=gFloatingPile) {
      cards.left = cards._left = sx;
      cards.top = cards._top = sy;
      cards.addCards(firstCard);
    }

    var interval = null;

    // We want the cards to be displayed over their destination while the transfer happens.  Without
    // this function (called via a timer) that doesn't happen.
    function animDone() {
      target.addCards(firstCard);
      gFloatingPileNeedsHiding = true;
      done(source);
    };

    function step() {
      if(steps) {
        cards.left = cards._left += stepX;
        cards.top = cards._top += stepY;
        steps--;
      } else {
        clearInterval(interval);
        cards.left = cards._left = tx;
        cards.top = cards._top = ty;
        setTimeout(animDone, 0);
      }
    };

    function interrupt() {
      clearInterval(interval);
      target.addCards(firstCard);
      gFloatingPileNeedsHiding = true;
      return source;
    };

    interval = setInterval(step, kAnimationDelay);
    interruptAction = interrupt;
}



function moveCards2(card, to) {
  var source = card.parentNode.source;
  to.addCards(card);
  var t = setTimeout(done, kAnimationDelay, source);
  interruptAction = function() {
    clearTimeout(t);
    return source;
  }
}
