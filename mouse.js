/*
All handling of mouse events is in this file.

Games choose what kind of mouse handling they want by setting their "mouseHandling" field
to one of:
  "drag+drop":
    Player can drag any card for which Game.canMoveCard(..) returns true, when they drop
    the card each member of Game.dragDropTargets[] is examined to see if the card overlaps
    it, and if it can be legally dropped there.
    Middle-click is used for smartMove.
    Double-left-click is calls Game.sendToFoundations(..)
  "click-to-select":
    Player must click a card once to highlight/select it, then click on the desired
    destination.
    Middle-click and double-click as for drag+drop.

BaseCardGame.initialise() then sets the "mouseHandler" field of the game to the appropriate
member of MouseHandlers[].  A game could just set mouseHandler directly if it needs strange
mouse handling.
*/



function initMouseHandlers() {
  for(var m in MouseHandlers) MouseHandlers[m].init();
  // mouse event listeners
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
  nextCard: null, // set on mousedown, so that on mousemove a stack c can be created
  cards: null, // the stack of cards being dragged
  tx: 0, // tx and ty used in positioning for drag+drop
  ty: 0,
  dragInProgress: false,

  init: function() {
    // class doesn't need to be flexible for the moment
    this.cards = createFloatingPile("fan-down");
  },

  reset: function() {
    this.nextCard = null;
    this.tx = 0;
    this.ty = 0;
    // just in case user manages to start a new game while dragging something
    while(this.cards.hasChildNodes()) this.cards.removeChild(this.card.lastChild);
    this.cards.hide();
  },

  mouseDown: function(e) {
    var t = e.target;
    if(t.isCard && Game.canMoveCard(t)) this.nextCard = t;
  },

  mouseMove: function(e) {
    if(this.dragInProgress) {
      this.cards.left = e.pageX - this.tx;
      this.cards.top = e.pageY - this.ty;
    } else if(this.nextCard) {
      var card = this.nextCard;
//      this.cards.className = card.parentNode.className;
      this.cards.left = getLeft(card) - gGameStackLeft;
      this.cards.top = getTop(card) - gGameStackTop;
      // property to retrieve original source of cards. for most
      // piles |source| is a pointer back to the pile itself.
      this.cards.source = card.parentNode.source;
      card.transferTo(this.cards);
      // other stuff
      this.dragInProgress = true;
      this.tx = e.pageX - this.cards.left;
      this.ty = e.pageY - this.cards.top;
      this.nextCard = null;
    }
  },

  mouseUp: function(e) {
    this.nextCard = null;
    if(!this.dragInProgress) return;
    this.dragInProgress = false;

    var l = getLeft(this.cards), r = getRight(this.cards), t = getTop(this.cards), b = getBottom(this.cards);

    var card = this.cards.firstChild;
    var source = card.parentNode.source;
    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    var success = false;
    for(var i = 0; !success && i<targets.length; i++) {
      var target = targets[i];
      if(target==source) continue;

      var l2 = getLeft(target), r2 = getRight(target), t2 = getTop(target), b2 = getBottom(target);
      var overlaps = (((l2<=l && l<=r2)||(l2<=r && r<=r2)) && ((t2<=t && t<=b2)||(t2<=b && b<=b2)));
      if(overlaps && Game.attemptMove(card,target)) success = true;
    }
    // move cards back
    if(!success) card.transferTo(source);

    this.cards.hide();
  },

  // middle click calls smartMove(), left clicks reveal(), dealFromStock(),
  // or turnStockOver(). double left click calls sendToFoundations()
  mouseClick: function(e) {
    if(this.dragInProgress) return;

    var t = e.target;
    if(e.button==1) {
      if(t.isCard) Game.smartMove(t);
    // right click should show card ?
    } else if(e.button==0) {
      if(t.isCard) {
        if(t.parentNode.isStock) Game.dealFromStock();
        else if(t.faceDown()) Game.revealCard(t);
        else if(e.detail==2 && Game.foundations) Game.sendToFoundations(t);
      } else {
        if(t.isStock) Game.dealFromStock();
      }
    }
  }
};




MouseHandlers["click-to-select"] = {
  source: null,
  highlighter: null,

  init: function() {
    this.highlighter = createHighlighter();
  },

  reset: function() {
    this.source = null;
    this.highlighter.unhighlight();
  },

  mouseUp: function(e) {},
  mouseDown: function(e) {},
  mouseMove: function(e) {},

  mouseClick: function(e) {
    var t = e.target;
    if(e.button==0) {
      if(e.detail==2) { // && Game.foundations) {  // don't need for FreeCell, but might do in future
        this.highlighter.unhighlight();
        // in a double click the first click will have highlighted the card, so the
        // second click's target is the highlight box
        if("isHighlighter" in t) Game.sendToFoundations(this.source);
        this.source = null;
      } else {
        if(this.source) {
          this.highlighter.unhighlight();
          // we move to a pile, not to the card the user clicks on :)
          if(t.isCard) t = t.parentNode;
          // must check if target is a cell or foundation, to avoid trying
          // to move card into the highlight box or main display stack :(
          if(t.isPile || t.isCell || t.isFoundation)
            if(t != this.source.parentNode)
              Game.attemptMove(this.source,t);
          this.source = null;
        } else {
          if((t.isCard && t.parentNode.isStock) || (t.isPile && t.isStock)) {
            Game.dealFromStock();
          } else if(t.isCard && Game.canMoveCard(t)) {
            this.source = t;
            this.highlighter.highlight(t);
          }
        }
      }
    } else if(e.button==1) {
      if(this.source) {
        this.highlighter.unhighlight();
        this.source = null;
      }
      if(t.isCard) Game.smartMove(t);
    }
  }
};
