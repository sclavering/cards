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

  // boolean flags that games might want to override
  acesHigh: false,

  // rule vars that can be set rather than a Game providing the corresponding function
  // see rules.js for the possible values
  rule_canMoveCard: null,
  rule_canMoveToPile: null,
  rule_canMoveToFoundation: null,
  rule_dealFromStock: null,
  rule_getLowestMovableCard: null,

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

  // array of piles to be examined after each move for cards to reveal
  // in most cases this will be set automatically, but games can probably override
  thingsToReveal: null,
  // list of elements which the DragDrop system should test if cards are being dropped on
  // xxx is this still used??
  dragDropTargets: null,


  // === Start/Finish Playing =============================
  // Games may override init(), and nothing else.
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {
  },

  start: function() {
    if(!this.initialised) this.initialise();
    this.xulElement.hidden = false;
    this.initDifficultyLevel();
    this.newGame();
  },

  end: function() {
    this.endGame();
    this.clearGame();
    this.mouseHandler.reset();
    this.xulElement.hidden = true;
  },

  initialise: function() {
    this.initialised = true;
    if(!this.mouseHandler) this.mouseHandler = MouseHandlers[this.mouseHandling];
    this.initStacks();
    this.xulElement = document.getElementById(this.layout || this.id);
    this.init(); // game specific stuff

    // if the game doesn't specify something
    // xxx still required for init'ing stock.counter, but not for anything else!
    if(this.stock && !this.waste && !this.stockDealTargets) this.stockDealTargets = this.stacks;

    // xxx replace with a rules object, so a loop could be used?
    if(this.rule_canMoveCard) this.canMoveCard = Rules.canMoveCard[this.rule_canMoveCard];
    if(this.rule_canMoveToPile) this.canMoveToPile = Rules.canMoveToPile[this.rule_canMoveToPile];
    if(this.rule_canMoveToFoundation) this.canMoveToFoundation = Rules.canMoveToFoundation[this.rule_canMoveToFoundation];
    if(this.rule_dealFromStock) this.dealFromStock = Rules.dealFromStock[this.rule_dealFromStock];
    if(this.rule_getLowestMovableCard) this.getLowestMovableCard = Rules.getLowestMovableCard[this.rule_getLowestMovableCard];
  },

  // Init's stacks[], foundations[], reserves[], cells[], |foundation|, |reserve|, |stock| and
  // |waste| members (sometimes to null or to empty arrays).
  // Requires game to have a |id| param, and all piles of various types to have ids of
  // the form {id}-{pile-type}-{int} in the XUL
  initStacks: function() {
    // Unless these are set explicitly then all games share the same arrays (breaking everything)
    this.stacks = [];
    this.cells = [];
    this.reserves = [];
    this.foundations = [];
    this.allstacks = [];

    var id = this.layout || this.id;
    this.stock = createCardPile(id+"-stock");
    if(this.stock) {
      this.stock.isStock = true;
      this.allstacks.push(this.stock);
      // a <label/> for displaying the num. of deals left
      var counter = this.stock.counter = document.getElementById(id+"-stock-counter");
      if(counter) counter.add = function(val) { this.value = parseInt(this.value)+val; };
    }
    this.waste = createCardPile(id+"-waste");
    if(this.waste) {
      this.waste.isWaste = true;
      this.allstacks.push(this.waste);
    }
    // try for a single foundation or reserve pile
    this.foundation = createCardPile(id+"-foundation");
    if(this.foundation) {
      this.foundation.isFoundation = true;
      this.allstacks.push(this.foundation);
    }
    this.reserve = createCardPile(id+"-reserve");
    if(this.reserve) {
      this.reserve.isReserve = true;
      this.allstacks.push(this.reserve);
    }
    // try for >1 piles, foundations, reserves and cells
    var i, node;
    for(i = 0; true; i++) {
      node = createCardPile(id+"-pile-"+i);
      if(!node) break;
      node.isNormalPile = true;
      this.stacks.push(node);
      this.allstacks.push(node);
    }
    for(i = 0; true; i++) {
      node = createCardPile(id+"-foundation-"+i);
      if(!node) break;
      node.isFoundation = true;
      this.foundations.push(node);
      this.allstacks.push(node);
    }
    for(i = 0; true; i++) {
      node = createCardPile(id+"-reserve-"+i);
      if(!node) break;
      node.isReserve = true;
      this.reserves.push(node);
      this.allstacks.push(node);
    }
    for(i = 0; true; i++) {
      node = createCardPile(id+"-cell-"+i);
      if(!node) break;
      node.isCell = true;
      this.cells.push(node);
      this.allstacks.push(node);
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
  // card shuffling.  games should use this to get an array of shuffled cards
  // get "num" standard 52 cards shuffled decks as a card array
  shuffleDecks: function(num) {
    return CardShuffler.shuffleDecks(num);
  },
  // get an array of shuffled cards containing "spades" Ace->King sets of spades etc.
  // this allows for games such as spider which someties need just one or two suits
  shuffleSuits: function(spades, hearts, diamonds, clubs) {
    return CardShuffler.shuffleSuits(spades,hearts,diamonds,clubs);
  },
  // shuffle an array of cards provided by the game (needed for Mod3, which doesn't use Aces)
  shuffle: function(cardArray) {
    return CardShuffler.shuffle(cardArray);
  },
  // get "num" decks of cards, sorted Ace->King; Spades, Diamonds, Hearts, Clubs
  getCardDecks: function(num) {
    return CardShuffler.getCardDecks(num);
  },



  // === Finish Game ======================================
  clearGame: function() {
    var s = this.allstacks; //this is an array of <stack>s provided by each game for this purpose
    for(var i = 0; i < s.length; i++) {
      while(s[i].hasChildNodes()) s[i].removeChild(s[i].lastChild);
    }
  },
  endGame: function() {
    disableUI();
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
    var actionstr = action.action
    if(actionstr in this.scores) return this.scores[actionstr];
    return 0;
  },

  // a hashtable of scores
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
    return card.faceUp();
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
    return (last ? (card.isSameSuit(last) && card.isConsecutiveTo(last)) : card.isAce());
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
    if(card.faceDown() && !card.nextSibling)
      this.doAction(new RevealCardAction(card));
  },



  // === Dealing from the stock ===========================
  // Games with a stock should provide dealFromStock(), or set rule_dealFromStock.
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
      this.endGame();
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
      if(last && last.faceDown()) {
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
  },

  // This gets used in lots of games, so we put it here to save duplication
  // It assumes foundations are built in ascending order within a single colour, which is often true
  // Typical usage (Klondike) is:
  //   if(numCardsOnFoundations(RED,4)==2) ... can autoplay black fives ...
  numCardsOnFoundations: function(colour, number) {
    var found = 0;
    for(var i = 0; i < this.foundations.length; i++) {
      var top = this.foundations[i].lastChild;
      if(top && top.number()>=number && top.colour()==colour) found++;
    }
    return found;
  }
}
