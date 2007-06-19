const Layout = {
  // a string, starting with "v" or "h" (depending on wether outer element should be a <vbox>
  // or an <hbox>) and continuing with chars from "pfcrwsl 12345#", with meanings defined below
  template: null,

  pilespacerClass: "",

  // The View impl. to use when encountering the corresponding letters in .template.
  // Layouts can use abitrary new letters by having correspondingly-named fields.
  // Usual meanings are p: pile, f: foundation, c: cell, r: reserve, s: stock, w: waste
  p: FanDownView,
  f: View,
  c: View,
  r: View,
  s: StockView,
  w: CountedView,

  views: [],

  // the root XUL element for this layout
  _node: null,

  show: function() {
    if(!this._node) throw "layout not init()'d";
    this._node.hidden = false;
    this._resetHandlers();
  },

  hide: function() {
    this._node.hidden = true;
  },

  init: function() {
    if(this._node) return;

    const template = this.template, len = template.length;
    const views = this.views = [];
    const containerIsVbox = template[0] == "v";
    const container = this._node = document.createElement(containerIsVbox ? "vbox" : "hbox");
    container.className = "game";
    gGameStack.insertBefore(container, gGameStack.firstChild);

    var box = container;
    var nextBoxVertical = !containerIsVbox;
    var p;

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
          old.appendChild(box = document.createElement(nextBoxVertical ? "hbox" : "vbox"));
          break;
      // finish a box
        case "]":
          nextBoxVertical = !nextBoxVertical;
          // fall through
        case ">":
          box = box.parentNode;
          break;
      // annotation for rows containing lots of fandown piles that need to be stretched
        case "*":
          var thing = box.lastChild || box;
          thing.setAttribute("flex", "1");
          thing.setAttribute("align", "stretch");
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
          box.appendChild(document.createElement("halfpilespacer")); break;
        case "+":
        case "#":
          p = document.createElement("pilespacer");
          p.className = this.pilespacerClass;
          box.appendChild(p);
          break;
        case " ":
          box.appendChild(document.createElement("space")); break;
        case "1":
          box.appendChild(document.createElement("flex")); break;
        case "2":
        case "3":
        case "4":
        case "5":
          box.appendChild(document.createElement("flex" + ch)); break;
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
          var viewObj = createPileView(viewType);
          box.appendChild(viewObj.element);
          views.push(viewObj);
      }
    }
    // sanity check
    if(box != container) throw "Layout._build: layout had unclosed box";
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
  _eventTargets: null, // or a [card, pile] pair after mousedown and until mouseup

  onmousedown: function(e) {
    if(e.button) return;
    const self = Game.layout;
    const et = self._eventTargets = self._getTargetCardAndPile(e), card = et[0];
    if(!card || !card.pile.mayTakeCard(card)) return;
    if(interruptAction) interrupt();
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
    gFloatingPile.showForDragDrop(self._eventTargets[0], ex0, ey0);
    gGameStack.onmouseup = self.endDrag;
    gGameStack.oncontextmenu = null;
  },

  endDrag: function(e) {
    const self = Game.layout, et = self._eventTargets, card = et[0], pile = et[1];
    self._resetHandlers();

    const l = gFloatingPile.pixelLeft, r = gFloatingPile.pixelRight;
    const t = gFloatingPile.pixelTop, b = gFloatingPile.pixelBottom;

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
    const self = Game.layout, et = self._eventTargets;
    if(!et) return; // on Mac, a click+hold (right-click equiv.) may have intervened
    const card = et[0], pile = et[1];
    if(pile) doo(pile.getClickAction(card));
    self._resetHandlers();
  },

  rightClick: function(e) {
    const self = Game.layout;
    const card = self._getTargetCardAndPile(e)[0];
    if(interruptAction) interrupt();
    if(card) doo(Game.sendToFoundations(card));
    self._resetHandlers();
  },

  _resetHandlers: function(e) {
    this._eventTargets = null;
    gGameStack.oncontextmenu = this.rightClick;
    gGameStack.onmousedown = this.onmousedown;
    gGameStack.onmouseup = this.onmouseup;
    gGameStack.onmousemove = null;
  },

  _getTargetCardAndPile: function(e) {
    for(var t = e.target; t && !t.pileViewObj; t = t.parentNode);
    if(!t || !t.pileViewObj) return [null, null];
    t = t.pileViewObj;
    if(t == gFloatingPile) return [null, null];
    return [t.getTargetCard(e), t.pile];
  }
};

const _PyramidLayout = {
  __proto__: Layout,

  _getTargetCardAndPile: function(e) {
    const nulls = [null, null];
    var t = e.target, parent = t.parentNode;
    var tv = t.pileViewObj || null;
    var pv = parent.pileViewObj || null;

    if(tv == gFloatingPile || pv == gFloatingPile) return nulls;

    // occupied pile, foundation, or stock
    if(pv) return [pv.getTargetCard(e), pv.pile];

    // get from a <flex/> or spacer to the pile it covers
    if(!tv) {
      // if t is a spacer between two piles we change t to the pile on the row above
      t = t.previousSibling;
      if(!t || !t.pileViewObj) return nulls; // spacer is left of the pyramid
      var rp = t.pileViewObj.pile.rightParent;
      // spacer on right of pyramid, or if click was not in region overlapping row above
      if(!rp || rp.view.pixelBottom < y) return nulls;
      t = rp.view;
    }

    const x = e.pageX, y = e.pageY;
    // The target pile is empty.  This usually means that an empty pile is overlapping a card
    // which the user is trying to click on.
    var p = t.pile;
    while(!p.hasCards) {
      var lp = p.leftParent;
      var rp = p.rightParent;
      if(rp && x > rp.view.pixelLeft) p = rp;
      else if(lp && lp.view.pixelRight > x) p = lp;
      // is it the pile directly above?
      else if(lp && lp.rightParent) p = lp.rightParent;
      // user is probably being stupid
      else return nulls;
      // are we too low down anyway?
      if(p.view.pixelBottom < y) return nulls;
    }
    
    return [p.firstCard, p];
  }
};


const AcesUpLayout = {
  __proto__: Layout,
  f: CountedView,
  template: "h2s2p1p1p1p2f2"
};

const CanfieldLayout = {
  __proto__: Layout,
  template: "h2[s w]2[f p*]1[f p*]1[f p*]1[f p*]2r2"
};

const CanfieldDeal3Layout = {
  __proto__: CanfieldLayout,
  w: Deal3VWasteView
};

const DemonLayout = {
  __proto__: CanfieldLayout,
  r: FanDownView
};

const DoubleSolLayout = {
  __proto__: Layout,
  f: DoubleSolFoundationView,
  template: "v[1s1w4f1f1f1f1] [*1p1p1p1p1p1p1p1p1p1p1]"
};

const FanLayout = {
  __proto__: Layout,
  p: FanRightView,
  // Using width=0 makes the columns change width less often (only when they
  // must, rather than whenever the widest pile in the column changes). This is
  // presumably because flex allocates *spare* space, or something, but who
  // really knows with XUL?
  // Tested on: ... rv:1.8.1.3) Gecko/20061201 Firefox/2.0.0.3 (Ubuntu-feisty)
  template: "v[3f1f1f1f3] [ [{flex=1}{width=0}p p p p][{flex=1}{width=0}p p p p]"
      + "[{flex=1}{width=0}p p p p][{flex=1}{width=0}p p p][{flex=1}{width=0}p p p]]"
};

const FortyThievesLayout = {
  __proto__: Layout,
  w: FanRightView,
  template: "v[2f1f1f1f1f1f1f1f2] [  s w  ] [*2p1p1p1p1p1p1p1p1p1p2]"
};

const FreeCellLayout = {
  __proto__: Layout,
  template: "v[1c1c1c1c3f1f1f1f1] [*2p1p1p1p1p1p1p1p2]"
};

const GolfLayout = {
  __proto__: Layout,
  f: CountedView,
  template: "v[3s2f3] [*2p1p1p1p1p1p1p2]"
};

const GypsyLayout = {
  __proto__: Layout,
  template: "h2p1p1p1p1p1p1p1p2[{align=center}[[f f f f] [f f f f]] s]2"
};

const KlondikeLayout = {
  __proto__: Layout,
  template: "v[1s1w1#1f1f1f1f1] [*1p1p1p1p1p1p1p1]"
};

const KlondikeDraw3Layout = {
  __proto__: Layout,
  w: Deal3HWasteView,
  template: "v[1s1w2f1f1f1f1] [*1p1p1p1p1p1p1p1]"
};

const DoubleKlondikeLayout = {
  __proto__: Layout,
  template: "v[1s1w4f1f1f1f1f1f1f1f1] [*1p1p1p1p1p1p1p1p1p1p1]"
};

const MazeLayout = {
  __proto__: Layout,
  template: "v[1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1]"
      + " [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1]"
};

const Mod3Layout = {
  __proto__: Layout,
  f: SlideView,
  template: "v[1f1f1f1f1f1f1f1f1#1] [1f1f1f1f1f1f1f1f1#1] [1f1f1f1f1f1f1f1f1#1]"
      + " [*1p 1p 1p 1p 1p 1p 1p 1p 1s1]"
};

const MontanaLayout = {
  __proto__: Layout,
  p: View,
  template: "v[1p1p1p1p1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1p1p1p1p1]"
      + " [1p1p1p1p1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1p1p1p1p1]"
};

const PenguinLayout = {
  __proto__: Layout,
  template: "h2[c p*]1[c p*]1[c p*]1[c p*]1[c p*]1[c p*]1[c p*]2[f f f f]2"
};

const PileOnLayout = {
  __proto__: Layout,
  p: PileOnView,
  pilespacerClass: "pileon",
  template: "v[3p1p1p1p3] [3p1p1p1p3] [3p1p1p1p3] [3p1p1p1#3]"
};

const PyramidLayout = {
  __proto__: _PyramidLayout,
  f: CountedView,
  template: "h1[s w]1[{flex=5}{class=pyramid}[1p1][4-++p1p++-4][3++p1p1p++3]"
      + "[3-+p1p1p1p+-3][2+p1p1p1p1p+2][2-p1p1p1p1p1p-2][1p1p1p1p1p1p1p1]]1f1"
};

const RegimentLayout = {
  __proto__: Layout,
  a: View, // ace/king foundations
  k: View,
  p: View,
  template: "v[1a1a1a1a2k1k1k1k1]  [1p1p1p1p1p1p1p1p1] [1r1r1r1r1r1r1r1r1] [1p1p1p1p1p1p1p1p1]"
};

const RussianLayout = {
  __proto__: Layout,
  template: "h1p1p1p1p1p1p1p1[f f f f]1"
};

const SanibelLayout = {
  __proto__: Layout,
  template: "v[1s1w3f1f1f1f1f1f1f1f1] [*2p1p1p1p1p1p1p1p1p1p2]"
};

const SimonLayout = {
  __proto__: Layout,
  f: Spider4FoundationView,
  template: "h2p1p1p1p1p1p1p1p1p1p2f2"
};

const SpiderLayout = {
  __proto__: Layout,
  f: Spider8FoundationView,
  template: "h2p1p1p1p1p1p1p1p1p1p2[f s]2"
};

const TriPeaksLayout = {
  __proto__: _PyramidLayout,
  p: View,
  template: "v<{class=pyramid}[41-2+2p2+2+2p2+2+2p2+2-14][42+2p2p2+2p2p2+2p2p2+24]"
     + "[41-2p2p2p2p2p2p2p2p2p2-14][42p2p2p2p2p2p2p2p2p2p24]>3[3s2f3]2"
};

const TowersLayout = {
  __proto__: Layout,
  template: "v[1c1c1c1c5f1f1f1f1] [*2p1p1p1p1p1p1p1p1p1p2]"
};

const UnionSquareLayout = {
  __proto__: Layout,
  f: UnionSquareFoundationView,
  p: UnionSquarePileView,
  template: "h2[s w]2[p p p p] [p p p p] [p p p p] [p p p p]2[f f f f]2"
};

const WaspLayout = {
  __proto__: Layout,
  f: Spider4FoundationView,
  template: "h2p1p1p1p1p1p1p2[f s]2"
};

const YukonLayout = {
  __proto__: Layout,
  template: "h1p1p1p1p1p1p1p1[f f f f]1"
};

