var BaseCardGame = {
  id: null, // needs to be unique.  used in pref. names.

  layout: null, // id of a xul element.  if left null this.id will be used instead
  xulElement: null, // the container vbox/hbox for the game (set automatically)

  // This becomes an array of all the cards a game uses, either explicitly in the game's init(), or
  // by initialise() if it is a number (of decks to be created) or an array [[suits], repeat]
  cards: 1,

  // works for most games
  get stockCounterStart() {
    var cards = this.stock.childNodes.length;
    if(this.waste) return cards;
    return Math.ceil(cards / this.piles.length);
  },

  // see mouse.js
  mouseHandling: "drag+drop",
  mouseHandler: null,

  // these are all automatically set up by initPiles()
  allpiles: [],    // array of piles of all types.  used for clearing the game
  piles: [],       // array of tableau piles
  foundations: [], // array of foundation piles
  reserves: [],    // ...
  cells: [],
  stock: null,     // the stock pile if the game has one, otherwise null
  waste: null,
  foundation: null, // if the game has just one foundation this will be it
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
  },

  hide: function() {
    this.mouseHandler.reset();
    this.xulElement.hidden = true;
  },

  initialise: function() {
    this.initialised = true;
    if(!this.mouseHandler) this.mouseHandler = MouseHandlers[this.mouseHandling];

    // see rules.js
    // if any of various members that should be functions are instead strings then substitute appropriate function
    for(var r in Rules) if(typeof this[r] == "string") this[r] = Rules[r][this[r]];
    // the mayTakeCardFromFoo and mayAddCardToFoo take values from Rules.mayTakeCard an Rules.mayAddCard respectively
    const takes = ["mayTakeCardFromStock","mayTakeCardFromWaste","mayTakeCardFromReserve",
                  "mayTakeCardFromCell","mayTakeCardFromFoundation","mayTakeCardFromPile"];
    const adds = ["mayAddCardToStock","mayAddCardToWaste","mayAddCardToReserve",
                  "mayAddCardToCell","mayAddCardToFoundation","mayAddCardToPile"];
    for(var i = 0; i != takes.length; i++) {
      r = takes[i];
      if(typeof this[r] == "string") this[r] = Rules.mayTakeCard[this[r]];
      r = adds[i];
      if(typeof this[r] == "string") this[r] = Rules.mayAddCard[this[r]];
    }

    this.initXulElement();
    this.init();
    this.initCards();
    this.init2();
  },

  initCards: function() {
    // see comments above
    if(typeof this.cards == "number") this.cards = makeDecks(this.cards);
    else if(!("isCard" in this.cards[0])) this.cards = makeCardSuits.apply(null, this.cards);
  },

  initXulElement: function() {
    if(!this.layout || this.layout==this.id) {
      this.xulElement = document.getElementById(this.id);
      this.initPiles();
      return;
    }

    function replaceIds(newId, oldIdLength, node) {
      if(node.id) node.id = newId + node.id.substring(oldIdLength);
      for(var i = 0; i != node.childNodes.length; i++) replaceIds(newId, oldIdLength, node.childNodes[i]);
    }

    // if it uses the same layout as another game then clone that layout and fix the ids in the clone (so initPiles() works)
    var elt = this.xulElement = document.getElementById(this.layout).cloneNode(true);
    replaceIds(this.id, this.layout.length, elt);
    gGameStack.insertBefore(elt, gGameStack.firstChild);

    this.initPiles();
    // throw away any cards we cloned
    var ps = this.allpiles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      while(p.hasChildNodes()) p.removeChild(p.lastChild);
    }
  },

  // Init's piles[], foundations[], reserves[], cells[], |foundation|, |reserve|, |stock| and
  // |waste| members (sometimes to null or to empty arrays).
  // Requires relevant XUL elements to have ids of the form {this.id}-{pile-type}[-{int}]
  initPiles: function() {
    // Unless these are set explicitly then all games share the same arrays (breaking everything)
    var allpiles = this.allpiles = [];
    var id = this.id+"-";

    const items1 = ["stock", "waste", "reserve", "foundation"];
    const props1 = ["isStock", "isWaste", "isReserve", "isFoundation"];
    const takes1 = ["mayTakeCardFromStock", "mayTakeCardFromWaste", "mayTakeCardFromReserve", "mayTakeCardFromFoundation"];
    const adds1 = ["mayAddCardToStock", "mayAddCardToWaste", "mayAddCardToReserve", "mayAddCardToFoundation"];

    // init piles of which there are only one (stock, waste, and a reserve or foundation in some cases)
    for(var i = 0; i != 4; i++) {
      var item = items1[i];
      var p = this[item] = initPileFromId(id+item, props1[i], this[takes1[i]], this[adds1[i]]);
      if(p) allpiles.push(p);
    }

    const items2 = ["reserve", "cell", "foundation", "pile"];
    const props2 = ["isReserve", "isCell", "isFoundation", "isPile"];
    const takes2 = ["mayTakeCardFromReserve", "mayTakeCardFromCell", "mayTakeCardFromFoundation", "mayTakeCardFromPile"];
    const adds2 = ["mayAddCardToReserve", "mayAddCardToCell", "mayAddCardToFoundation", "mayAddCardToPile"];

    // init the collections of piles of various types
    for(i = 0; i != 4; i++) {
      item = items2[i];
      var type = id+item+"-", property = props2[i];
      var mayTakeCard = this[takes2[i]], mayAddCard = this[adds2[i]];
      var ps = this[item+"s"] = [];
      for(var j = 0; true; j++) {
        p = initPileFromId(type+j, property, mayTakeCard, mayAddCard);
        if(!p) break;
        ps.push(p);
        allpiles.push(p);
      }
      if(!j) continue;
      // allow each collection to be used as a doubly-linked list
      var max = j - 1;
      for(j = 0; j != max; j++) ps[j].next = ps[j+1], ps[j+1].prev = ps[j];
    }

    const s = this.stock;
    if(s) {
      // a <label/> for displaying the num. of deals left
      var counter = document.getElementById(id+"stock-counter");
      if(counter) {
        s._counter = counter;
        s.__defineGetter__("counter", function() { return this._counter._value; });
        s.__defineSetter__("counter", function(val) { var c = this._counter; return c.value = c._value = val; });
      } else {
        // useless number that dealFromStock can twiddle without causing problems
        s.counter = 0;
      }
    }

    // xxx kill this
    this.dragDropTargets = this.cells.concat(this.foundations, this.piles);
    if(this.foundation) this.dragDropTargets.push(this.foundation);
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
    }

    gScoreDisplay.value = this.score;

    // necessary because global undo() function does not use disableUI/enableUI
    if(this.canRedeal()) gCmdRedeal.removeAttribute("disabled");
    else gCmdRedeal.setAttribute("disabled", "true");
  },

  _begin: function(cards) {
    this.mouseHandler.reset();
    this.clearGame();
    this.redealsRemaining = this.redeals;
    this.deal(cards);
    gScoreDisplay.value = this.score = this.initialScore;
    if(this.stock) this.stock.counter = this.stockCounterStart;
  },

  clearGame: function() {
    // Remove all cards and set them all face down.  Reset piles' stacking offset.
    var ps = this.allpiles, num = ps.length;
    for(var i = 0; i != num; i++) {
      var p = ps[i];
      while(p.hasChildNodes()) p.removeChild(p.lastChild).setFaceDown();
      p.fixLayout();
    }
  },

  // should deal out the provided shuffled cards for a new game.  piles will already be empty
  deal: function(cards) {
  },

  // Games can override with a more interesting function if they wish to eliminate (some) impossible deals.
  // The cards will be shuffled repeatedly until this returns false, after which they are passed to deal(..)
  shuffleImpossible: function(shuffledCards) {
    return false;
  },



  // === Winning ==========================================
  // Games should obviously override this
  hasBeenWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // games should override either |getScoreFor|, or |scores|

  // score at the start of a game
  // read after deal() (which is important if a game uses a getter function for this)
  initialScore: 0,

  // when adjusting this you should also adjust gScoreDisplay.value
  score: 0,

  // action is an Action object
  getScoreFor: function(action) {
    var actionstr = action.action;
    return (actionstr in this.scores) ? this.scores[actionstr] : 0;
  },

  // a string->number map of scores
  scores: {},



  // === Move tracking and Undoing ========================
  // All actions/moves that are undoable should be implemented as Action objects
  // (see actions.js), and passed to doAction.  Games should probably not override
  // any of these functions.
  actionsDone: [],
  actionsUndone: [],

  get canUndo() {
    return this.actionsDone.length!=0;
  },

  get canRedo() {
    return this.actionsUndone.length!=0;
  },

  // would be called "do", but that's a language keyword
  doAction: function(action) {
    this.actionsDone.push(action);
    if(this.actionsUndone.length) this.actionsUndone = [];
    action.score = this.getScoreFor(action);
    action.perform();

    gScoreDisplay.value = this.score += action.score;
    this.hintsReady = false;

    // xxx yuck
    if(GameController.haveFutureGames) GameController.clearFutureGames();

    // asynch. (i.e. animated) actions will trigger autoplay themselves,
    // and autoplay will trigger a UI update if it actually does anything
    if(!action.synchronous) return;
    disableUI();
    setTimeout(animatedActionFinished, 30, null);
  },

  // Action objects (see actions.js) each implement an undo() method.
  // This just picks the right object, and adjusts the game score etc.
  undo: function() {
    var action = this.actionsDone.pop();
    this.actionsUndone.push(action);
    gScoreDisplay.value = this.score -= action.score;
    this.hintsReady = false;

    action.undo();

    if(this.redealsRemaining==1) gCmdRedeal.removeAttribute("disabled");

    if("undoNext" in action && action.undoNext) this.undo();
  },

  redo: function() {
    var action = this.actionsUndone.pop();
    this.actionsDone.push(action);
    gScoreDisplay.value = this.score += action.score;
    this.hintsReady = false;

    if("redo" in action) action.redo();
    else action.perform();

    if(this.redealsRemaining==0) gCmdRedeal.setAttribute("disabled","true");

    if("redoNext" in action && action.redoNext) this.redo();
  },



  // === Testing if moves are allowed =====================

  // These methods are copied onto all piles of the relevant type as their "mayTakeCard"
  // method.  They should be functions taking a single arg. which is a card (which will be
  // a childNode of that pile), and return a boolean indicating whether it may be moved.
  // String values come from Rules.mayTakeCard.

  mayTakeCardFromStock: "no",

  mayTakeCardFromWaste: "single card",

  mayTakeCardFromReserve: "single card",

  mayTakeCardFromCell: "yes",

  mayTakeCardFromFoundation: "single card",

  mayTakeCardFromPile: "face up",


  // These methods are copied onto piles of the relevant type as their "mayAddCard" method.
  // They should be functions taking a single arg. which is a card to be added (along with
  // all its nextSiblings) to the pile, and return a boolean indicating whether that is OK.
  // String values come from Rules.mayAddCard.

  mayAddCardToStock: "no",

  mayAddCardToWaste: "no",

  mayAddCardToReserve: "no",

  mayAddCardToCell: "single card, if empty",

  mayAddCardToFoundation: "single card, up in suit or ace in space",

  mayAddCardToPile: null, // to ensure JS console errors for any game which omits this



  // === Moving between piles =============================

  moveTo: function(card, target) {
    this.doAction(new MoveAction(card, card.parentNode.source, target));
    return true;
  },

  // for use by mouse handler only,  FreeCell version is quite different
  attemptMove: function(card, destination) {
    if(!destination.mayAddCard(card)) return false;
    this.moveTo(card, destination);
    return true;
  },

  // Attempts to move a card to somewhere on the foundations, returning |true| if successful.
  // This default version is for Klondike-like games, Spider-like games may need to override it.
  sendToFoundations: function(card) {
    if(!card.parentNode.mayTakeCard(card)) return false;
    var f = this.getFoundationMoveFor(card);
    if(!f) return false;
    this.moveTo(card, f);
    return true;
  },

  // xxx much better versions of this should be possible in most games
  getFoundationMoveFor: function(card) {
    const fs = this.foundations, len = fs.length;
    for(var i = 0, f = fs[0]; i != len; f = fs[++i]) if(f.mayAddCard(card)) return f;
    return null;
  },



  // === Redealing ========================================
  // xxx relics of experiments with redeals.  only Montana has these now
  redeals: 0,
  redealsRemaining: 0,
  canRedeal: function() {
    return false;
  },
  redeal: function() {
  },



  // === Revealing Cards ==================================
  attemptRevealCard: function(card) {
    if(card.faceDown && !card.nextSibling) this.doAction(new RevealCardAction(card));
  },

  revealCard: function(card) {
    this.doAction(new RevealCardAction(card));
    return true;
  },



  // === Dealing from the stock ===========================
  dealFromStock: function() {
    throw "dealFromStock() not implemented";
  },

  turnStockOver: "no",

  // These functions are used to implement the standard rules and their *Action's
  dealCardTo: function(destination) {
    var card = this.stock.lastChild;
    card.setFaceUp();
    destination.addCards(card);
  },

  undealCardFrom: function(source) {
    var card = source.lastChild;
    card.setFaceDown();
    this.stock.addCards(card);
  },



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

  getHints: function() {
  },

  // takes the card to suggest moving, and the destination to suggest moving to (generally a pile)
  addHint: function(source, dest) {
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
      if(p.hasChildNodes() && p.mayAddCard(card)) ds.push(p);
    }
    if(ds.length) this.addHints(card, ds);
    this.addFoundationHintsFor(card);
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



  // === Right-click "intelligent" moving of cards ========
  // Called when the player right-clicks on a card. Games should implement getBestMoveForCard(card)
  doBestMoveForCard: function(card) {
    if(!card.parentNode.mayTakeCard(card)) return;
    var target = this.getBestMoveForCard(card);
    if(target) this.moveTo(card,target);
  },

  getBestMoveForCard: function(card) {
    return null;
  },



  // === Autoplay =========================================
  // autoplay() is called whenever an animation completes, and should be called
  // after any move/action that doesn't use animation (e.g. dealing from the stock).
  // Games should override autoplayMove()

  // A bool is returned so animatedActionFinished() can decide whether to reenable the UI.
  // (We want to keep it disabled throughout seq's of consecutive animated moves.)
  autoplay: function(pileWhichHasHadCardsRemoved) {
    // automatically reveal cards
    if(pileWhichHasHadCardsRemoved) {
      var card = pileWhichHasHadCardsRemoved.lastChild;
      if(card && card.faceDown) return this.revealCard(card);
    }

    if(this.autoplayMove(pileWhichHasHadCardsRemoved)) return true;
    if(!this.hasBeenWon()) return false;

    showGameWon();
    return true;
  },

  // Must carry out a single autoplay step, returning true if successful, false otherwise
  // (strictly speaking it must return true if it has inititated an animation, because that will
  // call autoplay again on completion.)
  autoplayMove: function() {
    return false;
  },



  // === Miscellany =======================================
  get firstEmptyFoundation() {
    var fs = this.foundations, len = fs.length;
    for(var i = 0; i != len; i++) if(!fs[i].hasChildNodes()) return fs[i];
    return null;
  },

  get firstEmptyPile() {
    var ps = this.piles, len = ps.length;
    for(var i = 0; i != len; i++) if(!ps[i].hasChildNodes()) return ps[i];
    return null;
  },

  get emptyCell() {
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++) if(!cs[i].hasChildNodes()) return cs[i];
    return null;
  }
}







function makeGameConstructor(proto) {
  // using the |function| keyword here sometimes results in the same function being returned
  // for each call of makeGameConstructor, so all games become Sanibel (see bug 7976).
  var f = new Function();
  f.prototype = proto;
  return f;
}


function GameController(id, proto) {
  this.id = id;
  this.proto = proto;
  this.constructor = makeGameConstructor(proto);
  this.pastGames = [];
  this.futureGames = [];
}
GameController.prototype = {
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
