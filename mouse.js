/*
All handling of mouse events is in this file.

Games choose what kind of mouse handling they want by setting their "mouseHandling" field
to one of:
  "drag+drop":
    Player may drag any card for which card.parentNode.mayTakeCard(card) returns true; when they
    drop the card each member of Game.dragDropTargets[] is examined to see if the card overlaps
    it, and if it can be legally dropped there.
    Right-click is used for "intelligent" moving of cards.
    Double-left-click is calls Game.sendToFoundations(..)

BaseCardGame.initialise() then sets the "mouseHandler" field of the game to the appropriate
member of MouseHandlers[].  A game could just set mouseHandler directly if it needs strange
mouse handling.
*/



function initMouseHandlers() {
  gGameStack.addEventListener("click", handleMouseClick, false);
  gGameStack.addEventListener("mousemove", handleMouseMove, false);
  gGameStack.addEventListener("mousedown", handleMouseDown, false);
  gGameStack.addEventListener("mouseup", handleMouseUp, false);
}
function handleMouseClick(e) {
  if(!gUIEnabled) return;
  Game.mouseHandler.mouseClick(e);
}
function handleMouseUp(e) {
  if(!gUIEnabled || e.button!=0) return;
  Game.mouseHandler.mouseUp(e);
}
function handleMouseDown(e) {
  if(!gUIEnabled || e.button!=0) return;
  Game.mouseHandler.mouseDown(e);
}
function handleMouseMove(e) {
  if(!gUIEnabled) return;
  Game.mouseHandler.mouseMove(e);
}




var MouseHandlers = [];

MouseHandlers["drag+drop"] = {
  nextCard: null, // set on mousedown, so that on mousemove it can be moved to |cards|
  tx: 0, // used in positioning for drag+drop
  ty: 0,
  dragInProgress: false,

  reset: function() {
    this.nextCard = null;
    this.tx = 0;
    this.ty = 0;
    // just in case user manages to start a new game while dragging something
    while(gFloatingPile.hasChildNodes()) gFloatingPile.removeChild(this.card.lastChild);
    gFloatingPile.hide();
  },

  mouseDown: function(e) {
    var t = e.target;
    if(t.isCard && t.parentNode.mayTakeCard(t)) this.nextCard = t;
  },

  mouseMove: function(e) {
    var cards = gFloatingPile;
    if(this.dragInProgress) {
      cards.top = cards._top = e.pageY - this.ty;
      cards.left = cards._left = e.pageX - this.tx;
    } else if(this.nextCard) {
      var card = this.nextCard;
//      cards.className = card.parentNode.className;
      cards.top = cards._top = card.boxObject.y - gGameStackTop;
      cards.left = cards._left = card.boxObject.x - gGameStackLeft;
      // property to retrieve original source of cards. for most
      // piles |source| is a pointer back to the pile itself.
      cards.source = card.parentNode.source;
      cards.addCards(card);
      // other stuff
      this.dragInProgress = true;
      this.tx = e.pageX - cards._left;
      this.ty = e.pageY - cards._top;
      this.nextCard = null;
    }
  },

  mouseUp: function(e) {
    this.nextCard = null;
    if(!this.dragInProgress) return;
    this.dragInProgress = false;

    const cbox = gFloatingPile.boxObject;
    var l = cbox.x, r = l + cbox.width, t = cbox.y, b = t + cbox.height;

    var card = gFloatingPile.firstChild;
    var source = card.parentNode.source;
    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    for(var i = 0; i != targets.length; i++) {
      var target = targets[i];
      if(target==source) continue;

      var tbox = target.boxObject;
      var l2 = tbox.x, r2 = l2 + tbox.width, t2 = tbox.y, b2 = t2 + tbox.height;
      var overlaps = (((l2<=l&&l<=r2)||(l2<=r&&r<=r2)) && ((t2<=t&&t<=b2)||(t2<=b&&b<=b2)));
      if(overlaps && Game.attemptMove(card,target)) { gFloatingPileNeedsHiding = true; return; }
    }

    // ordering here may be important (not-repainting fun)
    gFloatingPile.hide();
    source.addCards(card);
  },

  // middle click calls doBestMoveForCard(), left clicks reveal(), dealFromStock(),
  // or turnStockOver(). double left click calls sendToFoundations()
  mouseClick: function(e) {
    if(this.dragInProgress) return;

    var t = e.target;
    if(e.button==2) {
      if(t.isCard) Game.doBestMoveForCard(t);
    } else if(e.button===0) {
      if(t.isCard) {
        if(t.parentNode.isStock) Game.dealFromStock();
        else if(t.faceDown) Game.attemptRevealCard(t);
        else if(e.detail==2 && Game.foundations) Game.sendToFoundations(t);
      } else {
        if(t.isStock) Game.dealFromStock();
      }
    }
  }
};





MouseHandlers["pyramid"] = {
  card: null,

  get highlighter() {
    delete this.highlighter;
    return this.highlighter = createHighlighter();
  },

  reset: function() {
    this.card = null;
    this.highlighter.unhighlight();
  },

  mouseUp: function(e) {},
  mouseDown: function(e) {},
  mouseMove: function(e) {},

  mouseClick: function(e) {
    var t = e.target, x = e.pageX, y = e.pageY;
    if(e.button!==0) return;

    if((t.isCard && t.parentNode.isStock) || (t.isPile && t.isStock)) {
      if(this.card) {
        this.highlighter.unhighlight();
        this.card = null;
      }
      Game.dealFromStock();
      return;
    }

    // a <flex/>, the highlighter, or something like that
    // quite why this doesn't cause js strict warnings I don't know
    if(!t.isCard && !t.isPile) {
      // if t is a spacer between two piles we change t to the pile on the row above
      t = t.previousSibling;
      var rpp = t ? t.rightParent : null;
      if(t && t.isPile && rpp && (rpp.boxObject.y+rpp.boxObject.height > y)) {
        t = rpp;
      } else {
        // user is probably trying to dismiss the selection
        if(this.card) {
          this.highlighter.unhighlight();
          this.card = null;
        }
        return;
      }
    }

    // With pyramid layouts click often end up targetted at empty piles;
    // here we work out which card the user was probably trying to click
    if(t.isPile) {
      if(!t.isNormalPile) return; // clicking on an empty foundation or waste pile should do nothing

      while(!t.hasChildNodes()) {
        var lp = t.leftParent, rp = t.rightParent;
        if(rp && x > rp.boxObject.x) t = rp;
        else if(lp && lp.boxObject.x+lp.boxObject.width > x) t = lp;
        // is it the pile directly above?
        else if(lp && lp.rightParent) t = lp.rightParent;
        // user is probably being stupid
        else return;
        // are we too low down anyway?
        if(t.boxObject.y+t.boxObject.height < y) return;
      }
      // we're interested in cards, not piles
      t = t.firstChild;
    }

    if(this.card) {
      this.highlighter.unhighlight();
      if(Game.canRemovePair(this.card, t)) Game.removePair(this.card, t);
      this.card = null;
    } else {
      if(Game.canRemoveCard(t)) {
        Game.removeCard(t);
      } else if(Game.canSelectCard(t)) {
        this.card = t;
        this.highlighter.highlight(t);
      }
    }

    // otherwise the final click of the game gets caught by the window.onclick
    // handler for the game-won message, instantly starting a new game :(
    e.stopPropagation();
  }
};
