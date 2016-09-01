class Layout {
  views: View[];
  views_by_letter: { [key: string]: View[] };

  private viewsNeedingUpdateOnResize: View[];
  private _node: HTMLElement;
  private _ex0: number;
  private _ey0: number;
  private _tx: number;
  private _ty: number;
  private _cseq_for_dragging: CardSequence;
  private _is_drag_threshold_exceeded: boolean;
  private _current_touch_id: number;
  private _bound_on_window_resize: (Event) => void;
  private _bound_oncontextmenu: (Event) => void;
  private _bound_onclick: (MouseEvent) => void;
  private _bound_onmousedown: (MouseEvent) => void;
  private _bound_onmouseup: (MouseEvent) => void;
  private _bound_onmousemove: (MouseEvent) => void;
  private _bound_ontouchstart: (TouchEvent) => void;
  private _bound_ontouchend: (TouchEvent) => void;
  private _bound_ontouchcancel: (TouchEvent) => void;
  private _bound_ontouchmove: (TouchEvent) => void;

  constructor(template: string, view_classes?: { [template_letter: string]: typeof View }) {
    if(!view_classes) view_classes = {};

    this.views = [];
    this.views_by_letter = {};

    // The root DOM element for this layout.
    this._node = null;

    // Mouse/Touch handling
    this._ex0 = 0; // coords of mousedown/touchstart event
    this._ey0 = 0;
    this._tx = 0; // coords of the mouse relative to g_floating_pile
    this._ty = 0;
    this._cseq_for_dragging = null; // a CardSequence, from when mousedown occurs on one, until mouseup occurs thereafter
    this._is_drag_threshold_exceeded = false; // have we exceeded the small movement threshold before we show a drag as in progress?
    this._current_touch_id = null; // a Touch.identifier value, when a touch-based drag is in progress

    const default_view_classes = { s: StockView, w: CountedView, p: FanDownView, f: View, c: View };

    this._bound_on_window_resize = ev => this._on_window_resize();
    this._bound_oncontextmenu = ev => this._oncontextmenu(ev);
    this._bound_onclick = ev => this._onclick(ev);
    this._bound_onmousedown = ev => this._onmousedown(ev);
    this._bound_onmouseup = ev => this._onmouseup();
    this._bound_onmousemove = ev => this._onmousemove(ev);
    this._bound_ontouchstart = ev => this._ontouchstart(ev);
    this._bound_ontouchend = ev => this._ontouchend(ev);
    this._bound_ontouchcancel = ev => this._ontouchcancel(ev);
    this._bound_ontouchmove = ev => this._ontouchmove(ev);

    const views = this.views;

    const container = this._node = createDIV("gamelayout game");
    ui.gameStack.appendChild(container);
    container.style.top = container.style.left = "0px"; // to make explicit sizing work

    let box : HTMLElement = container;
    const stack = [];

    function pushBox(tagName, className) {
      stack.push(box);
      const el : HTMLElement = document.createElement(tagName);
      el.className = className;
      boxOrTd().appendChild(el);
      box = el;
    }

    function boxOrTd() {
      if(box.localName !== "tr") return box;
      const td = document.createElement('td');
      box.appendChild(td);
      return td;
    }

    const len = template.length;
    for(let i = 0; i !== len; ++i) {
      const ch = template[i];
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
            const empties = [].filter.call(box.childNodes, x => !x.hasChildNodes());
            const cellWidth = (100 / empties.length) + '%';
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
        case "{": {
          const i0 = i;
          while(template[i] !== "}") ++i;
          const attr_val = template.substring(i0 + 1, i).split("=");
          (box.lastChild as HTMLElement || box).setAttribute(attr_val[0], attr_val[1]);
          break;
        }
        case "}":
          throw "Layout.init: reached a } in template (without a { first)";
      // add pile views
        default: {
          const ViewClass = view_classes[ch] || default_view_classes[ch] || null;
          if(!ViewClass) throw "Layout.init(): unrecognised view char found in template: " + ch;
          const view = new ViewClass();
          views.push(view);
          if(!this.views_by_letter[ch]) this.views_by_letter[ch] = [];
          this.views_by_letter[ch].push(view);
          view.insert_into(boxOrTd());
          break;
        }
      }
    }
    // sanity check
    if(box !== container) throw "Layout.init(): layout had unclosed box";
    this.viewsNeedingUpdateOnResize = this.views.filter(v => v.needs_update_on_resize);

    this.views.forEach((v, ix) => v.mark_canvas_for_event_handling("data-cardgames-view-id", ix.toString()));
  }

  show(): void {
    if(!this._node) throw "layout not init()'d";
    setVisibility(this._node, true);
    this._reset_handlers();
    this._on_window_resize();
    window.onresize = this._bound_on_window_resize;
  }

  hide(): void {
    setVisibility(this._node, false);
    window.onresize = null;
  }

  attach_piles_to_views(pile_arrays_by_letter: { [letter: string]: AnyPile[] }): void {
    for(let k in pile_arrays_by_letter) if(!this.views_by_letter[k]) throw new Error("missing view-letter: " + k);
    for(let k in this.views_by_letter) if(!pile_arrays_by_letter[k]) throw new Error("missing pile-letter: " + k);
    for(let k in pile_arrays_by_letter) {
      const ps = pile_arrays_by_letter[k];
      const views = this.views_by_letter[k];
      if(ps.length !== views.length) throw new Error(ps.length + " piles but " + views.length + " views for letter " + k);
      for(let i = 0; i !== ps.length; ++i) {
        ps[i].view = views[i];
        views[i].attach(ps[i]);
      }
    }
  }

  // Mouse/Touch Handling

  // For right-click handling we just use .oncontextmenu, since e.g. on Mac we want ctrl+click to work too (and Fx 1.5 mac used to do weird things like convert a physical right-click into a left-click with .ctrlKey set, though I've no idea if that behaviour still exists).

  _onmousedown(ev: MouseEvent): void {
    if(ev.button) return;
    if(!this._start_drag(ev)) return;
    window.onmousemove = this._bound_onmousemove;
  }

  _ontouchstart(ev: TouchEvent): void {
    if(this._current_touch_id) return;
    const t = ev.changedTouches[0];
    if(!this._start_drag(t)) return;
    window.ontouchmove = this._bound_ontouchmove;
    this._current_touch_id = t.identifier;
  }

  _start_drag(event_or_touch: MouseEvent | Touch): boolean {
    const cseq = this._target_cseq(event_or_touch);
    if(!cseq || !cseq.source.may_take_card(cseq.first)) return false;
    interrupt();
    this._cseq_for_dragging = cseq;
    this._ex0 = event_or_touch.pageX;
    this._ey0 = event_or_touch.pageY;
    return true;
  }

  _onmousemove(ev: MouseEvent): void {
    if(this._is_drag_threshold_exceeded) {
      g_floating_pile.set_position(ev.pageX - this._tx, ev.pageY - this._ty);
      return;
    }
    // Ignore very tiny movements of the mouse during a click (otherwise clicking without dragging is rather difficult).
    const ex = ev.pageX, ey = ev.pageY;
    const ex0 = this._ex0, ey0 = this._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    g_floating_pile.start_animation_or_drag(this._cseq_for_dragging.first);
    const rect = g_floating_pile.bounding_rect();
    this._tx = ex0 - rect.left;
    this._ty = ey0 - rect.top;
    this._is_drag_threshold_exceeded = true;
  }

  _ontouchmove(ev: TouchEvent): void {
    const t = this._current_touch_of(ev);
    if(!t) return;
    g_floating_pile.set_position(t.pageX - this._tx, t.pageY - this._ty);
  }

  cancel_drag(): void {
    if(!this._is_drag_threshold_exceeded) return;
    const cseq = this._cseq_for_dragging;
    this._reset_handlers();
    g_floating_pile.hide();
    cseq.source.view.update();
  }

  _onmouseup(): void {
    if(this._is_drag_threshold_exceeded) {
      const cseq = this._cseq_for_dragging;
      if(!this._attempt_drop(cseq)) {
        g_floating_pile.hide();
        cseq.source.view.update();
      }
    }
    this._reset_handlers();
  }

  _ontouchend(ev: TouchEvent): void {
    const t = this._current_touch_of(ev);
    if(!t) return;
    this._onmouseup();
  }

  _attempt_drop(cseq: CardSequence): boolean {
    if(!cseq) return false;
    const fr = g_floating_pile.bounding_rect();
    // try dropping cards on each possible target
    for(let target of gCurrentGame.dragDropTargets) {
      if(target === cseq.source) continue;
      let tr = target.view.pixel_rect();
      // skip if we don't overlap the target at all
      if(fr.right < tr.left || fr.left > tr.right) continue;
      if(fr.bottom < tr.top || fr.top > tr.bottom) continue;
      let act = target.action_for_drop(cseq);
      if(!act) continue;
      if(act instanceof ErrorMsg) {
        act.show();
        return false;
      }
      doo(act, true);
      return true;
    }
    return false;
  }

  _ontouchcancel(ev: TouchEvent): void {
    const t = this._current_touch_of(ev);
    if(!t) return;
    this._reset_handlers();
  }

  _onclick(ev: MouseEvent): void {
    // Ignore right-clicks (handled elsewhere).  Ignoring middle-clicks etc is incidental, but not a problem.
    if(ev.button || ev.ctrlKey) return;
    const cseq = this._target_cseq(ev);
    interrupt();
    if(cseq) doo(cseq.source.action_for_click(cseq));
    this._reset_handlers();
  }

  _oncontextmenu(ev: MouseEvent): boolean {
    const cseq = this._target_cseq(ev);
    interrupt();
    if(cseq) doo(gCurrentGame.foundation_action_for(cseq));
    this._reset_handlers();
    ev.preventDefault();
    return false;
  }

  _reset_handlers(): void {
    this._is_drag_threshold_exceeded = false;
    this._cseq_for_dragging = null;
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
  }

  _current_touch_of(ev: TouchEvent): Touch {
    for(let t of ev.changedTouches) if(t.identifier === this._current_touch_id) return t;
    return null;
  }

  _target_cseq(event_or_touch: MouseEvent | Touch): CardSequence {
    const id = this._target_view_id(event_or_touch.target as HTMLElement);
    if(!id) return;
    const view = this.views[id], rect = view.pixel_rect();
    return view.cseq_at_coords(event_or_touch.pageX - rect.left, event_or_touch.pageY - rect.top);
  }

  _target_view_id(el: HTMLElement): string {
    for(; el && el.getAttribute; el = el.parentNode as HTMLElement) {
      const val = el.getAttribute("data-cardgames-view-id");
      if(val) return val;
    }
    return null;
  }

  // Window resizing

  _on_window_resize(): void {
    g_animations.cancel();
    const rect = ui.gameStack.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const vs = this.viewsNeedingUpdateOnResize;
    this.update_flexible_views_sizes(vs, width, height);
    for(let v of vs) v.update();
  }

  update_flexible_views_sizes(views: View[], width: number, height: number): void {
    for(let v of views) {
      let r = v.pixel_rect();
      if(v.update_canvas_height_on_resize) v.canvas_height = height - r.top;
      if(v.update_canvas_width_on_resize) v.canvas_width = width - r.left;
    }
  }
};


function createDIV(class_name: string): HTMLElement {
  const el = document.createElement("div");
  el.className = class_name;
  return el;
};
