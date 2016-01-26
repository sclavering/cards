const Layout = {
  views: [],

  // The root DOM element for this layout.
  _node: null,

  show: function() {
    if(!this._node) throw "layout not init()'d";
    setVisibility(this._node, true);
    this._reset_handlers();
    this._on_window_resize();
    window.onresize = this._bound_on_window_resize;
  },

  hide: function() {
    setVisibility(this._node, false);
    window.onresize = null;
  },

  init: function(template, view_types) {
    if(this._node) throw "reinitialising layout";

    this._bound_on_window_resize = ev => this._on_window_resize(ev);
    this._bound_oncontextmenu = ev => this._oncontextmenu(ev);
    this._bound_onclick = ev => this._onclick(ev);
    this._bound_onmousedown = ev => this._onmousedown(ev);
    this._bound_onmouseup = ev => this._onmouseup(ev);
    this._bound_onmousemove = ev => this._onmousemove(ev);
    this._bound_ontouchstart = ev => this._ontouchstart(ev);
    this._bound_ontouchend = ev => this._ontouchend(ev);
    this._bound_ontouchcancel = ev => this._ontouchcancel(ev);
    this._bound_ontouchmove = ev => this._ontouchmove(ev);

    const views = this.views = [];
    const letters = []; // seq of view letters, to return to caller

    const container = this._node = createDIV("gamelayout game");
    ui.gameStack.appendChild(container);
    container.style.top = container.style.left = 0; // to make explicit sizing work

    var box = container;
    var stack = [];

    function pushBox(tagName, className) {
      stack.push(box);
      const el = document.createElement(tagName);
      el.className = className;
      boxOrTd().appendChild(el);
      box = el;
    }

    function boxOrTd() {
      if(box.localName !== "tr") return box;
      var td = document.createElement('td');
      box.appendChild(td);
      return td;
    }

    const len = template.length;
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
        default: {
          let viewType = view_types[ch] || null;
          if(!viewType) throw "Layout.init(): unrecognised view char found in template: " + ch;
          letters.push(ch);
          var viewObj = createPileView(viewType);
          views.push(viewObj);
          viewObj.insert_into(boxOrTd());
          break;
        }
      }
    }
    // sanity check
    if(box !== container) throw "Layout.init(): layout had unclosed box";
    this.viewsNeedingUpdateOnResize = [for(v of this.views) if(v.needs_update_on_resize) v];
    return letters;
  },


  // Mouse/Touch Handling

  // For right-click handling we just use .oncontextmenu, since e.g. on Mac we want ctrl+click to work too (and Fx 1.5 mac used to do weird things like convert a physical right-click into a left-click with .ctrlKey set, though I've no idea if that behaviour still exists).

  _ex0: 0, // coords of mousedown/touchstart event
  _ey0: 0,
  _tx: 0, // coords of the mouse relative to g_floating_pile
  _ty: 0,
  _card_for_dragging: null, // a Card, from when mousedown occurs on one, until mouseup occurs thereafter
  _is_drag_threshold_exceeded: false, // have we exceeded the small movement threshold before we show a drag as in progress?
  _current_touch_id: null, // a Touch.identifier value, when a touch-based drag is in progress

  _onmousedown: function(e) {
    if(e.button) return;
    if(!this._start_drag(e)) return;
    window.onmousemove = this._bound_onmousemove;
  },

  _ontouchstart: function(ev) {
    if(this._current_touch_id) return;
    const t = ev.changedTouches[0];
    if(!this._start_drag(t)) return;
    window.ontouchmove = this._bound_ontouchmove;
    this._current_touch_id = t.identifier;
  },

  _start_drag: function(event_or_touch) {
    const card = this._target_card(event_or_touch);
    if(!card || !card.pile.may_take_card(card)) return false;
    interrupt();
    this._card_for_dragging = card;
    this._ex0 = event_or_touch.pageX;
    this._ey0 = event_or_touch.pageY;
    return true;
  },

  _onmousemove: function(e) {
    if(this._is_drag_threshold_exceeded) {
      g_floating_pile.set_position(e.pageX - this._tx, e.pageY - this._ty);
      return;
    }
    // Ignore very tiny movements of the mouse during a click (otherwise clicking without dragging is rather difficult).
    const ex = e.pageX, ey = e.pageY, ex0 = this._ex0, ey0 = this._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    g_floating_pile.start_animation_or_drag(this._card_for_dragging);
    const rect = g_floating_pile.bounding_rect();
    this._tx = ex0 - rect.x;
    this._ty = ey0 - rect.y;
    this._is_drag_threshold_exceeded = true;
  },

  _ontouchmove: function(ev) {
    const t = this._current_touch_of(ev);
    if(!t) return;
    g_floating_pile.set_position(t.pageX - this._tx, t.pageY - this._ty);
  },

  cancel_drag: function() {
    if(!this._is_drag_threshold_exceeded) return;
    const card = this._card_for_dragging;
    this._reset_handlers();
    g_floating_pile.hide();
    card.pile.view.update();
  },

  _onmouseup: function(e) {
    if(this._is_drag_threshold_exceeded) {
      const card = this._card_for_dragging;
      if(!this._attempt_drop(card)) {
        g_floating_pile.hide();
        card.pile.view.update();
      }
    }
    this._reset_handlers();
  },

  _ontouchend: function(ev) {
    const t = this._current_touch_of(ev);
    if(!t) return;
    this._onmouseup(ev);
  },

  _attempt_drop: function(card) {
    if(!card) return false;
    const fr = g_floating_pile.bounding_rect();
    // try dropping cards on each possible target
    for(let target of gCurrentGame.dragDropTargets) {
      if(target === card.pile) continue;
      let tr = target.view.pixel_rect();
      // skip if we don't overlap the target at all
      if(fr.right < tr.left || fr.left > tr.right) continue;
      if(fr.bottom < tr.top || fr.top > tr.bottom) continue;
      let act = target.action_for_drop(card);
      if(!act) continue;
      if(act instanceof ErrorMsg) {
        act.show();
        return false;
      }
      doo(act, true);
      return true;
    }
    return false;
  },

  _ontouchcancel: function(ev) {
    const t = this._current_touch_of(ev);
    if(!t) return;
    this._reset_handlers();
  },

  _onclick: function(ev) {
    // Ignore right-clicks (handled elsewhere).  Ignoring middle-clicks etc is incidental, but not a problem.
    if(ev.button || ev.ctrlKey) return true;
    const card = this._target_card(ev);
    interrupt();
    if(card) doo(card.pile.action_for_click(card));
    this._reset_handlers();
    return false;
  },

  _oncontextmenu: function(e) {
    const card = this._target_card(e);
    interrupt();
    if(card) doo(gCurrentGame.foundation_action_for(card));
    this._reset_handlers();
    e.preventDefault();
    return false;
  },

  _reset_handlers: function(e) {
    this._is_drag_threshold_exceeded = false;
    this._card_for_dragging = null;
    this._current_touch_id = null;
    // The onclick/oncontextmenu handlers are bound on this._node since we don't want to interfere with clicking in the sidebar ui etc.
    this._node.oncontextmenu = this._bound_oncontextmenu;
    this._node.onclick = this._bound_onclick;
    this._node.onmousedown = this._bound_onmousedown;
    this._node.ontouchstart = this._bound_ontouchstart;
    // It is *essential* that the onmousemove/onmouseup handlers are bound to the window, rather than this._node, because the mouse pointer will be over g_floating_pile when those events occur.
    window.onmouseup = this._bound_onmouseup;
    window.onmousemove = null;
    // I'm binding these on window for consistency with onmousemove/onmouseup.  I haven't thought about whether it matters.
    window.ontouchmove = null;
    window.ontouchend = this._bound_ontouchend;
    window.ontouchcancel = this._bound_ontouchcancel;
  },

  _current_touch_of: function(ev) {
    for(let t of ev.changedTouches) if(t.identifier === this._current_touch_id) return t;
    return null;
  },

  _target_card: function(event_or_touch) {
    let t = event_or_touch.target;
    while(t && !t.pileViewObj) t = t.parentNode;
    if(!t || !t.pileViewObj) return null;
    const view = t.pileViewObj, rect = view.pixel_rect();
    return view.card_at_coords(event_or_touch.pageX - rect.left, event_or_touch.pageY - rect.top);
  },


  // Window resizing

  _on_window_resize: function(e) {
    g_animations.cancel();
    const rect = ui.gameStack.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const vs = this.viewsNeedingUpdateOnResize;
    this.update_flexible_views_sizes(vs, width, height);
    for(let v of vs) v.update();
  },

  update_flexible_views_sizes: function(views, width, height) {
    for(let v of views) {
      let r = v.pixel_rect();
      if(v.update_canvas_height_on_resize) v.canvas_height = height - r.top;
      if(v.update_canvas_width_on_resize) v.canvas_width = width - r.left;
    }
  },
};


function createDIV(class_name) {
  const el = document.createElement("div");
  el.className = class_name;
  return el;
};
