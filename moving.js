var moveCards = null, turnCardUp = null; // function pointers

function enableAnimation(enable) {
  moveCards = enable ? moveCards1 : moveCards2;
  turnCardUp = enable ? turnCardUpAnimated : turnCardUpNonAnimated;
}

function toggleAnimation(menuitem) {
  var enable = menuitem.getAttribute("checked")=="true";
  enableAnimation(enable);
  gPrefs.setBoolPref("use-animation",enable);
}



function moveCards1(firstCard, target) {
    disableUI();

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

    if(steps==1 || steps==0) {
      if(parent==gFloatingPile) gFloatingPileNeedsHiding = true;
      target.addCards(firstCard);
      animatedActionFinished(source);
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
    function done() {
      target.addCards(firstCard);
      gFloatingPileNeedsHiding = true;
      animatedActionFinished(source);
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
        setTimeout(done, 0);
      }
    };

    interval = setInterval(step, 30);
}



function moveCards2(card, to) {
    disableUI();
    var source = card.parentNode.source;
    to.addCards(card);
    source.fixLayout();
    setTimeout(animatedActionFinished, 30, source);
}



// precompute cosines ("qxv" used to avoid accidentally not declaring loop vars in other scopes)
var turnCardUpAnimatedCosines = new Array(7);
for(var qxv = 0; qxv != 7; qxv++) turnCardUpAnimatedCosines[qxv] = Math.abs(Math.cos((7-qxv) * Math.PI / 7));

function turnCardUpAnimated(card) {
  disableUI();
  var oldLeft = card._left;
  var oldHalfWidth = card.boxObject.width / 2;
  var stepNum = 7;
  var interval = setInterval(function() {
    stepNum--;
    if(stepNum==-1) { // testing for -1 ensures a 40ms delay after the turn completes
      clearInterval(interval);
      card.left = oldLeft;
      card.removeAttribute("width"); // the width needs to be CSS controlled so that switching cardsets works properly
      animatedActionFinished();
      return;
    }
    var newHalfWidth = turnCardUpAnimatedCosines[stepNum] * oldHalfWidth;
    card.width = 2 * newHalfWidth;
    card.left = oldLeft + oldHalfWidth - newHalfWidth;
    if(stepNum==3) card.setFaceUp();  // gone past pi/2
  }, 45);
}



function turnCardUpNonAnimated(card) {
  disableUI();
  card.setFaceUp();
  setTimeout(animatedActionFinished, 30, null);
}
