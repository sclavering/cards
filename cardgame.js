var BaseCardGame = {
  id: null, // needs to be unique.  used in pref. names.

  layout: null, // id of a xul element.  if left null this.id will be used instead
  xulElement: null, // the container vbox/hbox for the game (set automatically)

  // An array of strings, each of which is prefixed with "difficulty." then looked up in
  // gStrings to build the difficulty level menu when switching to the current card game.
  // Each gets assigned a number, *counting from 1* (to avoid js's 0==false), and the
  // selected difficulty level is stored in |Game.difficultyLevel|
  difficultyLevels: null,
  difficultyLevel: 0,

  // games should create all the cards they need the first time they are run.  if they set this field
  // to a number then it will be replaced by an array holding the cards for that many decks (by the
  // initialise() method below).  if they need something more complex they should set this in init()
  cards: 1,

  // boolean flags that games might want to override
  acesHigh: false,

  // see mouse.js
  mouseHandling: "drag+drop",
  mouseHandler: null,

  // these are all automatically set up by initStacks()
  allstacks: [],   // array of piles of all times.  used for clearing the game
  stacks: [],      // array of tableau piles
  foundations: [], // array of foundation piles
  reserves: [],    // ...
  cells: [],
  stock: null,     // the stock pile if the game has one, otherwise null
  waste: null,
  foundation: null, // if the game has just one foundation this will be it
  reserve: null,
  thingsToReveal: null, // piles to automatically turn the top card of up.  consists of normal and reserve piles
  dragDropTargets: null, // piles where cards can potentially be dropped.  consists of normal and foundation piles



  // === Start/Finish Playing =============================
  // Games may override init(), and nothing else.
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {
  },

  start: function() {
    var initialised = this.initialised;
    if(!initialised) this.initialise();
    this.xulElement.hidden = false;
    this.initDifficultyLevel();
    // xxx restore the game the user was playing in the previous session instead
    if(!initialised) this.newGame();
  },

  end: function() {
    this.mouseHandler.reset();
    this.xulElement.hidden = true;
  },

  initialise: function() {
    this.initialised = true;
    if(!this.mouseHandler) this.mouseHandler = MouseHandlers[this.mouseHandling];
    this.initXulElement();
    this.initPiles();
    // if layout from another game has been cloned we need to throw away any cards in it
    for(var i in this.allstacks) {
      var s = this.allstacks[i];
      while(s.hasChildNodes()) s.removeChild(s.lastChild);
    }

    this.init(); // game specific stuff

    // see comments above
    if(typeof this.cards == "number") this.cards = getDecks(this.cards);

    // if the game doesn't specify something
    // xxx still required for init'ing stock.counter, but not for anything else!
    if(this.stock && !this.waste && !this.stockDealTargets) this.stockDealTargets = this.stacks;

    // see rules.js
    // if any of various members that should be functions are instead strings then substitute appropriate function
    var rules = ["canMoveCard","canMoveToPile","canMoveToFoundation","dealFromStock","getLowestMovableCard"];
    for(var r in rules) {
      r = rules[r];
      if(typeof this[r] == "string") this[r] = Rules[r][this[r]];
    }
  },

  initXulElement: function() {
    if(!this.layout || this.layout==this.id) { this.xulElement = document.getElementById(this.id); return; }

    function replaceIds(newId, old, node) {
      if(node.id) node.id = newId + node.id.substring(old.length);
      for(var i = 0; i < node.childNodes.length; i++) replaceIds(newId, old, node.childNodes[i]);
    }

    // if it uses the same layout as another game then clone that layout and fix the ids in the clone (so initPiles() works)
    var elt = this.xulElement = document.getElementById(this.layout).cloneNode(true);
    replaceIds(this.id, this.layout, elt);
    gGameStack.insertBefore(elt, gGameStack.firstChild);
  },

  // Init's stacks[], foundations[], reserves[], cells[], |foundation|, |reserve|, |stock| and
  // |waste| members (sometimes to null or to empty arrays).
  // Requires relevant XUL elements to have ids of the form {this.id}-{pile-type}[-{int}]
  initPiles: function() {
    // Unless these are set explicitly then all games share the same arrays (breaking everything)
    this.stacks = [];
    this.foundations = [];
    this.reserves = [];
    this.cells = [];
    var allpiles = this.allstacks = [];

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

    initPilesOfType("-pile-", "isNormalPile", this.stacks);
    initPilesOfType("-foundation-", "isFoundation", this.foundations);
    initPilesOfType("-reserve-", "isReserve", this.reserves);
    initPilesOfType("-cell-", "isCell", this.cells);

    if(this.stock) {
      // a <label/> for displaying the num. of deals left
      var counter = this.stock.counter = document.getElementById(id+"-stock-counter");
      if(counter) counter.add = function(val) { this.value = parseInt(this.value)+val; };
    }

    // drag'n'drop targets.  could also include cells, but FreeCell/Towers don't use d'n'd in any case
    this.dragDropTargets = this.stacks.concat(this.foundations);
    if(this.foundation) this.dragDropTargets.push(this.foundation);
    // which piles should we automatically reveal the top card of?
    // (some games have no use for this, but checking all these piles doesn't take very long so...)
    this.thingsToReveal = this.stacks.concat(this.reserves);
    if(this.reserve) this.thingsToReveal.push(this.reserve);
  },



  // === Difficulty Levels =======================================

  // checks if the current game has difficulty levels and inits the menu if so.
  initDifficultyLevel: function() {
    // clear the 'Difficulty' menu on the toolbar
    // (menu being empty is used to indicate game does not have multiple difficulty levels)
    var menu = gDifficultyLevelPopup;
    while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);
    // get levels.  if none then return (updateUI will ensure menu disabled)
    var levels = this.difficultyLevels;
    if(!levels) return;
    enableDifficultyMenu();
    // read current level from prefs.  default to numLevls/2, which should generally end up being Medium
    var currentLevel;
    try {
      currentLevel = gPrefs.getIntPref(this.id+".difficulty-level");
    } catch(e) {
      currentLevel = Math.ceil(levels.length / 2);
    }
    this.difficultyLevel = currentLevel;
    // add appropriate menu items
    for(var i = 0; i < levels.length; i++) {
      var mi = document.createElement("menuitem");
      mi.setAttribute("label",gStrings["difficulty."+levels[i]]);
      mi.setAttribute("value",i+1); // number from 1, to avoid js 0==false thing
      mi.setAttribute("type","radio");
      if(i+1==currentLevel) mi.setAttribute("checked","true");
      menu.appendChild(mi);
    }
  },

  // games can retrieve a integer >0 for the current difficulty level via Game.difficultyLevel;
  setDifficultyLevel: function(level) {
    level = parseInt(level);
    gPrefs.setIntPref(this.id+".difficulty-level", level);
    this.difficultyLevel = level;
    this.newGame();
  },



  // === Start Game =======================================
  // Games should override deal(), and should use dealToStack to do so.

  newGame: function() {
    this.mouseHandler.reset();
    this.score = 0;
    this.undoHistory = [];
    this.clearGame();
    this.clearHints();
    this.redealsRemaining = this.redeals;
    // reset offset used when stacking cards.
    if(this.stacks)
      for(var i = 0; i < this.stacks.length; i++)
        this.stacks[i].fixLayout();
    //
    this.deal();

    // xxx this should probably happen elsewhere
    if(this.stock && this.stock.counter) {
      var dealsLeft = this.stock.childNodes.length;
      if(!this.waste) dealsLeft = Math.ceil(dealsLeft / this.stockDealTargets.length);
      this.stock.counter.value = dealsLeft;
    }

    this.updateScoreDisplay(); // must do after deal(), because not all games start the score at 0
    disableUndo();
    disableRedeal();
    enableUI();
  },

  clearGame: function() {
    var s = this.allstacks; //this is an array of <stack>s provided by each game for this purpose
    // remove all cards and set them all face down
    for(var i in s) while(s[i].hasChildNodes()) s[i].removeChild(s[i].lastChild).setFaceDown();
  },

  // should deal out the cards for a new game. newGame() will ensure all stacks are empty
  deal: function() {
  },

  // useful function for deal() to use.  can (and should) be used for all card dealing
  dealToStack: function(cards, stack, numDown, numUp) {
    for(var i = 0; i < numDown+numUp; i++) {
      var card = cards.pop();
      if(!card) continue;
      stack.addCard(card);
      if(i>=numDown) card.setFaceUp();
    }
  },



  // === Winning ==========================================
  // Games should obviously override this
  hasBeenWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // games should override either |getScoreFor|, or |scores|
  score: 0,

  updateScoreDisplay: function() {
    displayScore(this.score);
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
  undoHistory: [],

  // would be called "do", but that's a language keyword
  doAction: function(action) {
    this.undoHistory.push(action);
    action.score = this.getScoreFor(action);
    action.perform();
    this.score += action.score;
    this.updateScoreDisplay();
    this.clearHints();
    // update UI
    if(this.redealsRemaining==0) disableRedeal(); // yuck.  redeals should die.
    if(this.undoHistory.length==1) doEnableUndo();
  },

  canUndo: function() {
    return (this.undoHistory.length!=0);
  },

  // Action objects (see actions.js) each implement an undo() method.
  // This just picks the right object, and adjusts the game score etc.
  undo: function() {
    var undo = this.undoHistory.pop();
    this.score -= undo.score;
    this.updateScoreDisplay();
    undo.undo();
    // en/dis-able the Undo and Redeal buttons
    fixUI();
  },

  restart: function() {
    while(this.undoHistory.length!=0) this.undo();
  },



  // === Moving between stacks ============================

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
    if(this.canMoveTo(card,target)) {
      // *don't* change to calling doAction directly, as some
      // games might be overriding moveTo but not this function
      this.moveTo(card,target);
      return true;
    }
    return false;
  },

  // Attempts to move a card to somewhere on the foundations, returning |true| if successful.
  // This default version is for Klondike-like games, Spider-like games may need to override it.
  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    for(var i = 0; i < this.foundations.length; i++)
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
  revealCard: function(card) {
    if(card.faceDown && !card.nextSibling)
      this.doAction(new RevealCardAction(card));
  },



  // === Dealing from the stock ===========================
  // Games with a stock should provide dealFromStock(), probably via a form in rules.js
  // These functions are used to implement the standard rules and their *Action's
  dealCardTo: function(destination) {
    var card = this.stock.lastChild;
    card.setFaceUp();
    card.transferTo(destination);
  },

  undealCardFrom: function(source) {
    var card = source.lastChild;
    card.setFaceDown();
    card.transferTo(this.stock);
  },



  // === Hints ============================================
  // Games should override getHints(); the implementation should call addHint[s]() repeatedly.
  hintSources: [],
  hintDestinations: [],
  haveHints: false, // means hints have been calculated, though there may not be any.
  hintNum: 0,

  hint: function() {
    if(!this.haveHints) {
      this.getHints();
      this.haveHints = true;
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

  // takes the card to suggest moving, and the destination to suggest moving to (generally a stack)
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
    this.addHints(card, filter(this.stacks, testCanMoveToNonEmptyPile(card)));
    var f = searchPiles(this.foundations, testCanMoveToFoundation(card));
    if(f) this.addHint(card, f);
  },

  clearHints: function() {
    this.hintSources = [];
    this.hintDestinations = [];
    this.haveHints = false;
    this.hintNum = 0;
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
  // Games can override thingsToReveal[] to control auto revealing.
  // Games should override autoplayMove()

  // A bool is returned so CardMover.move() can decide whether to reenable the UI.
  // (We want to keep it disabled throughout seq's of consecutive animated moves.)
  autoplay: function() {
    if(this.autoReveal() || this.autoplayMove()) {
      return true;
    } else if(Game.hasBeenWon()) {
      showGameWon();
      return true;
    }
    return false;
  },

  autoReveal: function() {
    var stacks = this.thingsToReveal;
    if(!stacks) return false;
    for(var i = 0; i < stacks.length; i++) {
      var last = stacks[i].lastChild;
      if(last && last.faceDown) {
        this.revealCard(last);
        return true;
      }
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
