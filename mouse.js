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
    if(t.isCard && Game.canMoveCard(t)) this.nextCard = t;
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
      if(overlaps && Game.attemptMove(card,target)) return;
    }

    // ordering here may be important (not-repainting fun)
    gFloatingPile.hide();
    source.addCards(card);
  },

  // middle click calls smartMove(), left clicks reveal(), dealFromStock(),
  // or turnStockOver(). double left click calls sendToFoundations()
  mouseClick: function(e) {
    if(this.dragInProgress) return;

    var t = e.target;
    if(e.button==2) {
      if(t.isCard) Game.smartMove(t);
    } else if(e.button===0) {
      if(t.isCard) {
        if(t.parentNode.isStock) Game.dealFromStock();
        else if(t.faceDown) Game.revealCard(t);
        else if(e.detail==2 && Game.foundations) Game.sendToFoundations(t);
      } else {
        if(t.isStock) Game.dealFromStock();
      }
    }
  }
};




MouseHandlers["click-to-select"] = {
  source: null,

  get highlighter() {
    delete this.highlighter;
    return this.highlighter = createHighlighter();
  },

  reset: function() {
    this.source = null;
    this.highlighter.unhighlight();
  },

  mouseUp: function(e) {},
  mouseDown: function(e) {},
  mouseMove: function(e) {},

  mouseClick: function(e) {
    // don't let the event end up hiding the insufficient-spaces-msg as soon as we show it
    e.stopPropagation();

    var t = e.target;
    if(e.button==0) {
      if(e.detail==2) {
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
    } else if(e.button==2) {
      if(this.source) {
        this.highlighter.unhighlight();
        this.source = null;
      }
      if(t.isCard) Game.smartMove(t);
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
