var BaseCardGame = {
  // games must provide this, the id of the vbox/hbox that contains all the game's content
  id: null,

  // boolean flags that games might want to override
  canTurnStockOver: false,
  acesHigh: false,

  // rule vars that can be set rather than a Game providing the corresponding function
  // see rules.js for the possible values
  rule_canMoveCard: null,
  rule_canMoveToPile: null,

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
  thingsToReveal: null,
  // list of elements which the DragDrop system should test if cards are being dropped on
  dragDropTargets: null,
  // the piles to deal to when the stock is clicked.  ignored if the game has a waste pile,
  // and if left null this.stacks will be used instead.
  stockDealTargets: null,

  xulElement: null, // the container vbox/hbox for the game


  // === Start/Finish Playing =============================
  initialised: false,

  // Games which need to do some additional initialisation should override this.
  // It is called the first time the game is played.
  init: function() {
  },

  start: function() {
    if(!this.initialised) this.initialise();
    // show
    this.xulElement.hidden = false;
    // creates the Difficulty level menu on the toolbar if necessary, and sets the Game.difficultyLevel param
    this.initDifficultyLevel();
    // init stack arrays and stuff
    this.newGame();
  },

  end: function() {
    this.endGame();
    this.clearGame();
    this.mouseHandler.reset();
    // hide
    this.xulElement.hidden = true;
  },

  initialise: function() {
    this.initialised = true;
    if(!this.mouseHandler) this.mouseHandler = MouseHandlers[this.mouseHandling];
    this.initStacks();
    this.xulElement = document.getElementById(this.id);
    this.init(); // game specific stuff

    // if the game doesn't specify something
    if(this.stock && !this.waste && !this.stockDealTargets) this.stockDealTargets = this.stacks;

    if(this.rule_canMoveCard) this.canMoveCard = Rules.canMoveCard[this.rule_canMoveCard];
    if(this.rule_canMoveToPile) this.canMoveToPile = Rules.canMoveToPile[this.rule_canMoveToPile];
  },

  // inits stacks[], foundations[], reserves[], cells[], |foundation|, |reserve|, |stock| and
  // |waste| members (sometimes to null or to empty arrays).
  // Requires game to have a |id| param, and all piles of various types to have ids of
  // the form {id}-{pile-type}-{int} in the XUL
  initStacks: function() {
    // We have to set these all to empty arrays now, or every game ends up using the *same* arrays
    // for |stacks|, |foundations|, etc., which means everything breaks horribly as soon as a the
    // user switches to a new type of game.
    this.stacks = [];
    this.cells = [];
    this.reserves = [];
    this.foundations = [];
    this.allstacks = [];

    var id = this.id;
    this.stock = createCardPile(id+"-stock");
    if(this.stock) {
      this.stock.isStock = true;
      this.allstacks.push(this.stock);
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

    this.dealsLeftDisplay = document.getElementById(id+"-deals-left");
  },



  // === Difficulty Levels =======================================

  // checks if the current game has difficulty levels and inits the menu if so.
  initDifficultyLevel: function() {
    // clear the 'Difficulty' menu on the toolbar
    // (menu being empty is used to indicate game does not have multiple difficulty levels)
    var menu = Cards.difficultyLevelPopup;
    while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);
    // get levels.  if none then return (updateUI will ensure menu disabled)
    var levels = this.xulElement.getAttribute("difficultyLevels");
    if(!levels || levels=="") return;
    //
    Cards.enableDifficultyMenu();
    levels = levels.split('|');
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
      mi.setAttribute("label",levels[i]);
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
    if(this.stock) this.initDealsLeft(); // must happen after deal because it counts the cards on the stock

    this.updateScoreDisplay(); // must do after deal(), because not all games start the score at 0
    Cards.disableUndo();
    Cards.disableRedeal();
    Cards.enableUI();
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
  // get "num" decks of cards, sorted Ace->King, Spades,Diamonds,Hearts,Clubs
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
    Cards.disableUI();
  },



  // === Undo stuff =======================================
  score: 0,
  undoHistory: new Array(),

  canUndo: function() {
    return (this.undoHistory.length>0);
  },

  // undo() deals with the mechanisms for storing the hostory of moves performed, and actually undoes
  // a certain set of standard moves.  Anything specific to a certain Game (or sufficiently uncommon)
  // will be handed off to undoMove(), which the game must then deal with.
  // undo() also makes sure the score for a move is subtracted from the current score
  undo: function() {
    var undo = this.undoHistory.pop();
    this.score -= undo.score;
    this.updateScoreDisplay();
    // undo the move of it is a basic action type, otherwise hand it to undoMove, which games can override
    switch(undo.action) {
      case "card-revealed":
        undo.card.setFaceDown();
        this.undo(); // it looks odd seeing blank cards on top of a pile
        break;
      case "dealt-from-stock":
        this.undealFromStock();
        break;
      case "stock-turned-over":
        this.undoTurnStockOver();
        break;
      case "redeal":
        // redeals/reshuffles require a full map of where cards were previously
        this.undoRedeal(undo.map);
        break;
      default:
        this.undoMove(undo);
    }
    // en/dis-able the Undo and Redeal buttons
    Cards.fixUI();
  },
  // Is passed an object with source and card properties.  must move card back, turn over or whatever
  // This version should be sufficient for most games
  undoMove: function(undo) {
    undo.card.transferTo(undo.source);
  },

  restart: function() {
    while(this.undoHistory.length!=0) this.undo();
  },

  updateScoreDisplay: function() {
    Cards.displayScore(this.score);
  },



  // === Move tracking ====================================
  // called by moveTo(), revealCard() and dealFromStock()
  // updates th undo list and score
  trackMove: function(action, card, source) {
    var scorechange = this.getScoreForAction(action, card, source);
    var move = {action: action, card: card, source: source, score: scorechange};
    this.undoHistory.push(move);
    this.score += scorechange;
    this.updateScoreDisplay();
    // if this is the first undo added enable the command
    if(this.undoHistory.length==1) Cards.doEnableUndo();
    // force hints to be regenerated
    this.clearHints();
  },

  trackRedeal: function(map) {
    var scorechange = this.getScoreForAction("redeal");
    var move = {action: "redeal", map: map, score: scorechange};
    this.undoHistory.push(move);
    this.score += scorechange;
    this.updateScoreDisplay();
    // update UI if required
    if(this.redealsRemaining==0) Cards.disableRedeal();
    if(this.undoHistory.length==1) Cards.doEnableUndo();
    // force hints to be regenerated
    this.clearHints();
  },



  // === Winning ==========================================
  // should check if the game is in a won state and return a Boolean
  hasBeenWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // takes strings describing action and returns an integer for the score
  getScoreForAction: function(action, card, source) {
    if(action in this.scores) return this.scores[action];
    return 0;
  },

  // a hashtable of scores (which individual games should provide)
  scores: {},



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
    if(!card.isLastOnPile()) return false;
    // can move Ace to empty foundation, or other card if it is consecutive and same suit as top card there
    var last = target.lastChild;
    return (last ? (card.isSameSuit(last) && card.isConsecutiveTo(last)) : card.isAce());
  },

  // actually perform the move, return true/false  for success.  Should generally call
  // this.trackMove(action: "some-string", card: card, source: someStackNode);
  // source can be retrieved via card.getSource()
  // Spider, Pyramid and FreeCellGame override this
  moveTo: function(card, target) {
    var source = card.getSource();
    var action =
      (target.isFoundation && !source.isFoundation) ? "move-to-foundation" :
      (source.isFoundation && !target.isFoundation) ? "move-from-foundation" :
      (source==this.waste) ? "move-from-waste" :
      "move-between-piles";
    card.moveTo(target);
    this.trackMove(action, card, source);
    return true;
  },

  // convenience function
  attemptMove: function(source, target) {
    if(Game.canMoveTo(source,target)) {
      Game.moveTo(source,target);
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



  // for games like FreeCell and Towers
  getEmptyCells: function() {
    var freecells = [];
    for(var i = 0; i < this.cells.length; i++)
      if(!this.cells[i].hasChildNodes()) freecells.push(this.cells[i]);
    return freecells;
  },
  countEmptyCells: function() {
    var cells = 0;
    for(var i = 0; i < this.cells.length; i++) if(!this.cells[i].hasChildNodes()) cells++;
    return cells;
  },
  getEmptyPiles: function() {
    var spaces = [];
    for(var i = 0; i < this.stacks.length; i++)
      if(!this.stacks[i].hasChildNodes()) spaces.push(this.stacks[i]);
    return spaces;
  },



  // === Redealing ========================================
  // some games allow a certain number of "redeals", where all the remaining cards on the tableau
  // are collected together and shuffled, then redealt in the pattern that was present before

  // notes:
  // * this will only work when all face up cards are above all face down cards on each stack
  //   (but that seems always to be the case...)
  // * this only works for tableau piles, not stocks, reserves, or anything else

  redeals: 0,
  redealsRemaining: 0,

  canRedeal: function() {
    return (this.redealsRemaining > 0);
  },

  redeal: function() {
    this.redealsRemaining--;
    var numStacks = this.stacks.length;
    var i, j;
    // for redealing
    var down = new Array(numStacks);
    var up = new Array(numStacks);
    var cards = [];
    // for undoing the redeal in the future
    var map = {};
    map.cards = new Array(numStacks);
    map.faceUp = new Array(numStacks);
    // remove cards and store pattern
    for(i = 0; i < numStacks; i++) {
      down[i] = 0;
      up[i] = 0;
      var stack = this.stacks[i];
      map.cards[i] = new Array(stack.childNodes.length);
      map.faceUp[i] = new Array(stack.childNodes.length);
      j = stack.childNodes.length;
      while(stack.hasChildNodes()) {
        j--;
        var card = stack.removeChild(stack.lastChild);
        map.cards[i][j] = card;
        map.faceUp[i][j] = card.faceUp();
        if(card.faceDown()) down[i]++;
        else up[i]++;
        card.setFaceDown();
        cards.push(card);
      }
    }
    // shuffle
    cards = this.shuffle(cards);
    // deal out again
    for(i = 0; i < this.stacks.length; i++) {
      this.dealToStack(cards,this.stacks[i],down[i],up[i]);
    }
    // track
    this.trackRedeal(map);
  },

  undoRedeal: function(map) {
    var i, j, stack;
    // remove all cards from present positions
    // (map holds references to them)
    for(i = 0; i < this.stacks.length; i++) {
      stack = this.stacks[i];
      while(stack.hasChildNodes()) stack.removeChild(stack.lastChild);
    }
    // restore previous position
    for(i = 0; i < map.cards.length; i++) {
      stack = this.stacks[i];
      for(j = 0; j < map.cards[i].length; j++) {
        var card = map.cards[i][j];
        if(map.faceUp[i][j]) card.setFaceUp();
        else card.setFaceDown();
        stack.addCard(card);
      }
    }
    //
    this.redealsRemaining++;
  },



  // === Revealing Cards ==================================
  // xxx is canRevealCard actually used?
  canRevealCard: function(card) {
    return card.isLastOnPile();
  },
  revealCard: function(card) {
    if(card.faceDown() && card.isLastOnPile()) {
      card.turnFaceUp();
      this.trackMove("card-revealed", card, null);
    }
  },



  // === Dealing from the stock ===========================
  // Dealing is to the waste pile if there is one, otherwise to each of stockDealTargets[],
  // otherwise to each of stacks[].  Will update dealsLeftDisplay if present.

  dealsLeft: 0,
  dealsLeftDisplay: null, // set in initStacks

  // note: only used in games without a waste pile
  // lets a game impose restrictions on dealing, e.g. in Spider dealing is not allowed if any pile is empty
  canDealFromStock: function() {
    return true;
  },

  initDealsLeft: function() {
    this.dealsLeft = this.stock.childNodes.length;
    if(!this.waste) this.dealsLeft = Math.ceil(this.dealsLeft / this.stockDealTargets.length);
    if(this.dealsLeftDisplay) this.dealsLeftDisplay.value = this.dealsLeft;
  },

  dealFromStock: function() {
    if(this.waste) {
      if(this.stock.hasChildNodes()) {
        this.dealCardTo(this.waste);
        this.trackMove("dealt-from-stock", null, null);
        this.dealsLeft--;
      } else if(this.canTurnStockOver) {
        while(this.waste.hasChildNodes()) this.undealCardFrom(this.waste);
        this.dealsLeft = this.stock.childNodes.length;
        this.trackMove("stock-turned-over", null, null);
      } else {
        return;
      }
    } else {
      if(!this.stock.hasChildNodes() || !this.canDealFromStock()) return;
      var stacks = this.stockDealTargets;
      for(var i = 0; i < stacks.length; i++) this.dealCardTo(stacks[i]);
      this.trackMove("dealt-from-stock", null, null);
      this.dealsLeft--;
    }
    if(this.dealsLeftDisplay) this.dealsLeftDisplay.value = this.dealsLeft;
    this.autoplay();
  },

  dealCardTo: function(destination) {
    var card = this.stock.lastChild;
    card.setFaceUp();
    card.transferTo(destination);
  },

  undealFromStock: function() {
    if(this.waste) {
      this.undealCardFrom(this.waste);
    } else {
      var stacks = this.stockDealTargets;
      for(var i = stacks.length-1; i >= 0; i--) this.undealCardFrom(stacks[i]);
    }
    this.dealsLeft++;
    if(this.dealsLeftDisplay) this.dealsLeftDisplay.value = this.dealsLeft;
  },

  undealCardFrom: function(source) {
    var card = source.lastChild;
    card.setFaceDown();
    card.transferTo(this.stock);
  },

  undoTurnStockOver: function() {
    while(this.stock.hasChildNodes()) this.dealCardTo(this.waste);
    this.dealsLeft = 0;
    if(this.dealsLeftDisplay) this.dealsLeftDisplay.value = this.dealsLeft;
  },



  // === Hints ============================================
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
    HintHighlighter.showHint(src,dest);
    this.hintNum++;
    this.hintNum %= this.hintSources.length;
  },

  // should repeatedly call addHint
  getHints: function() {
  },

  // takes the card to suggest moving, and the destination to suggest moving to (generally a stack)
  addHint: function(source,dest) {
    this.hintSources.push(source);
    this.hintDestinations.push(dest);
  },

  clearHints: function() {
    this.hintSources = [];
    this.hintDestinations = [];
    this.haveHints = false;
    this.hintNum = 0;
  },



  // === Smart move =======================================
  // smart move is called when the player middle clicks on a card.  it should find the best
  // possible move for that card (which will be game dependent) and perform it.
  // Games can either implement getBestMoveForCard(card), or they can override smartMove itself
  smartMove: function(card) {
    if(!this.canMoveCard(card)) return;
    var target = this.getBestMoveForCard(card);
    if(target) this.moveTo(card,target);
  },
  getBestMoveForCard: function(card) {
    return null;
  },

  // smartMove is more intuitive if it looks alternately left and right of the source
  // of the card for moves. This function starts from stack.parentNode and does that,
  // applying test(card,left|right) to each one and returning the stack if test() is true
  searchAround: function(card, test) {
    var piles = this.getPilesRound(card.parentNode);
    for(var i = 0; i < piles.length; i++) if(test(card,piles[i])) return piles[i];
    return null;
  },

  getPilesRound: function(pile) {
    if("surroundingPiles" in pile) return pile.surroundingPiles;

    var left = this.nextStackLeft(pile)
    var right = this.nextStackRight(pile);
    var piles = [];
    while(left || right) {
      if(left) {
        piles.push(left);
        left = this.nextStackLeft(left);
      }
      if(right) {
        piles.push(right);
        right = this.nextStackRight(right);
      }
    }
    pile.surroundingPiles = piles;
    return piles;
  },
  // these rely on a row of stacks being sibing nodes, so XUL should be set up appropriately
  nextStackLeft: function(stack) {
    for(var n = stack.previousSibling; n; n = n.previousSibling)
      if(("isPile" in n) && n.isPile) return n;
    return null;
  },
  nextStackRight: function(stack) {
    for(var n = stack.nextSibling; n; n = n.nextSibling)
      if(("isPile" in n) && n.isPile) return n;
    return null;
  },

  // some functions to pass to searchAround
  lastIsConsecutiveAndSameSuit: function(c,s) {
    var last = s.lastChild;
    return (last && last.isSameSuit(c) && last.isConsecutiveTo(c));
  },
  lastIsConsecutive: function(c,s) {
    var last = s.lastChild;
    return (last && last.isConsecutiveTo(c));
  },
  stackIsEmpty: function(c,s) {
    return !s.hasChildNodes();
  },



  // === Autoplay =========================================
  // this function is called whenever an animation is completed, and should be called by any
  // function that moves cards which doesn't use animation.
  // a bool is returned so CardMover.move() can decide whether to reenable the UI
  autoplay: function() {
    if(this.autoReveal() || this.autoplayMove()) {
      return true;
    } else if(Game.hasBeenWon()) {
      this.endGame();
      Cards.showGameWon();
      return true;
    }
    return false;
  },
  // XXX add some useful comments!
  autoReveal: function() {
    var stacks = this.thingsToReveal; // games should create this array if they want autoRevealing
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
  // must carry out a single autoplay step, returning true if successful, false otherwise
  // (strictly speaking it must return true if it has inititated an animation, because that will
  // call autoplay again on completion.)
  // its a good idea if this function takes card of all revelaing of cards before other stuff,
  // because then when undo() is called it will never leave an exposed face down card, becuase
  // undoing of revealCard calls undo() again
  autoplayMove: function() {
    return false;
  },

  // Some nice functions to find the card on a stack that should be moved by autoplayMove()
  // Get the lowest card in astack that can be moved for stacks built by:
  // alternating colours (and decreasing number)
  getLowestMoveableCard_AltColours: function(stack) {
    if(!stack.hasChildNodes()) return null;
    var card = stack.lastChild;
    var prv = card.previousSibling;
    while(prv && prv.faceUp() && prv.isConsecutiveTo(card) && prv.colour()!=card.colour()) {
      card = prv; prv = card.previousSibling;
    }
    return card;
  },
  // strict suit (and decreasing number)
  getLowestMoveableCard_Suit: function(stack) {
    if(!stack.hasChildNodes()) return null;
    var card = stack.lastChild;
    var prv = card.previousSibling;
    while(prv && prv.faceUp() && prv.isConsecutiveTo(card) && prv.isSameSuit(card)) {
      card = prv; prv = card.previousSibling;
    }
    return card;
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
