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
  cards: null, // a <stack/> to hold the cards being moved
  target: null, // where its going to
  interval: null, // ref to the window.setInterval triggering the animation
  tx: 0, // x coord to move to, including any offset into pile
  ty: 0,
  stepX: 0, // amount to change the position by on each step
  stepY: 0,
  stepNum: 0,

  init: function() {
    // class doesn't need to be flexible yet
    this.cards = createFloatingPile("fan-down");
    this.cards.id = "card-move-pile";
  },

  move: function(firstCard, target) {
    Cards.disableUI();

    var sx = firstCard.boxObject.x - gGameStackLeft;
    var sy = firstCard.boxObject.y - gGameStackTop;
    var tx = this.tx = target.boxObject.x - gGameStackLeft + target.getNextCardLeft();
    var ty = this.ty = target.boxObject.y - gGameStackTop + target.getNextCardTop();
    var dx = tx - sx;
    var dy = ty - sy;

    // otherwise we'll end up doing an inifinite step move
    if(!dx && !dy) {
      firstCard.transferTo(target);
      if(!Game.autoplay()) Cards.enableUI();
      return;
    }

    // put cards in the temp pile. _top and _left properties remain as numbers, unlike top and left
//    this.cards.className = firstCard.parentNode.className; // so cards layed out as in originating stack
    this.cards.left = this.cards._left = sx;
    this.cards.top = this.cards._top = sy;
    firstCard.transferTo(this.cards);
    this.target = target;

    var angle = Math.atan2(dy, dx);
    this.stepX = Math.cos(angle) * 55;
    this.stepY = Math.sin(angle) * 55;
    this.stepNum = Math.floor(dx ? dx/this.stepX : dy/this.stepY);

    this.interval = setInterval(function(){CardMover.step();}, 30);
    this.step();
  },

  step: function() {
    if(this.stepNum==0) return this.moveComplete();
    this.cards.left = this.cards._left += this.stepX;
    this.cards.top = this.cards._top += this.stepY;
    this.stepNum--;
  },

  moveComplete: function() {
    this.cards.left = this.tx;
    this.cards.top = this.ty;
    clearInterval(this.interval);
    // Using a timer forces moz to paint the cards at their destination (but still as children
    // of this.cards) before transferring them, which is good because the transfer takes a while.
    setTimeout(function() {
      var cm = CardMover;
      cm.cards.firstChild.transferTo(cm.target);
      cm.cards.hide();
      // don't enable UI until autoplay finished
      if(!Game.autoplay()) Cards.enableUI();
    }, 0);
  }
};





var CardMover2 = {
  highlighter: null,

  init: function() {
    this.highlighter = createHighlighter();
  },

  move: function(card, to) {
    Cards.disableUI();
    var highlighter = this.highlighter;
    highlighter.highlight(card);
    setTimeout(function() {
      card.transferTo(to);
      highlighter.highlight(card);
      setTimeout(function() {
        highlighter.unhighlight();
        // xxx this is turning up in too many places.  make it a function
        if(!Game.autoplay()) Cards.enableUI();
      }, 500);
    }, 260);
  }
};
