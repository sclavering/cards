var BaseCardGame = {
  // This becomes an array of all the cards a game uses, either explicitly in the game's init(), or
  // by initialise() if it is a number (of decks to be created) or an array [[suits], repeat]
  cards: 1,

  // these are all automatically set up
  piles: [],       // array of tableau piles
  foundations: [], // array of foundation piles
  reserves: [],    // ...
  cells: [],
  stock: null,     // the stock pile if the game has one, otherwise null
  waste: null,
  foundation: null, // the last foundation created (usually used in games with just one)
  reserve: null,
  dragDropTargets: null, // a list of piles on which cards can be dropped

  // a Layout object from liblayout.js
  layout: null,

  pileType: null,
  foundationType: KlondikeFoundation,
  cellType: Cell,
  reserveType: Reserve,
  stockType: null,
  wasteType: Waste,


  // === Start/Finish Playing =============================
  // Games may override init(), and nothing else.
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {},

  show: function() {
    // some other game may have been using the layout, so need to reassociate piles+views
    const all = this.allpiles, num = all.length;
    for(var i = 0; i != num; ++i) all[i].view.displayPile(all[i]);

    this.layout.show();
    if(this.getHints) gCmdHint.removeAttribute("disabled");
    else gCmdHint.setAttribute("disabled","true");
    gScorePanel.hidden = !this.hasScoring;
  },

  hide: function() {
    this.layout.hide();
  },

  initialise: function() {
    this.initialised = true;
    // replace strings with functions (see rules.js)
    for(var r in Rules) if(typeof this[r] == "string") this[r] = Rules[r][this[r]];
    this.layout.init();
    this.createPiles();
    this.init();
    this.initCards();
  },

  _pileMap: { p: "pile", f: "foundation", c: "cell", r: "reserve", s: "stock", w: "waste" },

  createPiles: function() {
    const dropact = this.getActionForDrop;
    const nodes = this.layout.nodes, map = this._pileMap;
    const bytype = this.pilesByType = {};
    const all = this.allpiles = [];
    for(var letter in nodes) {
      var views = nodes[letter];
      var pileType = map[letter];
      var impl = this[pileType + "Type"];
      var arry = this[pileType + "s"] = bytype[letter] = [];
      // create corresponding piles
      for(var i = 0; i != views.length; ++i) {
        var pile = arry[i] = createPile(impl);
        all.push(pile);
        var view = views[i];
        pile.view = view;
        view.displayPile(pile);
        // xxx ew!
        if(pile.getActionForDrop == Pile.getActionForDrop && dropact) pile.getActionForDrop = dropact;
      }
      // ensure this.stock etc. are set
      this[pileType] = arry[0];
      // form linked lists of piles
      for(i = 1; i != arry.length; ++i) {
        arry[i].prev = arry[i - 1];
        arry[i - 1].next = arry[i];
      }
    }
    // xxx kill!
    this.dragDropTargets = this.cells.concat(this.foundations, this.piles);
  },

  initCards: function() {
    // see comments above
    if(typeof this.cards == "number") this.cards = makeDecks(this.cards);
    else if(!(this.cards[0] instanceof Card)) this.cards = makeCardSuits.apply(null, this.cards);
  },

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
      var cs = d.revealedCards;
      for(var j = 0; j != cs.length; ++j) cs[j].setFaceUp(true);
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

  // Cards will be shuffled repeatedly until this returns false.
  // Override to eliminate (some) impossible deals.
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
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);
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
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(false);

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
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);

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
    const fp = gFloatingPile, self = Game; // this==window
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
    const fp = gFloatingPile, self = Game; // this==window
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
