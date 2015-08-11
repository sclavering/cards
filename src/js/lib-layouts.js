const Layout = {
  // a string, starting with "v" or "h" (depending on wether outer element should be a <vbox>
  // or an <hbox>) and continuing with chars from "pfcrwsl 12345#", with meanings defined below
  template: null,

  views: [],

  // The root DOM element for this layout.
  _node: null,

  show: function() {
    if(!this._node) throw "layout not init()'d";
    setVisibility(this._node, true);
    this._resetHandlers();
    this.onWindowResize();
    window.onresize = this.bound_onWindowResize;
  },

  hide: function() {
    setVisibility(this._node, false);
    window.onresize = null;
  },

  init: function() {
    if(this._node) throw "reinitialising layout";

    this.bound_beginDrag = (ev) => this.beginDrag(ev);
    this.bound_endDrag = (ev) => this.endDrag(ev);
    this.bound_mouseMoveInDrag = (ev) => this.mouseMoveInDrag(ev);
    this.bound_onWindowResize = (ev) => this.onWindowResize(ev);
    this.bound_onmousedown = (ev) => this.onmousedown(ev);
    this.bound_onmouseup = (ev) => this.onmouseup(ev);
    this.bound_rightClick = (ev) => this.rightClick(ev);

    const views = this.views = [];
    const letters = []; // seq of view letters, to return to caller

    const container = this._node = createDIV("gamelayout game");
    ui.gameStack.appendChild(container);
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
    for(var i = 0; i !== len; ++i) {
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
            for(let td of empties) td.style.width = cellWidth;
          }
          // fall through
        case ")":
        case "]":
        case ".":
          box = stack.pop();
          break;
      // spacers
        case "_":
          boxOrTd().appendChild(createDIV("thinspacer"));
          break;
        case "-":
          boxOrTd().appendChild(createDIV("horizontal-halfpilespacer"));
          break;
        case "=":
          boxOrTd().appendChild(createDIV("horizontal-pilespacer"));
          break;
      // "{attr=val}", applies to most-recent pile or box
        case "{":
          var i0 = i;
          while(template[i] !== "}") ++i;
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
          viewObj.insert_into(boxOrTd());
          break;
      }
    }
    // sanity check
    if(box !== container) throw "Layout.init(): layout had unclosed box";
    this.viewsNeedingUpdateOnResize = [for(v of this.views) if(v.needsUpdateOnResize) v];
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
    const card = this._eventTargetCard = this._getTargetCard(e);
    if(!card || !card.mayTake) return;
    interrupt();
    this._ex0 = e.pageX;
    this._ey0 = e.pageY;
    window.onmousemove = this.bound_beginDrag;
  },

  beginDrag: function(e) {
    // ignore very tiny movements of the mouse during a click
    // (otherwise clicking without dragging is rather difficult)
    const ex = e.pageX, ey = e.pageY, ex0 = this._ex0, ey0 = this._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    const card = this._eventTargetCard;
    gFloatingPile.start_animation_or_drag(card);
    this._tx = ex0 - gFloatingPile._left;
    this._ty = ey0 - gFloatingPile._top;
    window.onmousemove = this.bound_mouseMoveInDrag;
    window.onmouseup = this.bound_endDrag;
    window.oncontextmenu = null;
  },

  // (_tx, _ty) is the pixel coords of the mouse relative to gFloatingPile
  _tx: 0,
  _ty: 0,
  mouseMoveInDrag: function(e) {
    gFloatingPile.moveTo(e.pageX - this._tx, e.pageY - this._ty);
  },

  endDrag: function(e) {
    const card = this._eventTargetCard;
    this._resetHandlers();

    const fr = gFloatingPile.boundingRect();
    // try dropping cards on each possible target
    for(let target of gCurrentGame.dragDropTargets) {
      if(target === card.pile) continue;
      var view = target.view;
      let tr = view.pixel_rect();
      // skip if we don't overlap the target at all
      if(fr.right < tr.left || fr.left > tr.right) continue;
      if(fr.bottom < tr.top || fr.top > tr.bottom) continue;
      var act = target.getActionForDrop(card);
      if(!act) continue;
      if(act instanceof ErrorMsg) {
        act.show();
        break;
      } else {
        doo(act);
        return;
      }
    }

    // ordering here may be important (not-repainting fun)
    gFloatingPile.hide();
    card.pile.view.update(); // make the cards visible again
  },

  onmouseup: function(e) {
    const card = this._eventTargetCard;
    if(!card) return;
    doo(card.pile.getClickAction(card));
    this._resetHandlers();
  },

  rightClick: function(e) {
    const card = this._getTargetCard(e);
    interrupt();
    if(card) doo(gCurrentGame.getFoundationMoveFor(card));
    this._resetHandlers();
    e.preventDefault();
    return false;
  },

  _resetHandlers: function(e) {
    this._eventTargetCard = null;
    window.oncontextmenu = this.bound_rightClick;
    window.onmousedown = this.bound_onmousedown;
    window.onmouseup = this.bound_onmouseup;
    window.onmousemove = null;
  },

  _getTargetCard: function(e) {
    let t = e.target;
    while(t && !t.pileViewObj) t = t.parentNode;
    if(!t || !t.pileViewObj) return null;
    const view = t.pileViewObj, rect = view.pixel_rect();
    return view.card_at_coords(e.pageX - rect.left, e.pageY - rect.top);
  },

  onWindowResize: function(e) {
    gAnimations.cancel();
    const rect = ui.gameStack.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const vs = this.viewsNeedingUpdateOnResize;
    this.setFlexibleViewSizes(vs, width, height);
    for(let v of vs) v.update();
  },

  setFlexibleViewSizes: function(views, width, height) {
    for(let v of views) {
      let r = v.pixel_rect();
      if(v.flexHeight) v.fixedHeight = height - r.top;
      if(v.flexWidth) v.fixedWidth = width - r.left;
    }
  }
};


function createDIV(class_name) {
  const el = document.createElement("div");
  el.className = class_name;
  return el;
};
