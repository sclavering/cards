// constants for colours and suits
const RED = 1, BLACK = 2, SPADE = 3, HEART = 4, DIAMOND = 5, CLUB = 6;
// these are used in setting the class attribute of cards.
const CLUBSTR = "club", SPADESTR = "spade", HEARTSTR = "heart", DIAMONDSTR = "diamond";


var gPrefs = null; // nsIPrefBranch for "games.cards."

var gGameStack = null;  // the <stack id="games"/>
var gGameStackTop = 0;  // ... and its coords
var gGameStackLeft = 0;

var gStrings = []; // the contents of the stringbundle

var Game = null;  // the current games
var Games = [];   // all the games, indexed by id

var gUIEnabled = true; // set by Cards.[en/dis]ableUI().  used to ignore mouse events

var gHintHighlighter = null;

// xxx these need to become cardset dependent
var gYOffsetFromFaceDownCard = 5; // num pixels between top edges of two face down cards
var gYOffsetFromFaceUpCard = 22;  // num pixels between top edges of two face up cards
var gXOffsetFromFaceDownCard = 5; // num pixels between left edges of two face down cards
var gXOffsetFromFaceUpCard = 12;  // num pixels between left edges of two face up cards
var gOffsetForCardSlide = 2; // num picels between top+left edges of two cards in a slide



function init() {
  // init the pref branch
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
  gPrefs = prefService.getBranch("games.cards.");

  // load stringbundle
  var svc = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService);
  var bundle = svc.createBundle("chrome://cards/locale/cards.properties");
  bundle = bundle.getSimpleEnumeration();
  while(bundle.hasMoreElements()) {
    var property = bundle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
    gStrings[property.key] = property.value;
  }

  // restore choice of cardset
  var cardset = "normal";
  try {
    cardset = gPrefs.getCharPref("cardset");
  } catch(e) {}
  useCardSet(cardset);
  document.getElementById("cardset-"+cardset).setAttribute("checked","true");

  gGameStack = document.getElementById("games");
  gGameStackTop = gGameStack.boxObject.y;
  gGameStackLeft = gGameStack.boxObject.x;

  // init other stuff
  initMouseHandlers();
  CardMover.init();
  
  gHintHighlighter = createHighlighter();
  gHintHighlighter.showHint = function(from, to) {
    to = to.lastChild || to; // |to| could be a stack
    Cards.disableUI();
    this.highlight(from);
    var thisthis = this; // because |this| within these functions would refer to the wrong thing
    setTimeout(function(){thisthis.highlight(to);}, 400);
    setTimeout(function(){thisthis.unhighlight();Cards.enableUI();}, 800);
  };

  // build the games menu
  var menu = document.getElementById("menupopup-gametypes");
  for(var game in Games) {
    var mi = document.createElement("menuitem");
    mi.setAttribute("label",gStrings[game+".name"]);
    mi.setAttribute("accesskey",gStrings[game+".menukey"]);
    mi.value = game;
    menu.appendChild(mi);
  }

  Cards.init();
}
window.addEventListener("load", init, false);






/** CardShuffler
  *
  * This object creates cards (<image/> elements) as well as handling shuffling. It is accessed via a
  * bunch of methods on the CardGame object, from which all games inherit.
  *
  * some random old documentation:
  *
  * shuffleSuits(numSpades, numHearts, numDiamonds, numClubs)
  *   numSuitName specifies how many complete sets of that suit to use (Ace->King of that suit)
  *      e.g. shuffleCardsOfSuits(1,1,0,0) uses half a pack of cards, only the spades and clubs
  *
  * shuffleCards(numOfPacks) {
  *   shuffles the specified number of full packs of cards. If called without a number 1 pack is used
  *
  * createCard(suit, number) - creates a facedown card of specified suit an number
  */
var CardShuffler = {
  shuffleDecks: function(num) {
    return this.shuffleSuits(num, num, num, num);
  },
  shuffleSuits: function(numSpades, numHearts, numDiamonds, numClubs) {
    return this.shuffle(this.getCardSuits(numSpades, numHearts, numDiamonds, numClubs));
  },

  // modifies argument and returns it as well (both are useful in some circumstances)
  shuffle: function(cards) {
    // shuffle several times, because Math.random() appears to be rather bad.
    for(var i = 0; i < 3; i++) {
      // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
      var n = cards.length;
      while(n != 0) {
        // get num from range [0..n)
        var num = Math.random();
        while(num==1.0) num = Math.random();
        num = Math.floor(num * n);
        // swap
        n--;
        var temp = cards[n];
        cards[n] = cards[num];
        cards[num] = temp;
      }
    }

    return cards;
  },

  getCardDecks: function(num) {
    return this.getCardSuits(num,num,num,num);
  },
  getCardSuits: function(numSpades, numHearts, numDiamonds, numClubs) {
    var i, allcards = [];
    for(i = 0; i < numSpades;   i++) this.addSuitSet(allcards, BLACK, SPADE, SPADESTR);
    for(i = 0; i < numHearts;   i++) this.addSuitSet(allcards, RED, HEART, HEARTSTR);
    for(i = 0; i < numDiamonds; i++) this.addSuitSet(allcards, RED, DIAMOND, DIAMONDSTR);
    for(i = 0; i < numClubs;    i++) this.addSuitSet(allcards, BLACK, CLUB, CLUBSTR);
    return allcards;
  },
  addSuitSet: function(cards, colour, suit, suitstr) {
    for(var i = 1; i <= 13; i++) cards.push(this.createCard(colour, suit, suitstr, i));
  },

  createCard: function(colour, suit, suitstr, number) {
    var c = document.createElement("image");
    // base query methods, number() returns 14 if Game.acesHigh==true
    c.number = function() { return (number==1 ? (Game.acesHigh ? 14 : 1) : number); };
    //c.trueNumber = function() { return number; }; // needed for isConsecMod13To, but for mo just using _num
    c.colour = function() { return colour; };
    c.altcolour = function() { return (colour==RED ? BLACK : RED); };
    c.suit   = function() { return suit; };
    c.faceUp   = function() { return !this._facedown;};
    c.faceDown = function() { return this._facedown; };
    c.isAce  = function() { return number==1;  };
    c.isQueen = function() { return number==12;};
    c.isKing = function() { return number==13; };
    c.isLastOnPile = function() { return !this.nextSibling; };
    // more queries (consecutive ones use number() to get 14 for Aces)
    c.isConsecutiveTo = function(card) { return (this.number()==card.number()+1); };
    c.notConsecutiveTo = function(card) { return (this.number()!=card.number()+1); };
    c.isSameSuit = function(card) { return this._suit==card._suit; };
    c.notSameSuit = function(card) { return this._suit!=card._suit; };
    c.isSameColour = function(card) { return this._colour==card._colour; };
    c.notSameColour = function(card) { return this._colour!=card._colour; };
    c.differsByOneTo = function(card) {
      var diff = this.number()-card.number();
      return (diff==1 || diff==-1);
    };
    c.differsByOneMod13To = function(card) {
      var diff = this.number()-card.number();
      return (diff==1 || diff==-1 || diff==12 || diff==-12);
    };
    // advanced queries, used in games where stacks can wrap round (King,Ace,2)
    c.isConsecutiveMod13To = function(card) {
      // returns true if card is one less than this, or card is King and this is Ace
      // uses _number rather than number() to avoid the Ace=14 thingy
      return ((this._number==card._number+1) || (this._number-1==card._number%13));
    };
    c.isAtLeastCountingFrom = function(number, from_num) {
      var thisnum = this._number;
      if(thisnum<from_num) thisnum+=13;
      if(number<from_num) number+=13;
      return (thisnum>=number);
    };
    // simple card turning
    c.setFaceUp = function() {
      this._facedown = false;
      this.className = "card "+suitstr+"-"+number;
    };
    c.setFaceDown = function() {
      this._facedown = true;
      this.className = "card facedown";
    };
    // hangover from when source was a property of the first card in the move/drag stacks
    // (rather than of the stacks themselves as is now the case)
    c.getSource = function() { return this.parentNode.source; };
    // other methods
    c.turnFaceUp = function() { CardTurner.turnFaceUp(this); };
    c.moveTo     = function(targetStack) { CardMover.move(this,targetStack); };
    c.transferTo = function(targetStack) { CardMover.transfer(this,targetStack); };
    // initialise properties
    c.isCard = true;
    c.isPile = false;
    c._number = number; // needed for isConsecMod13, but no longer used in number()
    c._suit = suit; // used in the more complex queries.  may delete in future.
    c._colour = colour;
    c.setFaceDown();
    return c;
  }
}




// give it a <stack> element or the id for one. adds some expando properties
// (tried doing this in XBL, but it was unbearably slow)
function createCardPile(id) {
  var elt = document.getElementById(id);
  if(!elt) return null;
  return _createCardPile(elt);
}
function _createCardPile(elt) {
  elt.isCard = false;
  elt.isPile = true;
  elt.isFoundation = false;
  elt.isCell = false;
  elt.isReserve = false;
  elt.isStock = false;
  elt.isWaste = false;
  elt.isNormalPile = false;

  elt.offset = 0;

  // for the animated move stack and the drag stack |source|
  // is set to the pile the cards originally came from.
  elt.source = elt;

  if(elt.className=="fan-down") {
    elt.getNextCardLeft = function() { return 0; };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild.top - 0 + (this.lastChild.faceUp() ? (this.offset || gYOffsetFromFaceUpCard) : gYOffsetFromFaceDownCard);
    };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(prev)
        card.top = prev.top - 0 + (prev.faceUp() ? (this.offset || gYOffsetFromFaceUpCard) : gYOffsetFromFaceDownCard);
      else
        card.top = 0;
      card.left = 0;
    };

    elt.fixLayout = function() {
      if(!this.hasChildNodes()) {
        this.offset = 0;
        return;
      }
      var card;
      var numFaceUp = 0;
      for(card = this.lastChild; card && card.faceUp(); card = card.previousSibling) numFaceUp++;
      if(numFaceUp <= 1) {
        this.offset = 0;
        return;
      }
      // card will still hold a pointer to the last face down card, or null.
      card = card ? card.nextSibling : this.firstChild
      const cardbox = card.boxObject;
      var space = window.innerHeight - cardbox.y - cardbox.height;
      var offset = Math.min(Math.floor(space / numFaceUp), gYOffsetFromFaceUpCard);
      var old = this.offset || gYOffsetFromFaceUpCard;
      this.offset = offset;
      if(offset == old) return;
      var top = (this.childNodes.length - numFaceUp) * gYOffsetFromFaceDownCard;
      while(card) {
        if(card.top != top) card.top = top;
        top += offset;
        card = card.nextSibling;
      }
    };

  } else if(elt.className=="slide") {
    elt.getNextCardLeft = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild.left - 0 + ((this.childNodes.length < 6) ? gOffsetForCardSlide : 0);
    };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      if(this.childNodes.length < 6)
        return this.lastChild.top - 0 + gOffsetForCardSlide;
      return this.lastChild.top;
    };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(!prev) {
        card.top = 0;
        card.left = 0;
        return;
      }
      card.top = prev.top;
      card.left = prev.left;
      if(this.childNodes.length < 6) {
        card.top = card.top - 0 + gOffsetForCardSlide;
        card.left = card.left - 0 + gOffsetForCardSlide;
      }
    };

    elt.fixLayout = function() {
      if(!this.hasChildNodes()) {
        this.offset = 0;
        return;
      }
      if(this.childNodes.length==1) {
        this.offset = 0;
        this.firstChild.top = 0;
        this.firstChild.left = 0;
        return;
      }
      var card;
      // figure out how many we can shift in space allotted
      const firstbox = this.firstChild.boxObject;
      var maxYShifts = Math.floor((window.innerHeight - firstbox.y - firstbox.height)/gOffsetForCardSlide);
      var maxXShifts = Math.floor((window.innerWidth - firstbox.x - firstbox.width)/gOffsetForCardSlide);
      if(maxYShifts > 5) maxYShifts = 5;
      if(maxXShifts > 5) maxXShifts = 5;
      var offX = 0;
      var offY = 0;
      var count = this.childNodes.length;
      card = this.firstChild;
      while(card) {
        card.top = offY;
        card.left = offX;
        if(count <= maxYShifts) offY += gOffsetForCardSlide;
        if(count <= maxXShifts) offX += gOffsetForCardSlide;
        card = card.nextSibling;
        count--;
      }
    };

  } else if(elt.className=="fan-right") {
    elt.getNextCardLeft = function() {
      var last = this.lastChild;
      if(!last) return 0;
      return last.left - 0 + (last.faceUp() ? gXOffsetFromFaceUpCard : gXOffsetFromFaceDownCard);
    };

    elt.getNextCardTop = function() { return 0; };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(prev)
        card.left = prev.left - 0 + (prev.faceUp() ? gXOffsetFromFaceUpCard : gXOffsetFromFaceDownCard);
      else
        card.left = 0;
      card.top = 0;
    };

    elt.fixLayout = function(stack) { this.offset = 0; };

  } else {
    elt.getNextCardLeft = function() { return 0; };
    elt.getNextCardTop = function() { return 0; };
    elt.addCard = function(card) {
      this.appendChild(card);
      card.top = 0;
      card.left = 0;
    };
    elt.fixLayout = function(stack) {
      // xxx: could reposition all cards to (0,0) here just to be sure?
      this.offset = 0;
    };
  }

  // transfers the card and all those that follow it
  // xxx: not in use yet
  elt.transferCards = function(first) {
    var next, card = first;
    while(card) {
      next = card.nextSibling;
      card.parentNode.removeChild(card);
      this.appendChild(card);
      card = next;
    }
    this.fixLayout();
  };

  return elt;
}



// for the CardMover, MouseHandlers["drag+drop"], etc
function createFloatingPile(className) {
  var pile = document.createElement("stack");
  pile.className = className;
  _createCardPile(pile);
  // putting the pile where it's not visible is faster than setting it's |hidden| property
  pile.hide = function() {
    this.width = 0;
    this.height = 0;
    this.top = -1000;
    this.left = -1000;
  };
  gGameStack.appendChild(pile);
  pile.hide();
  return pile;
}



function createHighlighter() {
  var box = document.createElement("box");
  box.className = "card-highlight";
  box.isHighlighter = true;
  gGameStack.appendChild(box);
  box.unhighlight = function() {
    this.top = -1000;
    this.left = -1000;
    this.height = 0;
    this.width = 0;
  };
  box.highlight = function(card) {
    // card may in fact be a stack
    const cardbox = card.boxObject;
    this.left = cardbox.x - gGameStackLeft;
    this.top = cardbox.y - gGameStackTop;
    this.width = card.boxObject.width;
    const lastbox = card.parentNode.lastChild.boxObject;
    if(card.isCard) this.height = lastbox.y + lastbox.height - cardbox.y;
    else this.height = cardbox.height;
    // xxx should use a highlight box the size of a card for an empty pile
  };
  box.unhighlight();
  return box;
}






/** CardTurner
  *
  * Handles the animated turning-face-up of cards.
  * Do not call directly, just use somecard.turnFaceUp() instead
  */
var CardTurner = {
  angle: null,    // the angle the card has reached in being turned
  oldWidth: null, // the original width of the card
  oldLeft:  null, // the initial integer value of the left attribute
  interval: null, // Interval triggering the animation of turniong the card over
  card: null, // ref to the card being turned

  turnFaceUp: function(card) {
    this.card = card;
    this.angle = 0;
    this.oldLeft = parseInt(card.left);
    this.oldWidth = card.boxObject.width;
    this.interval = setInterval(function(){CardTurner.turnFaceUpStep();}, 50);
    Cards.disableUI();
  },
  turnFaceUpStep: function() {
    this.angle += Math.PI/6;
    var newHalfWidth = Math.floor(Math.abs(Math.cos(this.angle) * this.oldWidth / 2));
    this.card.width = 2 * newHalfWidth;
    this.card.left = this.oldLeft + (this.oldWidth / 2) - newHalfWidth;
    // if the turn has passed the 90° mark, turn it over
    if(this.card.faceDown() && this.angle>=Math.PI/2) this.card.setFaceUp();
    // if it has turned all the way over
    if(this.angle>=Math.PI) this.turnFaceUpFinished();
  },
  turnFaceUpFinished: function() {
    clearInterval(this.interval);
    this.card.left = this.oldLeft;
    this.card.width = this.oldWidth;
    // don't enable the UI till were done autoplaying
    if(!Game.autoplay()) Cards.enableUI();
  }
}







/** CardMover
  *
  * handles moving cards between stacks
  *
  * transfer(card, target) - instantly moves card and all cards on top of it in its stack to target and positions them
  *   call via card.transferTo(target) instead
  *
  * move(card,target) - animated move of card and all cards on top of it to target
  *   call via card.moveTo(target) instead
  */
var CardMover = {
  cards: null, // a <stack/> to hold the cards being moved
  target: null, // where its going to
  interval: null, // ref to the window.setInterval triggering the animation
  targetTop: 0, // coords where the card should end up (incl offset into pile)
  targetLeft: 0,

  init: function() {
    // class doesn't need to be flexible yet
    this.cards = createFloatingPile("fan-down");
    this.cards.id = "card-move-pile";
  },
  move: function(firstCard, target) {
    Cards.disableUI();
    // move firstCard and all cards on top of it to the move stack
//    this.cards.className = firstCard.parentNode.className; // so cards layed out as in originating stack
    const firstbox = firstCard.boxObject;
    // _top and _left remain as numbers, whereas top and left get converted to strings
    this.cards.left = this.cards._left = firstbox.x - gGameStackLeft;
    this.cards.top = this.cards._top = firstbox.y - gGameStackTop
    firstCard.transferTo(this.cards);
    // set up conditions for animation stuff
    this.target = target;
    const targetbox = target.boxObject;
    this.targetLeft = targetbox.x - gGameStackLeft + target.getNextCardLeft();
    this.targetTop = targetbox.y - gGameStackTop + target.getNextCardTop();
    this.interval = setInterval(function(){CardMover.step();}, 30);
    //
    var xdistance = this.targetLeft - this.cards._left;
    var ydistance = this.targetTop - this.cards._top;
    var angle = Math.atan2(ydistance,xdistance);
    this.xchange = Math.cos(angle) * 50;
    this.ychange = Math.sin(angle) * 50;
  },

  step: function() {
    // return the shorter distance (if either both are negative or both are positive)
    function absMin(n, m) { return (n<0 ? m<n : n<m) ? n : m; }
    // calculate how far the card has to move
    var xdistance = this.targetLeft - this.cards._left;
    var ydistance = this.targetTop  - this.cards._top;
    // 
    var xchange = absMin(this.xchange,xdistance);
    var ychange = absMin(this.ychange,ydistance);
    this.cards.left = this.cards._left = this.cards._left + xchange;
    this.cards.top = this.cards._top = this.cards._top + ychange;
    // if its reached the destination
    if(xchange==xdistance && ychange==ydistance) this.moveComplete();
  },

  moveComplete: function() {
    clearInterval(this.interval);
    this.transfer(this.cards.firstChild, this.target);
    this.cards.hide();
    // don't enable the UI till we're finished autoplaying
    if(!Game.autoplay()) Cards.enableUI();
  },

  transfer: function(firstCard, target) {
    var card = firstCard;
    var source = card.parentNode.source;
    if(!target.offset) target.offset = source.offset;
    var nextCard;
    while(card) {
      nextCard = card.nextSibling;
      card.parentNode.removeChild(card);
      target.addCard(card);
      card = nextCard;
    }
    if(target.id) {
      target.fixLayout();
      if(source.id) source.fixLayout();
    }
  }
}






/** Cards
  *
  * this mainly handles the behaviour of the chrome, especially switching between different card games
  */
var Cards = {
  // refs to various <command> elements so they can be disabled
  cmdUndo: null,
  cmdHint: null,
  cmdNewGame: null,
  cmdRestartGame: null,
  cmdRedeal: null,
  cmdSetDifficulty: null,
  // refs to toolbar elements so they can be disabled
  difficultyLevelMenu: null,
  difficultyLevelPopup: null, // the <menupopup> for difficultyLevelMenu
  gameSelector: null,
  gameWonMsg: null,

  scoreDisplay: null,     // ref to label on toolbar where score displayed

  init: function() {
    // init chrome DOM refs
    this.cmdUndo = document.getElementById("cmd:undo");
    this.cmdNewGame = document.getElementById("cmd:newgame");
    this.cmdRestartGame = document.getElementById("cmd:restart");
    this.cmdHint = document.getElementById("cmd:hint");
    this.cmdRedeal = document.getElementById("cmd:redeal");
    this.cmdSetDifficulty = document.getElementById("cmd:setdifficulty");
    this.scoreDisplay = document.getElementById("score-display");
    this.difficultyLevelMenu = document.getElementById("game-difficulty-menu");
    this.difficultyLevelPopup = document.getElementById("game-difficulty-popup");
    this.gameSelector = document.getElementById("game-type-menu");
    this.gameWonMsg = document.getElementById("game-won-msg-box");

    // switch to last played game
    game = "Klondike";
    try {
      game = gPrefs.getCharPref("current-game");
    } catch(e) {}
    if(!(game in Games)) game = "Klondike"; // just in case pref gets corrupted
    Game = Games[game];
    Game.start();
    // set window title. (setting window.title does not work as the app. is starting)
    document.documentElement.setAttribute("title",gStrings[game+".name"]);
  },

  // switches which game is currently being played
  playGame: function(game) {
    // end old game
    if(Game) Game.end();
    // store current game pref and start the game
    gPrefs.setCharPref("current-game",game);
    Game = Games[game];
    Game.start();
    // set the window title
    window.title = gStrings[game+".name"];
  },

  // enable/disable the UI elements. this is done whenever any animation
  // is taking place, as problems ensue otherwise.
  enableUI: function() {
    gUIEnabled = true;
    this.cmdHint.removeAttribute("disabled");
    this.cmdNewGame.removeAttribute("disabled");
    this.cmdRestartGame.removeAttribute("disabled");
    this.enableDifficultyMenu();
    this.gameSelector.removeAttribute("disabled");
    this.enableUndo();
    this.enableRedeal();
  },
  disableUI: function() {
    gUIEnabled = false;
    this.cmdHint.setAttribute("disabled","true");
    this.cmdNewGame.setAttribute("disabled","true");
    this.cmdRestartGame.setAttribute("disabled","true");
    this.difficultyLevelMenu.setAttribute("disabled","true");
    this.gameSelector.setAttribute("disabled","true");
    this.cmdUndo.setAttribute("disabled","true");
    this.cmdRedeal.setAttribute("disabled","true");
  },
  // en/dis-able the Undo and Redeal commands as required
  // don't use this too much because it's slow (it always adjusts attributes)
  fixUI: function() {
    if(Game.canUndo()) this.cmdUndo.removeAttribute("disabled");
    else this.cmdUndo.setAttribute("disabled","true");
    if(Game.canRedeal()) this.cmdRedeal.removeAttribute("disabled");
    else this.cmdRedeal.setAttribute("disabled","true");
  },

  enableUndo: function() {
    if(Game.canUndo()) this.cmdUndo.removeAttribute("disabled");
  },
  doEnableUndo: function() {
    this.cmdUndo.removeAttribute("disabled");
  },
  disableUndo: function() {
    this.cmdUndo.setAttribute("disabled","true");
  },
  enableRedeal: function() {
    if(Game.canRedeal()) this.cmdRedeal.removeAttribute("disabled");
  },
  disableRedeal: function() {
    this.cmdRedeal.setAttribute("disabled","true");
  },

  enableDifficultyMenu: function() {
    // the popup for the menu is built when the game is started
    // and will be empty if difficulty levels are not supported
    if(this.difficultyLevelPopup.hasChildNodes())
      this.difficultyLevelMenu.removeAttribute("disabled");
  },
  disableDifficultyMenu: function() {
    this.difficultyLevelMenu.setAttribute("disabled","true");
  },

  // called by BaseCardGame.updateScoreDisplay()
  displayScore: function(score) { this.scoreDisplay.value = score; },

  // called from BaseCardGame.autoplay(), which is a function called after all significant
  // moves, so handles checking whether the game has been won and taking appropriate action.
  showGameWon: function() {
    this.gameWonMsg.hidden = false;
    // will get click events before the other event handlers
    window.onclick = function(e) {
      window.onclick = null;
      Cards.gameWonMsg.hidden = true;
      Game.newGame();
    };
  }
}





function useCardSet(set) {
  // XXX: Ideally the disabling of stylesheets would be based on their titles, but
  // when testing on Fb 20031209 win32 build the title of every sheet would be OK
  // the first time Cards was loaded, but then be an empty string every subsequent
  // load until Firebird was restarted.  Hence we use this hack based on the href
  var anySetRE = /\/cardsets\/[^.]*\.css$/;
  var thisSetRE = new RegExp(set+".css$");
  // switch stylesheets
  var sheets = document.styleSheets;
  for(var i = 0; i < sheets.length; i++) {
//    if(sheets[i].title) sheets[i].disabled = (sheets[i].title!=set);
    if(anySetRE.test(sheets[i].href)) sheets[i].disabled = !thisSetRE.test(sheets[i].href);
  }
  // save pref
  gPrefs.setCharPref("cardset",set);
}
