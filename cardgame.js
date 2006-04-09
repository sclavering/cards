var BaseCardGame = {

  xulElement: null, // the container vbox/hbox for the game (set automatically)

  // This becomes an array of all the cards a game uses, either explicitly in the game's init(), or
  // by initialise() if it is a number (of decks to be created) or an array [[suits], repeat]
  cards: 1,

  // these are all automatically set up
  allpiles: [],    // array of piles of all types.  used for clearing the game
  piles: [],       // array of tableau piles
  foundations: [], // array of foundation piles
  reserves: [],    // ...
  cells: [],
  stock: null,     // the stock pile if the game has one, otherwise null
  waste: null,
  foundation: null, // the last foundation created (usually used in games with just one)
  reserve: null,
  dragDropTargets: null, // a list of piles on which cards can be dropped



  // === Start/Finish Playing =============================
  // Games may override init(), and nothing else.
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {
  },
  // xxx called after initCards() (unlike init()). will kill this later
  init2: function() {},

  show: function() {
    this.xulElement.hidden = false;

    if(this.getHints) gCmdHint.removeAttribute("disabled");
    else gCmdHint.setAttribute("disabled","true");
    gScorePanel.hidden = !this.hasScoring;
  },

  hide: function() {
    this.xulElement.hidden = true;
  },

  initialise: function() {
    this.initialised = true;

    // see rules.js
    // if any of various members that should be functions are instead strings then substitute appropriate function
    for(var r in Rules) if(typeof this[r] == "string") this[r] = Rules[r][this[r]];

    this.buildLayout();
    this.init();
    this.initCards();
    this.init2();
  },

  initCards: function() {
    // see comments above
    if(typeof this.cards == "number") this.cards = makeDecks(this.cards);
    else if(!("isCard" in this.cards[0])) this.cards = makeCardSuits.apply(null, this.cards);
  },

  // a string, starting with "v" or "h" (depending on wether outer element should be a <vbox> or an
  // <hbox>) and continuing with chars from "pfcrwsl 12345#", with meanings defined in _buildLayout
  layoutTemplate: null,

  // A string, unless deal() is overridden.
  //  template ::= foo "; " template | foo
  //  foo ::= [PFCRWS] " " nums | [pfcrws] (" " nums)+
  //  nums ::= [0-9] ("," [0-9])*
  //
  // "nums" lists are alternate numbers of face-down and face-up cards.
  // Capital letters mean "deal this (nums) pattern to every pile of this type".
  // Lower-case letters are followed by a pattern for each pile of that type
  // e.g. "F 0,1; p 0,1 1,2"
  // would mean "deal a single face-up card to each foundation, a single face-up card to
  // the first pile, and two-face up cards on top of one face-down card to the second pile"
  //
  // p=pile, f=foundation, c=cell, r=reserve, w=waste, s=stock
  // Once all the cards are dealt, any further instructions will be silently ignored. This
  // is used by, e.g.,  Fan ("P 0,3") to leave the final pile with just 1 card
  dealTemplate: null,

  pilespacerClass: "",

  pileLayout: FanDownLayout,
  foundationLayout: Layout,
  cellLayout: Layout,
  reserveLayout: Layout,
  stockLayout: StockLayout,
  wasteLayout: Layout,

  pileType: null,
  foundationType: KlondikeFoundation,
  cellType: Cell,
  reserveType: Reserve,
  stockType: null,
  wasteType: Waste,

  buildLayout: function() {
    // make sure each game type has its own arrays for these
    this.allpiles = [];
    const byType = this.pilesByType = { p: [], f: [], c: [], r: [], w: [], s: [] };
    this.piles = byType.p;
    this.foundations = byType.f;
    this.cells = byType.c;
    this.reserves = byType.r;

    const containerIsVbox = this.layoutTemplate[0] == "v";
    const box = this.xulElement = document.createElement(containerIsVbox ? "vbox" : "hbox");
    this._buildLayout(box, !containerIsVbox, this.layoutTemplate);
    box.className = "game";
    gGameStack.insertBefore(box, gGameStack.firstChild);

    // xxx kill this
    this.dragDropTargets = this.cells.concat(this.foundations, this.piles);
  },

  _buildLayout: function(container, nextBoxVertical, template) {
    var box = container;
    var newbox, p;
    var allpiles = this.allpiles;

    function startBox(type, className) {
      newbox = document.createElement(type);
      newbox.className = className;
      box.appendChild(newbox);
      box = newbox;
    }

    const len = template.length;
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
      // add piles
        case "p":
        case "f":
        case "c":
        case "r":
        case "w":
        case "s":
          var type = {p:"pile", f:"foundation", c:"cell", r:"reserve", w:"waste", s:"stock"}[ch];
          var obj1 = this[type + "Type"]; // e.g. this.pileType
          var obj2 = this[type + "Layout"]; // e.g. this.pileLayout
          var arry = this.pilesByType[ch];
          box.appendChild(this.__makePile(type, obj1, obj2, arry));
          break;
      // xxx kill these later
        case "a": // an acefoundation
          var obj1 = this.aceFoundationType, obj2 = this.foundationLayout, arry = this.pilesByType["f"];
          box.appendChild(this.__makePile("foundation", obj1, obj2, arry));
          break;
        case "k":
          var obj1 = this.kingFoundationType, obj2 = this.foundationLayout, arry = this.pilesByType["f"];
          box.appendChild(this.__makePile("foundation", obj1, obj2, arry));
          break;
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
        default:
          throw ("BaseCardGame.buildLayout: strange char found: " + ch);
      }
    }
    // sanity check
    if(box != container) throw "BaseCardGame._buildLayout: layout had unclosed box";
  },

  __makePile: function(type, obj1, obj2, arry) {
    const p = createPile(type, obj1, obj2);
    this.allpiles.push(p);
    const len = arry ? arry.length : 0;
    if(len) {
      const prev = arry[len - 1];
      prev.next = p;
      p.prev = prev;
    }
    arry.push(p);
    this[type] = p; // set this.stock, this.waste, etc; don't care about setting this.cell
    // xxx ew!
    const dropact = this.getActionForDrop;
    if(p.getActionForDrop == Pile.getActionForDrop && dropact) p.getActionForDrop = dropact;
    return p;
  },


  // === Start Game =======================================
  // Games should override deal(), and shuffleImpossible() if they need to

  // |cards| is only defined if we're trying to restart a game
  begin: function(cards) {
    // most initialisation can be done once per game, rather than once per instance of the game.
    const pro = this.__proto__;
    if(!pro.initialised) pro.initialise();

    if(!cards) {
      cards = this.cards;
      do cards = shuffle(cards);
      while(this.shuffleImpossible(cards));
    }
    this.cardsAsDealt = cards.slice(0); // copy of array

    this.actionsDone = [];
    this.actionsUndone = [];
    this._begin(cards);
  },

  restore: function() {
    this._begin(this.cardsAsDealt.slice(0)); // deal() destroys the array, so use a copy

    var done = this.actionsDone;
    for(var i = 0; i != done.length; i++) {
      var d = done[i];
      if("redo" in d) d.redo();
      else d.perform();
      this.score += d.score;
      // ugly
      var cs = d.revealedCards;
      for(var j = 0; j != cs.length; ++j) {
        var c = cs[j];
        c.faceUp = true;
        c.updateView();
      }
    }

    gScoreDisplay.value = this.score;
  },

  _begin: function(cards) {
    const ps = this.allpiles, num = ps.length;
    for(var i = 0; i != num; i++) ps[i].removeCardsAfter(0); // clear the view
    this.redealsRemaining = this.redeals;
    this.deal(cards);
    gScoreDisplay.value = this.score = this.initialScore;
  },

  // overriding versions should deal out the provided shuffled cards for a new game.
  // piles will already be empty.
  deal: function(cards) {
    const dt = this.dealTemplate;
    if(!dt) throw "dealTemplate missing, and deal() not overridden";
    
    const bits = dt.split("; ");
    for(var i = 0; i != bits.length; ++i) {
      var bit = bits[i];
      var ch = bit.charAt(0);
      var lch = ch.toLowerCase();
      if("pfcrws".indexOf(lch) == -1)
        throw "BaseCardGame.deal: malformed dealTemplate: '" + ch + "' follows a '; '";
      var piles = this.pilesByType[lch];
      bit = bit.slice(2); // drop the leading "x "
      if(ch == lch) { // separate nums for each pile
        var numss = bit.split(" ");        
        for(var j = 0; j != numss.length; ++j) this._dealSomeCards(piles[j], cards, numss[j]);
      } else {
        for(j = 0; j != piles.length; ++j) this._dealSomeCards(piles[j], cards, bit);
      }
    }

    // deal any remaining cards to the stock (keeps the templates simple)
    if(this.stock) this._dealSomeCards(this.stock, cards, [cards.length]);
  },

  // |nums| is an array of ints, or a comma-separated string of ints
  _dealSomeCards: function(pile, cards, nums) {
    // without the function(){} round parseInt, all but the first int are parsed as NaN !!!
    if(typeof nums == "string")
      nums = nums.split(",").map(function(numStr) { return parseInt(numStr, 10); });

    const cs = [];
    for(var i = 0, faceDown = true; i != nums.length; ++i, faceDown = !faceDown) {
      var n = nums[i];
      for(var j = 0; j != n; ++j) {
        var c = cards.pop();
        if(!c) continue; // some games (e.g. Montana) have nulls in their cards array
        c.faceUp = !faceDown;
        cs.push(c);
      }
    }
    pile.addCardsFromArray(cs);
  },

  // Games can override with a more interesting function if they wish to eliminate (some) impossible deals.
  // The cards will be shuffled repeatedly until this returns false, after which they are passed to deal(..)
  shuffleImpossible: function(shuffledCards) {
    return false;
  },



  // === Winning ==========================================
  // Games should obviously override this
  isWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // games may override getScoreFor (and hasScoring)

  // score at the start of a game
  // read after deal() (which is important if a game uses a getter function for this)
  initialScore: 0,

  hasScoring: false,

  // when adjusting this you should also adjust gScoreDisplay.value
  score: 0,

  // action is an Action object
  getScoreFor: function(action) {
    return 0;
  },

  // score for each card revealed.  done() handles the revealing of cards
  scoreForRevealing: 0,



  // === Move tracking and Undoing ========================
  // All actions/moves that are undoable should be implemented as Action objects
  // (see actions.js), and passed to doo().
  actionsDone: [],
  actionsUndone: [],

  canUndo: false,
  canRedo: false,

  doo: function(action) {
    this.actionsDone.push(action);
    this.canUndo = true;
    if(this.canRedo) this.actionsUndone = [];
    this.canRedo = false;
    action.score = this.getScoreFor(action);
    this.hintsReady = false;
  },

  // Called after a move completes (from global done() function)
  //   pile - an optional <pile/> from which a card was removed
  //   wasInterrupted - indicates no animations should be started here
  // Returns a bool. indicating whether an animation was triggered.
  done: function(pile, wasInterrupted) {
    const acts = this.actionsDone, act = acts[acts.length-1];

    const cs = act.revealedCards = pile ? this.getCardsToReveal(pile) : [];
    for(var i = 0; i != cs.length; ++i) {
      var c = cs[i];
      c.faceUp = true;
      c.updateView();
    }
    act.score += cs.length * this.scoreForRevealing;

    gScoreDisplay.value = this.score += act.score;
    return false;
  },

  // overridden by TriPeaks
  getCardsToReveal: function(pile) {
    const card = pile ? pile.lastCard : null;
    return card && !card.faceUp ? [card] : [];
  },

  // Action objects (see actions.js) each implement an undo() method.
  // This just picks the right object, and adjusts the game score etc.
  undo: function() {
    const done = this.actionsDone
    const action = done.pop();
    this.actionsUndone.push(action);

    this.canRedo = true;
    this.canUndo = done.length != 0;

    gScoreDisplay.value = this.score -= action.score;
    this.hintsReady = false;

    action.undo();
    const cs = action.revealedCards;
    for(var i = 0; i != cs.length; ++i) {
      var c = cs[i];
      c.faceUp = false;
      c.updateView();
    }

    if(this.redealsRemaining==1) gCmdRedeal.removeAttribute("disabled");
  },

  redo: function() {
    const undone = this.actionsUndone;
    const action = undone.pop();
    this.actionsDone.push(action);

    this.canUndo = true;
    this.canRedo = undone.length != 0;

    gScoreDisplay.value = this.score += action.score;
    this.hintsReady = false;

    if(action.redo) action.redo();
    else action.perform();
    const cs = action.revealedCards;
    for(var i = 0; i != cs.length; ++i) {
      var c = cs[i];
      c.faceUp = true;
      c.updateView();
    }

    if(this.redealsRemaining==0) gCmdRedeal.setAttribute("disabled","true");
  },

  // called after each move (unless interrupted by user).
  // Should return an Action, or null.  Generally shouldn't handle revealing of cards
  autoplay: function(pileWhichHasHadCardsRemoved) {
    return null;
  },

  // This is copied onto all piles.
  // It should return an Action appropriate for the card being dropped on the pile.
  getActionForDrop: function(card) {
    return this.mayAddCard(card) ? new Move(card, this) : null;
  },

  // Attempts to move a card to somewhere on the foundations, returning |true| if successful.
  // This default version is for Klondike-like games, Spider-like games may need to override it.
  sendToFoundations: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const f = this.getFoundationMoveFor(card);
    return f ? new Move(card, f) : null;
  },

  // xxx much better versions of this should be possible in most games
  getFoundationMoveFor: function(card) {
    const fs = this.foundations, len = fs.length;
    for(var i = 0, f = fs[0]; i != len; f = fs[++i]) if(f.mayAddCard(card)) return f;
    return null;
  },

  // Called when a user right-clicks on a card.  Should return an Action (or null).
  // Generally it's easier to override getBestDestinationFor instead of getBestActionFor
  getBestActionFor: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const target = this.getBestDestinationFor(card);
    return target ? new Move(card, target) : null;
  },

  getBestDestinationFor: function(card) {
    return null;
  },



  // === Redealing ========================================
  // xxx relics of experiments with redeals.  only Montana has these now
  redeals: 0,
  redealsRemaining: 0,
  canRedeal: false,
  redeal: function() {},



  // === Hints ============================================
  // Games should override getHints(); the implementation should call addHint[s]() repeatedly.
  hintSources: [],
  hintDestinations: [],
  hintsReady: false, // means hints have been calculated, though there may not be any.
  hintNum: 0,

  hint: function() {
    if(!this.hintsReady) {
      this.hintSources = [];
      this.hintDestinations = [];
      this.hintNum = 0;
      this.getHints();
      this.hintsReady = true;
    }
    this.showHint();
  },

  showHint: function() {
    if(this.hintSources.length == 0) return;
    var src = this.hintSources[this.hintNum];
    var dest = this.hintDestinations[this.hintNum];
    gHintHighlighter.showHint(src,dest);
    this.hintNum++;
    if(this.hintNum==this.hintSources.length) this.hintNum = 0;
  },

  // If left null the Hint toolbar button will be disabled.  Should be replaced with a zero-argument
  // function that calls addHint(..) repeatedly, possibly via intermediaries (addHintsFor etc.).
  getHints: null,

  // takes the card to suggest moving, and the destination to suggest moving to (generally a pile)
  addHint: function(source, dest) {
    if(!source || !dest) return;
    this.hintSources.push(source);
    this.hintDestinations.push(dest);
  },

  // one source, many destinations
  addHints: function(source, dests) {
    for(var i = 0; i != dests.length; i++) {
      this.hintSources.push(source);
      this.hintDestinations.push(dests[i]);
    }
  },

  addHintToFirstEmpty: function(card) {
    if(!card) return;
    const p = this.firstEmptyPile;
    if(p) this.addHint(card, p);
  },

  // many sources, one destination
  addHints2: function(cards, dest) {
    for(var i = 0; i != cards.length; i++) {
      this.hintSources.push(cards[i]);
      this.hintDestinations.push(dest);
    }
  },

  // a common pattern.  xxx doesn't quite fit Klondike and Double Solitaire
  addHintsFor: function(card) {
    if(!card) return;
    var ds = [];
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      if(p.hasCards && p.mayAddCard(card)) ds.push(p);
    }
    if(ds.length) this.addHints(card, ds);
    this.addFoundationHintsFor(card);
  },

  addHintsForLowestMovable: function(pile) {
    this.addHintsFor(this.getLowestMovableCard(pile));
  },

  getLowestMovableCard: function(pile) {
    const cs = pile.cards;
    if(!cs.length) return null;
    for(var i = cs.length - 1; i > 0 && this.getLowestMovableCard_helper(cs[i], cs[i-1]); --i);
    return cs[i];
  },

  addFoundationHintsFor: function(card) {
    if(!card) return;
    const fs = this.foundations, num = fs.length;
    var ds = [];
    for(var i = 0; i != num; i++) {
      var f = fs[i];
      if(f.mayAddCard(card)) this.addHint(card, f);
    }
  },



  // === Miscellany =======================================

  get firstEmptyFoundation() {
    var fs = this.foundations, len = fs.length;
    for(var i = 0; i != len; i++) if(!fs[i].hasCards) return fs[i];
    return null;
  },

  get firstEmptyPile() {
    var ps = this.piles, len = ps.length;
    for(var i = 0; i != len; i++) if(!ps[i].hasCards) return ps[i];
    return null;
  },

  get emptyCell() {
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++) if(!cs[i].hasCards) return cs[i];
    return null;
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
    if(!t) return;
    // Ideally the second click of a double click would be retargetted at
    // gFloatingPile.source, but that's difficult because the "click" doesn't happen.
    if(t.parentNode == gFloatingPile) return; // xxx model/view problem
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
    const fp = gFloatingPile, self = Game; // this==window
    // ignore very tiny movements of the mouse during a click
    // (otherwise clicking without dragging is rather difficult)
    const ex = e.pageX, ey = e.pageY, ex0 = self._ex0, ey0 = self._ey0;
    if(ex > ex0 - 5 && ex < ex0 + 5 && ey > ey0 - 5 && ey < ey0 + 5) return;
    fp.top = fp._top = self._mouseNextCardY - gGameStackTop;
    fp.left = fp._left = self._mouseNextCardX - gGameStackLeft;
    const card = self._mouseNextCard;
    fp.source = card.pile.source;
    fp.addCards(card);
    self._dragInProgress = true;
    self._tx = ex0 - fp._left;
    self._ty = ey0 - fp._top;
    self._mouseNextCard = null;
    gGameStack.onmousemove = self.mouseMove;
  },

  mouseMove: function(e) {
    const fp = gFloatingPile, self = Game; // this==window
    fp.top = fp._top = e.pageY - self._ty;
    fp.left = fp._left = e.pageX - self._tx;
  },

  endDrag: function(e) {
    this._mouseNextCard = null;
    this._mouseNextCardBox = null;
    this._dragInProgress = false;

    const cbox = gFloatingPile.boxObject;
    var l = cbox.x, r = l + cbox.width, t = cbox.y, b = t + cbox.height;

    const card = gFloatingPile.firstCard;
    const source = card.pile.source;
    // try dropping cards on each possible target
    var targets = Game.dragDropTargets;
    for(var i = 0; i != targets.length; i++) {
      var target = targets[i];
      if(target==source) continue;

      var tbox = target.boxObject;
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
    source.addCards(card);
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
}





function GameControllerObj(id, proto) {
  this.id = id;
  proto.id = id; // cardslib.js still uses this
  this.constructor = new Function(); // don't use function(){}, see bug 7976
  this.constructor.prototype = proto;
  this.pastGames = [];
  this.futureGames = [];
}
GameControllerObj.prototype = {
  proto: null,
  constructor: null,
  pastGames: [],
  havePastGames: false,
  currentGame: null,
  futureGames: [],
  haveFutureGames: false,

  switchTo: function() {
    if(!this.currentGame) this.newGame();
    else Game = this.currentGame;
    Game.show();
  },

  switchFrom: function() {
    this.currentGame.hide();
  },

  newGame: function(cards) {
    if(this.currentGame) {
      if(this.pastGames.length==2) this.pastGames.shift();
      this.pastGames.push(this.currentGame);
      this.havePastGames = true;
    }

    Game = this.currentGame = new this.constructor();
    Game.begin(cards);
    const act = Game.autoplay();
    if(act) doo(act);
  },

  restorePastGame: function() {
    if(this.futureGames.length == 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    Game = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    Game.restore();
  },

  restoreFutureGame: function() {
    if(this.pastGames.length == 2) this.pastGames.shift();
    this.pastGames.push(this.currentGame);
    this.havePastGames = true;
    Game = this.currentGame = this.futureGames.pop();
    this.haveFutureGames = this.futureGames.length!=0;
    Game.restore();
  },

  clearFutureGames: function() {
    this.futureGames = [];
    this.haveFutureGames = false;
  }
}
