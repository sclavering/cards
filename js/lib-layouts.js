const Layout = {
  // a string, starting with "v" or "h" (depending on wether outer element should be a <vbox>
  // or an <hbox>) and continuing with chars from "pfcrwsl 12345#", with meanings defined below
  template: null,

  views: [],

  // The root XUL element for this layout.
  // The size is explicitly set (in onWindowResize) to match the *visible part*
  // of the parent <stack>, not the full area as expanded when cards are being
  // dragged or animated beyond the bottom and/or right edges of the window.
  _node: null,

  show: function() {
    if(!this._node) throw "layout not init()'d";
    setVisibility(this._node, true);
    this._resetHandlers();
    this.onWindowResize();
    window.onresize = this.onWindowResize;
  },

  hide: function() {
    setVisibility(this._node, false);
    window.onresize = null;
  },

  init: function() {
    if(this._node) throw "reinitialising layout";

    const template = this.template, len = template.length;
    const views = this.views = [];
    const letters = []; // seq of view letters, to return to caller
    const containerIsVbox = template[0] == "v";
    const container = this._node = createHTML(containerIsVbox ? "vbox" : "hbox");
    container.className += " game";
    gGameStack.insertBefore(container, gGameStack.firstChild);
    container.style.top = container.style.left = 0; // to make explicit sizing work
    // Typically what we want
    if(!containerIsVbox) container.style.MozBoxAlign = "start";

    var box = container;
    var nextBoxVertical = !containerIsVbox;

    // first char is "h"/"v", not of interest here
    for(var i = 1; i != len; ++i) {
      var ch = template[i];
      switch(ch) {
      // start a box
        case "[": // in opposite direction
          nextBoxVertical = !nextBoxVertical;
          // fall through
        case "<": // in current direction
          var old = box;
          old.appendChild(box = createHTML(nextBoxVertical ? "hbox" : "vbox"));
          // "stretch" is the default, and usually not what we want.
          // Also, setting via CSS sometimes fails to have any effect!
          box.style.MozBoxAlign = "start";
          break;
      // finish a box
        case "]":
          nextBoxVertical = !nextBoxVertical;
          // fall through
        case ">":
          box = box.parentNode;
          break;
      // annotations: "{attrname=val}", applies to most-recent pile or box
        case "{":
          var i0 = i;
          while(template[i] != "}") ++i;
          var blob = template.substring(i0 + 1, i).split("=");
          (box.lastChild || box).setAttribute(blob[0], blob[1]);
          break;
        case "}":
          throw "Layout.init: reached a } in template (without a { first)";
      // add spaces
        case "-":
          box.appendChild(createHTML("halfpilespacer"));
          break;
        case "+":
        case "#":
          box.appendChild(createHTML("pilespacer"));
          break;
        case " ":
          box.appendChild(createHTML("space"));
          break;
        case "1":
          box.appendChild(createHTML("flex"));
          break;
        case "2":
        case "3":
        case "4":
        case "5":
          box.appendChild(createHTML("flex flex" + ch));
          break;
      // add pile views
        case "p":
        case "f":
        case "c":
        case "r":
        case "w":
        case "s":
        default:
          var viewType = this[ch] || null;
          if(!viewType) throw "Layout._build: unrecognised char '" + ch + "' found in template";
          letters.push(ch);
          var viewObj = createPileView(viewType);
          box.appendChild(viewObj.element);
          views.push(viewObj);
      }
    }
    // sanity check
    if(box != container) throw "Layout._build: layout had unclosed box";
    this.viewsNeedingUpdateOnResize = [v for each(v in this.views) if(v.needsUpdateOnResize)];
    return letters;
  },


  // === Mouse Handling ====================================
  // Notes:
  // Use onmouseup rather than onclick because in Fx1.5mac (at least) there is no click event if you
  // hold the mouse in one place for a few seconds between moving it and releasing the btn.
  //
  // Fx 20050623 on Mac only produces an Up event with .ctrlKey true for right-clicks (no down or
  // click events), so it's easiest to do all right-click detection this way.
  // Fx "20051107 (1.5)" (actually auto-updated, I think, to 1.5.0.3) does do Down events!

  _ex0: 0, // coords of mousedown event
  _ey0: 0,
  _eventTargetCard: null, // or a Card

  onmousedown: function(e) {
    if(e.button) return;
    const self = Game.layout;
    const card = self._eventTargetCard = self._getTargetCard(e);
    if(!card || !card.pile.mayTakeCard(card)) return;
    interrupt();
    self._ex0 = e.pageX;
    self._ey0 = e.pageY;
    gGameStack.onmousemove = self.beginDrag;
  },

  beginDrag: function(e) {
    const self = Game.layout; // this==window
    // ignore very tiny movements of the mouse during a click
    // (otherwise clicking without dragging is rather difficult)
    const ex = e.pageX, ey = e.pageY, ex0 = self._ex0, ey0 = self._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    const card = self._eventTargetCard;
    card.pile.view.updateForAnimationOrDrag(card);
    self._tx = ex0 - gFloatingPile._left;
    self._ty = ey0 - gFloatingPile._top;
    gGameStack.onmousemove = self.mouseMoveInDrag;
    gGameStack.onmouseup = self.endDrag;
    gGameStack.oncontextmenu = null;
  },

  // (_tx, _ty) is the pixel coords of the mouse relative to gFloatingPile
  _tx: 0,
  _ty: 0,
  mouseMoveInDrag: function(e) {
    const self = Game.layout;
    gFloatingPile.moveTo(e.pageX - self._tx, e.pageY - self._ty);
  },

  endDrag: function(e) {
    const self = Game.layout, card = self._eventTargetCard;
    self._resetHandlers();

    const box = document.getBoxObjectFor(gFloatingPile.element);
    const l = box.x, r = box.x + box.width;
    const t = box.y, b = box.y + box.height;

    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    for(var i = 0; i != targets.length; i++) {
      var target = targets[i];
      if(target == card.pile) continue;
      var view = target.view;
      var l2 = view.pixelLeft, r2 = view.pixelRight;
      var t2 = view.pixelTop, b2 = view.pixelBottom;
      var overlaps = (((l2<=l&&l<=r2)||(l2<=r&&r<=r2)) && ((t2<=t&&t<=b2)||(t2<=b&&b<=b2)));
      if(!overlaps) continue;
      var act = target.getActionForDrop(card);
      if(!act) continue;
      if(act instanceof ErrorMsg) {
        act.show();
        break;
      } else {
        gFloatingPileNeedsHiding = true;
        doo(act);
        return;
      }
    }

    // ordering here may be important (not-repainting fun)
    gFloatingPile.hide();
    card.pile.view.update(); // make the cards visible again
  },

  onmouseup: function(e) {
    const self = Game.layout, card = self._eventTargetCard;
    if(!card) return;
    doo(card.pile.getClickAction(card));
    self._resetHandlers();
  },

  rightClick: function(e) {
    const self = Game.layout;
    const card = self._getTargetCard(e);
    interrupt();
    if(card) doo(Game.getFoundationMoveFor(card));
    self._resetHandlers();
  },

  _resetHandlers: function(e) {
    this._eventTargetCard = null;
    gGameStack.oncontextmenu = this.rightClick;
    gGameStack.onmousedown = this.onmousedown;
    gGameStack.onmouseup = this.onmouseup;
    gGameStack.onmousemove = null;
  },

  _getTargetCard: function(e) {
    for(var t = e.target; t && !t.pileViewObj; t = t.parentNode);
    if(!t || !t.pileViewObj) return null;
    t = t.pileViewObj;
    return t != gFloatingPile ? t.getTargetCard(e) : null;
  },

  onWindowResize: function(e) {
    animations.interrupt();
    const self = Game.layout;
    const width = window.innerWidth
    const height = window.innerHeight - document.getBoxObjectFor(self._node).y;
    self._node.style.width = width + 'px';
    self._node.style.height = height + 'px';
    const vs = self.viewsNeedingUpdateOnResize;
    self.setFlexibleViewSizes(vs, width, height);
    for each(var v in vs) v.update();
  },

  setFlexibleViewSizes: function(views, width, height) {
    for each(var v in views) {
      v.heightToUse = height - v.relativePixelTop;
      v.widthToUse = width - v.relativePixelLeft;
    }
  }
};
