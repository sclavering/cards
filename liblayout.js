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
  w: View,

  views: [],

  // the root XUL element for this layout
  _node: null,

  show: function() {
    if(!this._node) throw "layout not init()'d";
    this._node.hidden = false;
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
          var node = createPileView(viewType);
          box.appendChild(node);
          views.push(node);
      }
    }
    // sanity check
    if(box != container) throw "Layout._build: layout had unclosed box";
  },

  // === Mouse Handling =======================================
  // Games must implement mouseDown, mouseUp, mouseMove, mouseClick and mouseRightClick

  _mouseNextCard: null, // a Card, set on mousedown on a movable card
  _mouseNextCardX: 0,
  _mouseNextCardY: 0,
  _mouseDownTarget: null, // always set on mousedown
  _dragInProgress: false,
  _tx: 0, // used in positioning for drag+drop
  _ty: 0,
  _ex0: 0, // coords of mousedown event
  _ey0: 0,

  mouseDown: function(e) {
    const t = this.getEventTarget(e);
    if(!t || t.parentNode == gFloatingPile) return;
    if(interruptAction) interrupt();
    this._mouseDownTarget = t;
    if(!t.isCard) return;
    const card = t.cardModel;
    if(!card.pile.mayTakeCard(card)) return;
    this._ex0 = e.pageX;
    this._ey0 = e.pageY;
    const box = t.boxObject;
    this._mouseNextCard = card;
    this._mouseNextCardX = box.x;
    this._mouseNextCardY = box.y;
    gGameStack.onmousemove = this.mouseMove0;
  },

  mouseMove0: function(e) {
    const fp = gFloatingPile, self = Game.layout; // this==window
    // ignore very tiny movements of the mouse during a click
    // (otherwise clicking without dragging is rather difficult)
    const ex = e.pageX, ey = e.pageY, ex0 = self._ex0, ey0 = self._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    const card = self._mouseNextCard;
    gFloatingPile.show(card, self._mouseNextCardX, self._mouseNextCardY);
    self._dragInProgress = true;
    self._tx = ex0 - fp._left;
    self._ty = ey0 - fp._top;
    gGameStack.onmousemove = self.mouseMove;
  },

  mouseMove: function(e) {
    const fp = gFloatingPile, self = Game.layout; // this==window
    fp.top = fp._top = e.pageY - self._ty;
    fp.left = fp._left = e.pageX - self._tx;
  },

  endDrag: function(e) {
    const card = this._mouseNextCard;

    this._mouseNextCard = null;
    this._mouseNextCardBox = null;
    this._dragInProgress = false;

    const cbox = gFloatingPile.boxObject;
    var l = cbox.x, r = l + cbox.width, t = cbox.y, b = t + cbox.height;

    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    for(var i = 0; i != targets.length; i++) {
      var target = targets[i];
      if(target == card.pile) continue;

      var tbox = target.view.boxObject;
      var l2 = tbox.x, r2 = l2 + tbox.width, t2 = tbox.y, b2 = t2 + tbox.height;
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
    card.pile.updateView(card.index); // make the cards visible again
  },

  mouseClick: function(e) {
    gGameStack.onmousemove = null;
    if(this._dragInProgress) {
      this.endDrag(e);
      return;
    }
    const t = this._mouseDownTarget;
    if(!t) return;
    this._mouseDownTarget = null;
    this._mouseNextCard = null;
    const act = t.isCard ? Game.getBestActionFor(t.cardModel)
        : t.stockModel ? t.stockModel.deal() : null;
    if(act) doo(act);
  },

  mouseRightClick: function(e) {
    if(this._dragInProgress || this._mouseNextCard) return;
    const t = this.getEventTarget(e);
    if(!t) return;
    const tFloating = t.parentNode == gFloatingPile; // xxx model/view problem
    if(interruptAction) interrupt();
    // it's OK to right-click a card while a *different* one is moving
    const act = t.isCard && !tFloating ? Game.sendToFoundations(t.cardModel) : null;
    if(act) doo(act);
  },

  // Pyramid + TriPeaks need to do something different
  getEventTarget: function(event) {
    return event.target;
  }
};


const AcesUpLayout = {
  __proto__: Layout,
  template: "h2s2p1p1p1p2f2"
};

const CanfieldLayout = {
  __proto__: Layout,
  template: "h2[s w]2[f p]1[f p]1[f p]1[f p]2r2"
};

const DoubleSolLayout = {
  __proto__: Layout,
  f: DoubleSolFoundationView,
  template: "v[1s1w4f1f1f1f1] [1p1p1p1p1p1p1p1p1p1p1]"
};

const FanLayout = {
  __proto__: Layout,
  p: FanRightView,
  template: "v[3f1f1f1f3] [ <{flex=1}{equalsize=always}[{flex=1}p p p p]"
      + "[{flex=1}p p p p][{flex=1}p p p p][{flex=1}p p p][{flex=1}p p p]> ]"
};

const FortyThievesLayout = {
  __proto__: Layout,
  w: FanRightView,
  template: "v[2f1f1f1f1f1f1f1f2] [  s w  ] [2p1p1p1p1p1p1p1p1p1p2]"
};

const FreeCellLayout = {
  __proto__: Layout,
  template: "v[1c1c1c1c3f1f1f1f1] [2p1p1p1p1p1p1p1p2]"
};

const GolfLayout = {
  __proto__: Layout,
  template: "v[3s2f3] [2p1p1p1p1p1p1p2]"
};

const GypsyLayout = {
  __proto__: Layout,
  template: "h2p1p1p1p1p1p1p1p2[{align=center}[[f f f f] [f f f f]] s]2"
};

const KlondikeLayout = {
  __proto__: Layout,
  template: "v[1s1w1#1f1f1f1f1] [1p1p1p1p1p1p1p1]"
};

const KlondikeDraw3Layout = {
  __proto__: Layout,
  w: Deal3HWasteView,
  template: "v[1s1w2f1f1f1f1] [1p1p1p1p1p1p1p1]"
};

const DoubleKlondikeLayout = {
  __proto__: Layout,
  template: "v[1s1w4f1f1f1f1f1f1f1f1] [1p1p1p1p1p1p1p1p1p1p1]"
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
      + " [1p 1p 1p 1p 1p 1p 1p 1p 1s1]"
};

const MontanaLayout = {
  __proto__: Layout,
  template: "v[1p1p1p1p1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1p1p1p1p1]"
      + " [1p1p1p1p1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1p1p1p1p1]"
};

const PenguinLayout = {
  __proto__: Layout,
  template: "h2[c p]1[c p]1[c p]1[c p]1[c p]1[c p]1[c p]2[f f f f]2"
};

const PileOnLayout = {
  __proto__: Layout,
  p: PileOnView,
  pilespacerClass: "pileon",
  template: "v[3p1p1p1p3] [3p1p1p1p3] [3p1p1p1p3] [3p1p1p1#3]"
};

const PyramidLayout = {
  __proto__: Layout,
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
  template: "v[1s1w3f1f1f1f1f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]"
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
  __proto__: Layout,
  p: View,
  template: "v<{class=pyramid}[41-2+2p2+2+2p2+2+2p2+2-14][42+2p2p2+2p2p2+2p2p2+24]"
     + "[41-2p2p2p2p2p2p2p2p2p2-14][42p2p2p2p2p2p2p2p2p2p24]>3[3s2f3]2"
};

const TowersLayout = {
  __proto__: Layout,
  template: "v[1c1c1c1c5f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]"
};

const UnionSquareLayout = {
  __proto__: Layout,
  f: UnionSquareFoundationView,
  p: UnionSquarePileView,
  template: "h2[s w]2[[p1p1p1p] [p1p1p1p] [p1p1p1p] [p1p1p1p]]2[f f f f]2"
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

