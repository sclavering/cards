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

    const views = this.views = [];
    const letters = []; // seq of view letters, to return to caller

    const container = this._node = createHTML("gamelayout game");
    gGameStack.appendChild(container);
    container.style.top = container.style.left = 0; // to make explicit sizing work

    var box = container;
    var stack = [];

    function pushBox(tagName, className) {
      stack.push(box);
      var el = document.createElement(tagName);
      if(tagName === 'tr') el.isTR = true; // avoid the string case mess in .tagName and .localName
      el.className = className;
      boxOrTd().appendChild(el);
      box = el;
    }

    function boxOrTd() {
      if(!box.isTR) return box;
      var td = document.createElement('td');
      box.appendChild(td);
      return td;
    }

    const template = this.template, len = template.length;
    for(var i = 0; i != len; ++i) {
      var ch = template[i];
      switch(ch) {
      // boxes
        case "#":
          pushBox('table', 'gamelayout-table');
          break;
        case "<":
          pushBox('tr', 'gamelayout-fixedheightrow');
          break;
        case "(":
          pushBox('div', 'shortcolumn');
          break;
        case "[":
          pushBox('div', 'longcolumn-outer');
          pushBox('div', 'longcolumn-inner');
          stack.pop(); // div.longcolumn-outer doesn't belong there
          break;
        case " ":
          boxOrTd();
          break;
        case ">":
          // Set <td> widths, but only on the first row (so that subsequent rows can omit trailing empties).
          if(!box.previousSibling) {
            let empties = Array.filter(box.childNodes, function(x) { return !x.hasChildNodes(); });
            let cellWidth = (100 / empties.length) + '%';
            for each(let td in empties) td.style.width = cellWidth;
          }
          // fall through
        case ")":
        case "]":
        case ".":
          box = stack.pop();
          break;
      // spacers
        case "_":
          boxOrTd().appendChild(createHTML("thinspacer"));
          break;
        case "-":
          boxOrTd().appendChild(createHTML("halfpilespacer"));
          break;
        case "=":
          boxOrTd().appendChild(createHTML("pilespacer"));
          break;
      // "{attr=val}", applies to most-recent pile or box
        case "{":
          var i0 = i;
          while(template[i] != "}") ++i;
          var blob = template.substring(i0 + 1, i);
          let ix = blob.indexOf('='), k = blob.slice(0, ix), v = blob.slice(ix + 1);
          (box.lastChild || box).setAttribute(k, v);
          break;
        case "}":
          throw "Layout.init: reached a } in template (without a { first)";
      // add pile views
        case "p":
        case "f":
        case "c":
        case "r":
        case "w":
        case "s":
        default:
          var viewType = this[ch] || null;
          if(!viewType) throw "Layout.init(): unrecognised char '" + ch + "' found in template";
          letters.push(ch);
          var viewObj = createPileView(viewType);
          views.push(viewObj);
          viewObj.insertInto(boxOrTd());
          break;
      }
    }
    // sanity check
    if(box != container) throw "Layout.init(): layout had unclosed box";
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
    window.onmousemove = self.beginDrag;
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
    window.onmousemove = self.mouseMoveInDrag;
    window.onmouseup = self.endDrag;
    window.oncontextmenu = null;
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

    const fr = gFloatingPile.boundingRect();
    // try dropping cards on each possible target
    for each(let target in Game.dragDropTargets) {
      if(target == card.pile) continue;
      var view = target.view;
      var tr = view.pixelRect();
      // skip if we don't overlap the target at all
      if(fr.right < tr.left || fr.left > tr.right) continue;
      if(fr.bottom < tr.top || fr.top > tr.bottom) continue;
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
    e.preventDefault();
    return false;
  },

  _resetHandlers: function(e) {
    this._eventTargetCard = null;
    window.oncontextmenu = this.rightClick;
    window.onmousedown = this.onmousedown;
    window.onmouseup = this.onmouseup;
    window.onmousemove = null;
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
    const rect = gGameStack.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    self._node.style.height = height + 'px';
    const vs = self.viewsNeedingUpdateOnResize;
    self.setFlexibleViewSizes(vs, width, height);
    for each(var v in vs) v.update();
  },

  setFlexibleViewSizes: function(views, width, height) {
    for each(var v in views) {
      var r = v.pixelRect();
      v.heightToUse = height - r.top;
      v.widthToUse = width - r.left;
    }
  }
};
