/** CardGame.js
  *
  * Contains the CardGame function, used as a constructor for the objects for each game,
  * so they can inherit lots (and lots and lots) of stuff
  *
  * individual game .js files should go:
  *   var Klondike = new CardGame();
  *   // override functions as necessary
  *   Klondike.funcName = blah blah;
  *   ...
  *   Games["Klondike"] = Klondike;
  */

// flags to indicate some of the rules of a card game.  usage:  FooSolitaire = new CardGame(FLAG_1 | FLAG_2 | ...);
const ACES_HIGH = 1, CAN_TURN_STOCK_OVER = 2, HAS_DIFFICULTY_LEVELS = 4, NO_DRAG_DROP = 8;

function CardGame(params, usesMouseHandler2) {
  // for Klondike, Canfield and others, where when reaching the bottom of
  // the stock, the entire waste pile is (can be) moved back to the stock
  // checked in the common event handler, if true must implement dealFromStock()
  this.stockCanTurnOver = (params&CAN_TURN_STOCK_OVER)==CAN_TURN_STOCK_OVER;
  // used when determining the result for card.number() calls (makes Aces 14's)
  this.acesHigh = (params&ACES_HIGH)==ACES_HIGH;
  // used in CardGame.start(); to show/hide the DifficultyLevel menu
  this.hasDifficultyLevels = (params&HAS_DIFFICULTY_LEVELS)==HAS_DIFFICULTY_LEVELS;
  // enables FreeCell style "click on card, then on destination" moving, rather than d+d
  this.usesMouseHandler2 = (params&NO_DRAG_DROP)==NO_DRAG_DROP;
};

CardGame.prototype = {
  foundations: null, // array of foundation stacks
  stock: null,       // the stock <stack>, if the game has one
  stacks: null,

  dragDropTargets: null, // list of elements which the DragDrop system should test if cards are being dropped on
  allstacks: null, // list of all <stack>s for cards, so that they can be cleared when a game is started


  // === Start/Finish Playing =============================
  initialised: false, // stores whether init() has already been run
  // should initialise "dragDropTargets" and "allstacks", as well as anything else used by
  // the game.  will only be called the first time a particular game is played
  // If the game has cards which can be revealed it should set up a thingsToReveal
  // array of <stack>s and the autoplay will handle them automatically.
  // Ideally init() should tag stacks with isReserve=true and isFoundation=true as necessary,
  // otherwise string comparisons on the stack id are used for canMoveTo() and others.
  init: function() {
  },
  // convenience function to init stacks[] foundations[] and reserves[] arrays (possibly cells[] in future)
  // (also creates .allstacks[] which is used when clearing the game layout for a new game)
  // Games with multiple rows of tableau piles should pass 0 for numStacks, and use tableauRows/Cols instead
  // to use this game must init game.shortname first
  initStacks: function(numStacks, numFoundations, numReserves, hasStock, hasWaste, tableauRows, tableauCols, numCells) {
    this.allstacks = new Array();
    var name = this.shortname; // e.g. "klondike", "simon" etc
    if(numStacks) {
      this.stacks = new Array(numStacks);
      for(var i = 0; i < numStacks; i++) {
        this.stacks[i] = document.getElementById(name+"-pile-"+i);
        this.stacks[i].isPile = true;
        this.allstacks.push(this.stacks[i]);
      }
    }
    if(numFoundations==1) {
      this.foundation = document.getElementById(name+"-foundation");
      this.foundation.isFoundation;
      this.allstacks.push(this.foundation);
    } else if(numFoundations) {
      this.foundations = new Array(numFoundations);
      for(var i = 0; i < numFoundations; i++) {
        this.foundations[i] = document.getElementById(name+"-foundation-"+i);
        this.foundations[i].isFoundation = true;
        this.allstacks.push(this.foundations[i]);
      }
    }
    if(numReserves==1) {
      this.reserve = document.getElementById(name+"-reserve");
      this.reserve.isReserve = true;
      this.allstacks.push(this.reserve);
    } else if(numReserves) {
      this.reserves = new Array(numReserves);
      for(var i = 0; i < numReserves; i++) {
        this.reserves[i] = document.getElementById(name+"-reserve-"+i);
        this.reserves[i].isReserve = true;
        this.allstacks.push(this.reserves[i]);
      }
    }
    // XXX should these have .isStock/.isWaste set, or is foo==Game.stock sufficient?
    if(hasStock) {
      this.stock = document.getElementById(name+"-stock");
      this.stock.isStock = true;
      this.allstacks.push(this.stock);
    }
    if(hasWaste) {
      this.waste = document.getElementById(name+"-waste");
      this.waste.isWaste = true;
      this.allstacks.push(this.waste);
    }
    // create a 2D stacks array
    if(tableauRows) {
      this.stacks = new Array(tableauRows);
      for(var i = 0; i < tableauRows; i++) {
        this.stacks[i] = new Array(tableauCols);
        for(var j = 0; j < tableauCols; j++) {
          var s = document.getElementById(name+"-tableau-"+i+"-"+j);
          s.row = i;
          s.col = j;
          s.isPile = true;
          this.stacks[i][j] = s;
          this.allstacks.push(s);
        }
      }
    }
    // cells
    if(numCells) {
      this.cells = new Array(numCells);
      for(var i = 0; i < numCells; i++) {
        this.cells[i] = document.getElementById(name+"-cell-"+i);
        this.cells[i].isCell = true;
        this.allstacks.push(this.cells[i]);
      }
    }
  },


  start: function() {
    // conditionally show Difficulty Level menu
    if(this.hasDifficultyLevels) Cards.enableDifficultyMenu();
    else Cards.disableDifficultyMenu();
    MouseHandler = (this.usesMouseHandler2) ? MouseHandler2 : MouseHandler1;
    MouseHandler.start();
    // init stack arrays and stuff
    if(!this.initialised) {
      this.init();
      if(this.hasDifficultyLevels) {
        var pref = Cards.currentGame+".game-difficulty";
        var value = Cards.preferences.getPrefType(pref)!=0 ? Cards.preferences.getCharPref(pref) : "medium";
        this.difficultyLevel = value;
      }
      this.initialised = true;
    }
    this.newGame();
  },

  end: function() {
    this.endGame();
    this.clearGame();
  },

  // games can retrieve a string for the current difficulty level via Game.difficultyLevel;
  setDifficultyLevel: function(level) {
    Cards.preferences.setCharPref(Cards.currentGame+".game-difficulty", level);
    this.difficultyLevel = level;
    this.newGame();
  },



  // === Start Game =======================================
  newGame: function() {
    this.score = 0;
    this.undoHistory = new Array();
    Cards.disableUndo();  // something like Chrome.fixUI() which queried stuff and was generally nice would be better :)
    this.updateScoreDisplay();
    this.clearGame();
    this.deal();
    Cards.enableUI();
  },
  // should deal out the cards for a new game. newGame() will ensure all stacks are empty
  deal: function() {
  },

  // useful function for deal() to use.  can (and should) be used for all card dealing
  dealToStack: function(cards, stack, numDown, numUp) {
    for(var i = 0; i < numDown+numUp; i++) {
      stack.appendChild(cards.pop());
      stack.lastChild.position();
      if(i>=numDown) stack.lastChild.setFaceUp();
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
    var undo = this.undoHistory.pop(); //the undo item
    // disable undo if no possible undo's left
    if(this.undoHistory.length==0) Cards.disableUndo();
    this.score -= undo.score;
    this.updateScoreDisplay();
    // undo the move of it is a basic action type, otherwise hand it to Game.undo to deal with
    switch(undo.action) {
      case "card-revealed":
        // undo again after turning a card down because it looks odd having cards face down on top of pile
        undo.card.setFaceDown(); this.undo(); break;
      // string usd by all dealFromStock() functions, all relevant games must implement undealFromStock
      case "dealt-from-stock": this.undealFromStock(true); break;
      // the stock can only be turned over in games like Canfield and Klondike where it deals to a waste pile
      // hence the hard coding of this.waste should be okay
      case "stock-turned-over":
        while(this.stock.hasChildNodes()) this.dealCardTo(this.waste); break;
      // Games should implement undoMove to deal with undoing any nonstandard actions.
      default: this.undoMove(undo);
    }
  },
  // Is passed an object with source and card properties.  must move card back, turn over or whatever
  // Should not handle "card-turned-up" or "dealt-from-stock", which are dealt with in undo() above
  // This default version may be sufficient for some games (e.g. AcesUp) which don't have anything other
  // than moves of cards from one stack to another.
  undoMove: function(undo) {
    undo.card.transferTo(undo.source);
  },

  restart: function() {
    while(this.undoHistory.length>0) this.undo();
  },

  updateScoreDisplay: function() {
    Cards.displayScore(this.score);
  },



  // === Move tracking ====================================
  // called by moveTo(), revealCard() and dealFromStock()
  // updates th undo list and score
  trackMove: function(action, card, source) {
    var scorechange = this.getScoreForAction(action);
    var move = {action: action, card: card, source: source, score: scorechange};
    this.undoHistory.push(move);
    this.score += scorechange;
    this.updateScoreDisplay();
    // if this is the first undo added, enable the command
    if(this.undoHistory.length==1) Cards.enableUndo();
  },



  // === Winning ==========================================
  // should check if the game is in a won state and return a Boolean
  hasBeenWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // takes strings describing action and returns an integer for the score
  getScoreForAction: function(action) {
    return 0;
  },



  // === Moving between stacks ============================

  // returns true/false for whether the card can be moved from its current position
  // this version will be sufficient for some games, others will need to override (e.g. Spider)
  canMoveCard: function(card) {
    return card.faceUp();
  },
  // standard forms of canMoveCard. games can just do FooSol.canMoveCard = FooSol.canMoveCard_foo_bar
  // XXX would it be better to make these params of CardGame(...), or properties of FooSol checked in
  // a default canMoveCard (which non standard games would just override)?  Same question about
  // canMoveToPile.  perhaps   new CardGame(whenCanCardsMove, howPilesBuild, other options...)
  // or just a bunch of PILEBUILD_SomeMethod const's to OR with the rest???
  canMoveCard_DescendingAltColours: function(card) {
    if(card.faceDown()) return false;
    // ensure we have a run in alternating colours
    for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
      if(card.isSameColour(next) || card.notConsecutiveTo(next)) return false;
    }
    return true;
  },
  canMoveCard_DescendingInSuit: function(card) {
    if(card.faceDown()) return false;
    // ensure we have a running flush from top card on stack to |card|
    for(var next = card.nextSibling; next; card = next, next = next.nextSibling) {
      if(card.notSameSuit(next) || card.notConsecutiveTo(next)) return false;
    }
    return true;
  },
  canMoveTo_LastOnPile: function(card) {
    return (card.faceUp() && card.isLastOnPile());
  },

  // returns true/false for whether it is a legal move to take card to destination
  // this function follows the pattern needed by all games seen so far, leaving
  // them just to implement canMoveToPile and canMoveToFoundation
  canMoveTo: function(card,target) {
    // can never move TO a reserve pile
    if(target.isReserve || target.id.indexOf("reserve")!=-1) return false;
    // games that don't have foundations should not have problems with this
    // Mod3, where most of the stacks are sort of foundations just overrides this whole function
    return ((target.isFoundation || target.id.indexOf("foundation")!=-1)
      ? this.canMoveToFoundation(card,target)
      : this.canMoveToPile(card,target));
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
  // XXX add some standard forms for canMoveToPile ???
  //canMoveToPile

  // actually perform the move, return true/false  for success.  Should generally call
  // this.trackMove(action: "some-string", card: card, source: someStackNode);
  // source can generally be retrieved by card.getSource(), if the function is being called
  // by CardMover, MouseHandler or CardTurner
  // This generic versionn copes with all the games except Spider at the moment, and Spider
  // was written in a very unusual way :)
  moveTo: function(card, target) {
    var source = card.getSource();
    var targetIsFoundation = target.isFoundation || target.id.indexOf("foundation")!=-1;
    var sourceIsFoundation = source.isFoundation || source.id.indexOf("foundation")!=-1;
    var action =
      (targetIsFoundation && !sourceIsFoundation) ? "move-to-foundation" :
      (!sourceIsFoundation && targetIsFoundation) ? "move-from-foundation" :
      (source==this.waste) ? "move-from-waste" :
      "move-between-piles";
    card.moveTo(target);
    this.trackMove(action, card, source);
    return true;
  },

  // convenience function, used in MouseHandler
  attemptMove: function(source, target) {
    if(Game.canMoveTo(source,target)) {
      Game.moveTo(source,target);
      return true;
    }
    return false;
  },

  // function attempts to move card to each foundation in turn, returning a Boolean for success
  // default version is provided for Klondike-like games, Spider-like games may need to override
  // (i.e. games where whole Ace->King runs are removed at onve rather than individual cards
  // Bear in mind that this calls canMoveTo() so just changing that may well be sufficient
  // Note that checking whether a game even has foundations is done in MouseHandler.mouseClicked()
  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    for(var i = 0; i < this.foundations.length; i++) {
      if(this.canMoveTo(card,this.foundations[i])) {
        this.moveTo(card,this.foundations[i]);
        return true;
      }
    }
    return false;
  },



  // === Redealing ========================================
  // some games allow a certain number of "redeals", where all the remaining cards on the tableau
  // are collected together and shuffled, then redealt in the pattern that was present before

  // At the moment this only works for tableau piles, not stocks, reserves, or anything else
  redeal: function() {
    var stacks = this.stacks;
    var pattern = [];
    var cards = [];
    // remove cards and store pattern
    for(var i = 0; i < stacks.length; i++) {
      var down = 0, up = 0;
      while(stacks[i].hasChildNodes()) {
        var card = stacks[i].removeChild(stacks[i].lastChild);
        if(card.faceDown()) down++;
        else up++;
        card.setFaceDown();
        cards.push(card);
      }
      pattern.push([down,up]);
    }
    // shuffle
    this.shuffle(cards);
    // deal out again
    for(var i = 0; i < pattern.length; i++) {
      this.dealToStack(cards,this.stacks[i],pattern[i][0],pattern[i][1]);
    }
  },



  // === Revealing Cards ==================================
  // some games may need to overridde these?  (seems unlikely on consideration)
  // note, may be able to remove canReveal, faceDown() check in reveal() is already done in Cards.clickHandler()

  canRevealCard: function(card) {
    return card.isLastOnPile();
  },
  revealCard: function(card) {
    if(card.faceDown() && card.isLastOnPile()) {
      card.turnFaceUp();
      this.trackMove("card-revealed", card, null);
    }
  },



  // === Stock stuff ======================================
  // If a game has a stock it should make Game.stock a reference to it in its init() function
  //
  // For games which create a Game.waste ref, the default function below will deal cards there,
  // otherwise it will deal one card to each of the game.stacks array, unless a stockDealTargets
  // array is present, in which case one card will be dealt to each of those instead (this is for Mod3)

  // Spider does not use this, because its dealing is rather weird at the moment
  dealFromStock: function() {
    if(this.stock.hasChildNodes()) {
      // if it has a wate pile we'll deal to there,
      if(Game.waste) {
        this.dealCardTo(this.waste);
      // otherwise we wil deal to everything in the stockDealTargets or Game.stacks array
      } else {
        var stacks = this.stockDealTargets || this.stacks;
        for(var i = 0; i < stacks.length; i++)
          this.dealCardTo(stacks[i]);
      }
      this.trackMove("dealt-from-stock", null, null);
      Game.autoplay();
    } else {
      // in Klondike and Canfield you can go through the stock multiple times
      if(this.stockCanTurnOver) {
        while(this.waste.hasChildNodes()) this.undealFromStock();
        this.trackMove("stock-turned-over", null, null);
      }
    }
  },
  dealCardTo: function(destination) {
    var card = this.stock.lastChild;
    card.setFaceUp();
    card.transferTo(destination);
  },
  // used by undo() (dealt-from-stock is one of the moves handled by undo() rather than by undoMove() )
  undealFromStock: function() {
    // again, assume that games with a waste pile deal there, others deal to every tableau pile
    if(this.waste) {
      this.undealCardFrom(this.waste);
    } else {
      var stacks = this.stockDealTargets || this.stacks;
      for(var i = stacks.length-1; i >= 0; i--) {
        this.undealCardFrom(stacks[i]);
      }
    }
  },
  undealCardFrom: function(source) {
    var card = source.lastChild;
    card.setFaceDown();
    card.transferTo(this.stock);
  },



  // === Hints ============================================
  hint: function() {
    var hint = Game.getHint();
    if(hint) HintHighlighter.showHint(hint.source, hint.destinations);
  },

  // return a hint object, of the form {source: ?, destinations: [?]} , or null
  getHint: function() {
    return null;
  },



  // === Smart move =======================================
  // smart move is called when the player middle clicks on a card.  it should find the best
  // possible move for that card (which will be game dependent) and perform it.
  smartMove: function(card) {
  },

  // smartMove is more intuitive if it looks alternately left and right of the source
  // of the card for moves. This function starts from stack.parentNode and does that,
  // applying test(card,left|right) to each one and returning the stack if test() is true
  searchAround: function(card, test) {
    // try alternately right and left of the stack the card is from to find a move
    var left = card.parentNode;
    var right = card.parentNode;
    while(left || right) {
      if(left) {
        if(test(card,left)) return left;
        left = this.nextStackLeft(left);
      }
      if(right) {
        if(test(card,right)) return right;
        right = this.nextStackRight(right);
      }
    }
    return null;
  },
  // these rely on a row of stacks being sibing nodes, so XUL should be set up appropriately
  nextStackLeft: function(stack) {
    for(var n = stack.previousSibling; n; n = n.previousSibling)
      if(n.nodeName=="stack") return n;
    return null;
  },
  nextStackRight: function(stack) {
    for(var n = stack.nextSibling; n; n = n.nextSibling)
      if(n.nodeName=="stack") return n;
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
    if(stacks) {
      for(var i = 0; i < stacks.length; i++) {
        var last = stacks[i].lastChild;
        if(last && last.faceDown()) { this.revealCard(last); return true; }
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
  }
}
