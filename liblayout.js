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

  // will become a letter -> node-array map
  nodes: {},

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
    const nodes = this.nodes = {};
    const containerIsVbox = template[0] == "v";
    const container = this._node = document.createElement(containerIsVbox ? "vbox" : "hbox");
    container.className = "game";
    gGameStack.insertBefore(container, gGameStack.firstChild);

    var box = container;
    var nextBoxVertical = !containerIsVbox;
    var newbox, p;

    function startBox(type, className) {
      newbox = document.createElement(type);
      newbox.className = className;
      box.appendChild(newbox);
      box = newbox;
    }

    // first char is "h"/"v", not of interest here
    for(var i = 1; i != len; ++i) {
      var ch = template[i];
      switch(ch) {
      // start a box
        case "[": // in opposite direction
          startBox(nextBoxVertical ? "vbox" : "hbox", "");
          nextBoxVertical = !nextBoxVertical;
          break;
        case "`": // in current direction (used by Fan)
          startBox(nextBoxVertical ? "hbox" : "vbox", "");
          break;
        case "(":
          startBox("vbox", "pyramid-rows"); break;
        case "<":
          startBox("hbox", "pyramid-row"); break;
      // finish a box
        case "]":
          nextBoxVertical = !nextBoxVertical;
          // fall through
        case ">":
        case ")":
        case "'":
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
          throw "BaseCardGame._buildLayout: reached a } in template (without a { first)";
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
          if(nodes[ch]) nodes[ch].push(node);
          else nodes[ch] = [node];
      }
    }
    // sanity check
    if(box != container) throw "Layout._build: layout had unclosed box";
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
  template: "v[3f1f1f1f3] [ `{flex=1}{equalsize=always}[{flex=1}p p p p]"
      + "[{flex=1}p p p p][{flex=1}p p p p][{flex=1}p p p][{flex=1}p p p]' ]"
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
  template: "h2p1p1p1p1p1p1p1p2[{align=center}[[f f f f] [f f f f]] sl]2"
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
  layoutTemplate: "h1[s w]1({flex=5}<1p1><4-++p1p++-4><3++p1p1p++3>"
      + "<3-+p1p1p1p+-3><2+p1p1p1p1p+2><2-p1p1p1p1p1p-2><1p1p1p1p1p1p1p1>)1f1"
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
  template: "v(<41-2+2p2+2+2p2+2+2p2+2-14><42+2p2p2+2p2p2+2p2p2+24>"
     + "<41-2p2p2p2p2p2p2p2p2p2-14><42p2p2p2p2p2p2p2p2p2p24>)3[3s2f3]2"
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

