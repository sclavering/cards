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

    // otherwise we'll end up doing an inifinite step move
    if(!dx && !dy) {
      firstCard.transferTo(target);
      animatedActionFinished();
      return;
    }

    // put cards in the temp pile. _top and _left properties remain as numbers, unlike top and left
    var cards = this.cards; // so we can use it in the nested functions
//    cards.className = firstCard.parentNode.className; // so cards layed out as in originating pile
    cards.left = cards._left = sx;
    cards.top = cards._top = sy;
    firstCard.transferTo(cards);

    // we'd like to move 55px diagonally per step, but have to settle for the closest distance that
    // allows a *whole number* of steps, each of the same size
    var angle = Math.atan2(dy, dx);
    var steps = Math.round((dx ? dx/Math.cos(angle) : dy/Math.sin(angle)) / 55);
    var stepX = dx / steps;
    var stepY = dy / steps;
    steps--; // so it's 0 when the move is complete

    var interval = null;

    // We want the cards to be displayed over their destination while the transfer happens.  Without
    // this function (called via a timer) that doesn't happen.
    function done() {
      cards.firstChild.transferTo(target);
      if(Game.autoplay()) return;
      cards.hide();
      enableUI();
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
      card.transferTo(to);
      highlighter.highlight(card);
      setTimeout(function() {
        highlighter.unhighlight();
        animatedActionFinished();
      }, 500);
    }, 260);
  }
};
