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

    var angle = Math.atan2(dy, dx);
    var stepX = Math.cos(angle) * 55;
    var stepY = Math.sin(angle) * 55;
    var stepNum = Math.floor(dx ? dx/stepX : dy/stepY);

    var interval = null;

    function step() {
      if(stepNum!=0) {
        cards.left = cards._left += stepX;
        cards.top = cards._top += stepY;
        stepNum--;
      } else {
        // move is done
        cards.left = tx;
        cards.top = ty;
        clearInterval(interval);
        // Using a timer forces moz to paint the cards at their destination (but still as children
        // of |cards|) before transferring them, which is good because the transfer takes a while.
        setTimeout(function() {
          cards.firstChild.transferTo(target);
          cards.hide();
          animatedActionFinished();
        }, 0);
      }
    };

    interval = setInterval(step, 30);
    step();
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
