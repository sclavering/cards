var CardMover = null;

function enableAnimation(enable) {
  CardMover = enable ? CardMover1 : CardMover2;
}

function toggleAnimation(menuitem) {
  var enable = menuitem.getAttribute("checked")=="true";
  enableAnimation(enable);
  gPrefs.setBoolPref("use-animation",enable);
}





var CardMover1 = {
  cards: null, // a pile to hold the cards being moved

  init: function() {
    // class doesn't need to be flexible yet
    this.cards = createFloatingPile("fan-down");
    this.cards.id = "card-move-pile";
  },

  move: function(firstCard, target) {
    disableUI();

    // initial coords
    var sx = firstCard.boxObject.x - gGameStackLeft;
    var sy = firstCard.boxObject.y - gGameStackTop;
    // final coords
    var tx = target.boxObject.x - gGameStackLeft + target.getNextCardLeft();
    var ty = target.boxObject.y - gGameStackTop + target.getNextCardTop();
    // change in coords
    var dx = tx - sx;
    var dy = ty - sy;

    // we'd like to move 55px diagonally per step, but have to settle for the closest distance that
    // allows a *whole number* of steps, each of the same size
    var steps = Math.round(Math.sqrt(dx*dx + dy*dy) / 55);
//    var steps = (dx && dy) ? Math.round(Math.sqrt(dx*dx + dy*dy)) : (dx || dy);

    if(steps==1 || steps==0) {
      target.addCards(firstCard);
      animatedActionFinished();
      return;
    }

    var stepX = dx / steps;
    var stepY = dy / steps;
    steps--; // so it's 0 when the move is complete

    // put cards in the temp pile. _top and _left properties remain as numbers, unlike top and left
    var cards = this.cards; // so we can use it in the nested functions
//    cards.className = firstCard.parentNode.className; // so cards layed out as in originating pile
    cards.left = cards._left = sx;
    cards.top = cards._top = sy;
    cards.addCards(firstCard);

    var interval = null;

    // We want the cards to be displayed over their destination while the transfer happens.  Without
    // this function (called via a timer) that doesn't happen.
    function done() {
      target.addCards(firstCard);
      cards.hide(); // must do this (even if it's about to be used for another move) to force repainting of area
      animatedActionFinished();
    };

    function step() {
      if(steps) {
        cards.left = cards._left += stepX;
        cards.top = cards._top += stepY;
        steps--;
      } else {
        // move is done
        cards.left = tx;
        cards.top = ty;
        clearInterval(interval);
        setTimeout(done, 0);
      }
    };

    interval = setInterval(step, 30);
  }
};





var CardMover2 = {
  highlighter: null,

  init: function() {
    this.highlighter = createHighlighter();
  },

  move: function(card, to) {
    disableUI();
    var highlighter = this.highlighter;
    highlighter.highlight(card);
    setTimeout(function() {
      to.addCards(card);
      highlighter.highlight(card);
      setTimeout(function() {
        highlighter.unhighlight();
        animatedActionFinished();
      }, 500);
    }, 260);
  }
};
