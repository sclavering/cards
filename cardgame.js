var BaseCardGame = {
  id: null, // needs to be unique.  used in pref. names.

  layout: null, // id of a xul element.  if left null this.id will be used instead
  xulElement: null, // the container vbox/hbox for the game (set automatically)

  // Games should create all the cards they need the first time they are run.  if they set this field
  // to a number then it will be replaced by an array holding the cards for that many decks (by the
  // initialise() method below).  If they set it to an array of four numbers those nums will be passed
  // to getCardSuits().  If they need something more complex they should set this in init()
  cards: 1,

  // boolean flags that games might want to override
  acesHigh: false,

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
  dragDropTargets: null, // piles where cards can potentially be dropped.  consists of normal and foundation piles



  // === Start/Finish Playing =============================
  // Games may override init(), and nothing else.
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {
  },

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
    this.initXulElement();
    this.initPiles();
    // if layout from another game has been cloned we need to throw away any cards in it
    for(var i in this.allpiles) {
      var s = this.allpiles[i];
      while(s.hasChildNodes()) s.removeChild(s.lastChild);
    }

    // see comments above
    if(typeof this.cards == "number") this.cards = getDecks(this.cards);
    else if(typeof this.cards[0] == "number") this.cards = getSuits(this.cards);

    this.init(); // game specific stuff

    // see rules.js
    // if any of various members that should be functions are instead strings then substitute appropriate function
    for(var r in Rules) if(typeof this[r] == "string") this[r] = Rules[r][this[r]];
  },

  initXulElement: function() {
    if(!this.layout || this.layout==this.id) { this.xulElement = document.getElementById(this.id); return; }

    function replaceIds(newId, old, node) {
      if(node.id) node.id = newId + node.id.substring(old.length);
      for(var i = 0; i != node.childNodes.length; i++) replaceIds(newId, old, node.childNodes[i]);
    }

    // if it uses the same layout as another game then clone that layout and fix the ids in the clone (so initPiles() works)
    var elt = this.xulElement = document.getElementById(this.layout).cloneNode(true);
    replaceIds(this.id, this.layout, elt);
    gGameStack.insertBefore(elt, gGameStack.firstChild);
  },

  // Init's piles[], foundations[], reserves[], cells[], |foundation|, |reserve|, |stock| and
  // |waste| members (sometimes to null or to empty arrays).
  // Requires relevant XUL elements to have ids of the form {this.id}-{pile-type}[-{int}]
  initPiles: function() {
    // Unless these are set explicitly then all games share the same arrays (breaking everything)
    this.piles = [];
    this.foundations = [];
    this.reserves = [];
    this.cells = [];
    var allpiles = this.allpiles = [];

    var id = this.id;
    var thiss = this; // so it can be referred to in nested functions

    function initPileOfType(type, property, field) {
      var pile = initPileFromId(id+type);
      if(!pile) return;
      pile[property] = true;
      thiss[field] = pile;
      allpiles.push(pile);
    }

    function initPilesOfType(type, property, array) {
      for(var i = 0; true; i++) {
        var node = initPileFromId(id+type+i);
        if(!node) break;
        node[property] = true;
        array.push(node);
        allpiles.push(node);
      }
    }

    initPileOfType("-stock", "isStock", "stock");
    initPileOfType("-waste", "isWaste", "waste");
    initPileOfType("-foundation", "isFoundation", "foundation");
    initPileOfType("-reserve", "isReserve", "reserve");

    initPilesOfType("-pile-", "isNormalPile", this.piles);
    initPilesOfType("-foundation-", "isFoundation", this.foundations);
    initPilesOfType("-reserve-", "isReserve", this.reserves);
    initPilesOfType("-cell-", "isCell", this.cells);

    if(this.stock) {
      // a <label/> for displaying the num. of deals left
      var counter = this.stock.counter = document.getElementById(id+"-stock-counter");
      if(counter) {
        counter.set = function(val) { this.value = this._value = val; };
        counter.add = function(val) { this.value = this._value += val; };
      }
    }

    // autoplay sources
    this.sourcePiles = this.waste ? [this.waste].concat(this.piles) : this.piles;
    // drag'n'drop targets.  could also include cells, but FreeCell/Towers don't use d'n'd in any case
    this.dragDropTargets = this.piles.concat(this.foundations);
    if(this.foundation) this.dragDropTargets.push(this.foundation);
  },



  // === Start Game =======================================
  // Games should override deal(), and shuffleImpossible() if they need to

  // |cards| is only defined if we're trying to restart a game
  begin: function(cards) {
    var pro = this.__proto__;
    // we only need to initialise once per game, not once per instance of the game.
    if(!pro.initialised) pro.initialise();

    this.mouseHandler.reset();
    this.setScoreTo(0);
    this.actionsDone = [];
    this.actionsUndone = [];
    this.clearGame();
    this.redealsRemaining = this.redeals;

    if(!cards) {
      cards = this.cards;
      do cards = shuffle(cards);
      while(this.shuffleImpossible(cards));
    }
    this.cardsAsDealt = cards.slice(0);
    this.deal(cards);

    if(this.stock && this.stock.counter) this.stock.counter.set(this.stockCounterStart);

    if(this.canRedeal()) gCmdRedeal.removeAttribute("disabled");
    else gCmdRedeal.setAttribute("disabled", "true");
  },

  restore: function() {
    this.mouseHandler.reset();
    this.setScoreTo(0);
    this.clearGame();
    this.redealsRemaining = this.redeals;
    this.deal(this.cardsAsDealt.slice(0));
    if(this.stock && this.stock.counter) this.stock.counter.set(this.stockCounterStart);

    var done = this.actionsDone;
    for(var i = 0; i != done.length; i++) {
      var d = done[i];
      if("redo" in d) d.redo();
      else d.perform();
    }
  },

  clearGame: function() {
    // remove all cards and set them all face down
    var s = this.allpiles;
    for(var i in s) while(s[i].hasChildNodes()) s[i].removeChild(s[i].lastChild).setFaceDown();
    // reset offset used when stacking cards.
    if(this.piles)
      for(i = 0; i != this.piles.length; i++)
        this.piles[i].fixLayout();
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
  score: 0,

  setScoreTo: function(value) {
    this.score = value;
    gScoreDisplay.value = value;
  },

  adjustScoreBy: function(delta) {
    if(!delta) return;
    this.score += delta;
    gScoreDisplay.value = this.score;
  },

  // action is an Action object
  getScoreFor: function(action) {
    var actionstr = action.action;
    if(actionstr in this.scores) return this.scores[actionstr];
    return 0;
  },

  // a string->number mapping of scores
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
    var hadRedos = this.actionsUndone.length!=0;
    if(hadRedos) this.actionsUndone = [];
    action.score = this.getScoreFor(action);
    action.perform();

    this.adjustScoreBy(action.score);
    this.hintsReady = false;

    // xxx yuck
    if(GameController.haveFutureGames) GameController.clearFutureGames();

    // asynch. (i.e. animated) actions will trigger autoplay themselves,
    // and autoplay will trigger a UI update if it actually does anything
    if(action.synchronous && !this.autoplay()) {
      if(this.actionsDone.length==1) gCmdUndo.removeAttribute("disabled");
      if(hadRedos) gCmdRedo.setAttribute("disabled","true");
      if(this.redealsRemaining==0) gCmdRedeal.setAttribute("disabled","true"); // yuck.
    }
  },

  // Action objects (see actions.js) each implement an undo() method.
  // This just picks the right object, and adjusts the game score etc.
  undo: function() {
    var action = this.actionsDone.pop();
    this.actionsUndone.push(action);
    this.adjustScoreBy(-action.score);
    this.hintsReady = false;

    action.undo();

    if(this.redealsRemaining==1) gCmdRedeal.removeAttribute("disabled");

    if("undoNext" in action && action.undoNext) this.undo();
  },

  redo: function() {
    var action = this.actionsUndone.pop();
    this.actionsDone.push(action);
    this.adjustScoreBy(action.score);
    this.hintsReady = false;

    if("redo" in action) action.redo();
    else action.perform();

    if(this.redealsRemaining==0) gCmdRedeal.setAttribute("disabled","true");

    if("redoNext" in action && action.redoNext) this.redo();
  },



  // === Moving between piles =============================

  // returns true/false for whether the card can be moved from its current position
  // this version will be sufficient for some games, others will need to override (e.g. Spider)
  canMoveCard: function(card) {
    return card.faceUp;
  },

  // returns true/false for whether it is a legal move to take card to destination
  // this function follows the pattern needed by all games seen so far, leaving
  // them just to implement canMoveToPile and canMoveToFoundation
  canMoveTo: function(card,target) {
    // can never move TO a reserve pile
    if(target.isReserve) return false;
    if(target.isFoundation) return this.canMoveToFoundation(card,target);
    return this.canMoveToPile(card,target);
  },

  // this is the way foundations work in most games: built one card at a time, all the same suit, ascending
  // games (e.g. Spider, SimpleSimon) where only a complete suit can move to foundation will need to override
  canMoveToFoundation: function(card,target) {
    // can only move a single card.
    if(card.nextSibling) return false;
    // can move Ace to empty foundation, or other card if it is consecutive and same suit as top card there
    var last = target.lastChild;
    return (last ? (card.isSameSuit(last) && card.isConsecutiveTo(last)) : card.isAce);
  },

  // xxx maybe this should die now?  it was important before doAction existed
  moveTo: function(card, target) {
    this.doAction(new MoveAction(card, card.parentNode.source, target));
    return true;
  },

  // convenience function
  attemptMove: function(card, target) {
    if(!this.canMoveTo(card,target)) return false;
    // *don't* change to calling doAction directly, as some
    // games might be overriding moveTo but not this function
    this.moveTo(card,target);
    return true;
  },

  // Attempts to move a card to somewhere on the foundations, returning |true| if successful.
  // This default version is for Klondike-like games, Spider-like games may need to override it.
  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    for(var i = 0; i != this.foundations.length; i++)
      if(this.attemptMove(card,this.foundations[i]))
        return true;
    return false;
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
  tryRevealCard: function(card) {
    if(card.faceDown && !card.nextSibling) this.doAction(new RevealCardAction(card));
  },

  revealCard: function(card) {
    this.doAction(new RevealCardAction(card));
    return true;
  },



  // === Dealing from the stock ===========================
  // Games with a stock should provide dealFromStock(), probably via a form in rules.js
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

  // takes multiple destinations for a single source
  addHints: function(source, dests) {
    for(var i = 0; i != dests.length; i++) {
      this.hintSources.push(source);
      this.hintDestinations.push(dests[i]);
    }
  },

  // a common pattern.  xxx doesn't quite fit Klondike and Double Solitaire
  addHintsFor: function(card) {
    if(!card) return;
    this.addHints(card, filter(this.piles, testCanMoveToNonEmptyPile(card)));
    var f = searchPiles(this.foundations, testCanMoveToFoundation(card));
    if(f) this.addHint(card, f);
  },



  // === Smart move =======================================
  // Smart move is called when the player right-clicks on a card.  It should
  // perform the best possible move for that card.
  // Games should implement getBestMoveForCard(card), or maybe override smartMove()
  // itself.  See util.js for functions that are helpful in doing so.
  smartMove: function(card) {
    if(!this.canMoveCard(card)) return;
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

    if(this.hasBeenWon()) {
      showGameWon();
      return true;
    }
    return false;
  },

  // Must carry out a single autoplay step, returning true if successful, false otherwise
  // (strictly speaking it must return true if it has inititated an animation, because that will
  // call autoplay again on completion.)
  autoplayMove: function() {
    return false;
  }
}










function makeGameConstructor(proto) {
  var f = function() {};
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

  switchTo: function(leaveDifficultyMenuAlone) {
    if(!leaveDifficultyMenuAlone) initDifficultyLevelMenu(null);

    if(!this.currentGame) this.newGame();

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

  restartGame: function() {
    // we have to pass a copy of the array, or restoring the old game won't work
    this.newGame(Game.cardsAsDealt.slice(0));
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


function DifficultyLevelsController(id, ids, names) {
  this.id = id;
  this.levelIds = ids;
  this.levelNames = names;

  try { var curr = gPrefs.getIntPref(this.id+".currentdifficulty"); }
  catch(e) { curr = Math.floor(ids.length/2); }
  this.currentLevelIndex = curr;
  this.currentLevel = AllGames[ids[curr]];
}
DifficultyLevelsController.prototype = {
  setDifficultyLevel: function(levelIndex) {
    gPrefs.setIntPref(this.id+".currentdifficulty", levelIndex);

    this.currentLevelIndex = levelIndex;
    this.currentLevel.switchFrom();
    this.currentLevel = AllGames[this.levelIds[levelIndex]];
    this.currentLevel.switchTo(true);
  },

  switchTo: function() {
    initDifficultyLevelMenu(this.levelNames, this.currentLevelIndex);
    this.currentLevel.switchTo(true);
  },

  switchFrom: function() {
    this.currentLevel.switchFrom();
  },

  newGame: function() {
    this.currentLevel.newGame();
  },

  restartGame: function() {
    this.currentLevel.restartGame();
  },

  restorePastGame: function() {
    this.currentLevel.restorePastGame();
  },

  restoreFutureGame: function() {
    this.currentLevel.restoreFutureGame();
  },

  get havePastGames(val) {
    return this.currentLevel.havePastGames;
  },

  get haveFutureGames() {
    return this.currentLevel.haveFutureGames;
  },

  clearFutureGames: function() {
    this.currentLevel.clearFutureGames();
  }
}
