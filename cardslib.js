document.window = window;

// constants for colours and suits
const RED = 1, BLACK = 2, SPADE = 3, HEART = 4, DIAMOND = 5, CLUB = 6;
// these are used in setting the class attribute of cards.
const CLUBSTR = "C", SPADESTR = "S", HEARTSTR = "H", DIAMONDSTR = "D";


var gPrefs = null; // nsIPrefBranch for "games.cards."


var gStrings = []; // the contents of the stringbundle


var Game = null;  // the current games
var GameController = null;

var AllGames = []; // aaa
var Games = [];   // all the games, indexed by id


var gUIEnabled = true; // set by [en/dis]ableUI().  used to ignore mouse events

var gHintHighlighter = null;

// xxx these need to become cardset dependent
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide

// <command/> elements
var gCmdSetDifficulty = "cmd:setdifficulty";
var gCmdNewGame = "cmd:newgame";
var gCmdRestartGame = "cmd:restart";
var gCmdUndo = "cmd:undo";
var gCmdRedo = "cmd:redo";
var gCmdHint = "cmd:hint";
var gCmdRedeal = "cmd:redeal";

// other bits of UI
var gOptionsMenu = "options-menu";
var gDifficultyLevelMenu = "game-difficulty-menu";
var gDifficultyLevelPopup = "game-difficulty-popup";
var gGameSelector = "game-type-menu";
var gGameWonMsg = "game-won-msg";
var gInsufficientSpacesMsg = "insufficient-spaces-msg";
var gScoreDisplay = "score-display";
var gGameStack = "games"; // the main <stack>
var gGameStackTop = 0;    // ... and its coords
var gGameStackLeft = 0;

var gFloatingPile = null;
var gFloatingPileNeedsHiding = false; // see animatedActionFinished()



function init() {
  var things = ["gCmdSetDifficulty","gCmdNewGame","gCmdRestartGame","gCmdUndo","gCmdRedo","gCmdHint",
      "gCmdRedeal","gOptionsMenu","gInsufficientSpacesMsg","gGameWonMsg","gDifficultyLevelMenu",
      "gDifficultyLevelPopup","gGameSelector","gScoreDisplay","gGameStack"];
  for(var t in things) window[things[t]] = document.getElementById(window[things[t]]);

  gDifficultyLevelMenu.shouldBeEnabled = false;

  gGameStackTop = gGameStack.boxObject.y;
  gGameStackLeft = gGameStack.boxObject.x;

  gFloatingPile = createFloatingPile();

  // init the pref branch
  gPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService)
  gPrefs = gPrefs.getBranch("games.cards.");

  // load stringbundle
  var svc = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
  var bundle = svc.createBundle("chrome://cards/locale/cards.properties").getSimpleEnumeration();
  while(bundle.hasMoreElements()) {
    var property = bundle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
    gStrings[property.key] = property.value;
  }

  // restore choice of cardset
  try { var cardset = gPrefs.getCharPref("cardset"); }
  catch(e) { cardset = "normal"; }
  useCardSet(cardset);
  document.getElementById("cardset-"+cardset).setAttribute("checked","true");

  // restore animation pref
  var useAnimation = true;
  try { useAnimation = gPrefs.getBoolPref("use-animation"); } catch(e) {}
  enableAnimation(useAnimation);
  var animationMenuItem = document.getElementById("animation");
  if(useAnimation) animationMenuItem.setAttribute("checked","true");
  else animationMenuItem.removeAttribute("checked");

  // init other stuff
  initMouseHandlers();

  gHintHighlighter = createHighlighter();
  gHintHighlighter.showHint = function(from, to) {
    to = to.lastChild || to; // |to| could be a pile
    disableUI();
    this.highlight(from);
    var thisthis = this; // because |this| within these functions would refer to the wrong thing
    setTimeout(function(){thisthis.highlight(to);}, 350);
    setTimeout(function(){thisthis.unhighlight();enableUI();}, 800);
  };

  // build the games menu
  var menu = document.getElementById("menupopup-gametypes");
  var names = [];
  var lookup = [];
  var name, game;
  for(game in Games) {
    name = gStrings[game+".name"];
    names.push(name);
    lookup[name] = game;
  }
  names.sort();
  for(var i in names) {
    name = names[i], game = lookup[name];
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", names[i]);
    mi.setAttribute("accesskey", gStrings[game+".menukey"]);
    mi.value = game;
    menu.appendChild(mi);
  }

  // make controllers for each game type
  for(game in AllGames) AllGames[game] = new GameController(game, AllGames[game]);

  for(game in Games) {
    var gamee = Games[game];
    if(typeof gamee == "boolean") Games[game] = AllGames[game];
    else Games[game] = new DifficultyLevelsController(game, gamee.ids, gamee.names);
  }

  // switch to last played game
  try { game = gPrefs.getCharPref("current-game"); }
  catch(e) { game = "klondike"; }
  if(!(game in Games)) game = "klondike"; // just in case pref gets corrupted

  // set window title. (setting window.title does not work while the app. is starting)
  document.documentElement.setAttribute("title", gStrings[game+".name"]);

  GameController = Games[game];
  GameController.switchTo();
}

window.addEventListener("load", init, false);







// takes an array of cards, returns a *new* shuffled array
function shuffle(cards) {
  cards = cards.slice(0); // get a copy of the array

  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i != 5; i++) {
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
}

function getDecks(num) {
  return getCardSuits(num, num, num, num);
}

function getSuits(arr) {
  return getCardSuits(arr[0], arr[1], arr[2], arr[3]);
}

function getCardSuits(numSpades, numHearts, numDiamonds, numClubs) {
  var i, cards = [];
  for(i = 0; i != numSpades;   i++) addSuitSet(cards, BLACK, SPADE, SPADESTR);
  for(i = 0; i != numHearts;   i++) addSuitSet(cards, RED, HEART, HEARTSTR);
  for(i = 0; i != numDiamonds; i++) addSuitSet(cards, RED, DIAMOND, DIAMONDSTR);
  for(i = 0; i != numClubs;    i++) addSuitSet(cards, BLACK, CLUB, CLUBSTR);
  return cards;
}

function addSuitSet(cards, colour, suit, suitstr) {
  for(var i = 1; i != 14; i++) cards.push(createCard(colour, suit, suitstr, i));
}

function createCard(colour, suit, suitstr, number) {
  var c = document.createElement("image");
  for(var m in cardMethods) c[m] = cardMethods[m]; // add standard methods
  c.number = (number==1 && Game.acesHigh) ? 14 : number; // Ace==14 when aces are high
  c.realNumber = number; // sometimes you don't want Ace==14
  c.colour = colour;
  c.altcolour = colour==RED ? BLACK : RED;
  c.suit = suit;
  c.suitstr = suitstr;
  c.isAce = number==1;
  c.isQueen = number==12;
  c.isKing = number==13;
  c.isCard = true;
  c.isPile = false;
  c.setFaceDown(); // sets faceUp, faceDown and className
  return c;
}

var cardMethods = {
  toString: function() { return this.number+this.suitstr; },

  isConsecutiveTo: function(card) { return (this.number==card.number+1); },

  isSameSuit: function(card) { return this.suit==card.suit; },

  isSameColour: function(card) { return this.colour==card.colour; },

  differsByOneFrom: function(card) {
    var diff = this.number-card.number;
    return (diff==1 || diff==-1);
  },

  differsByOneMod13From: function(card) {
    var diff = this.number-card.number;
    return (diff==1 || diff==-1 || diff==12 || diff==-12);
  },

  isConsecutiveMod13To: function(card) {
    return this.isAce ? card.isKing : this.realNumber==card.realNumber+1;
  },

  isAtLeastCountingFrom: function(number, from_num) {
    var thisnum = this.realNumber;
    if(thisnum<from_num) thisnum+=13;
    if(number<from_num) number+=13;
    return (thisnum>=number);
  },

  moveTo: function(targetPile) { moveCards(this, targetPile); },

  // card turning
  setFaceUp: function() {
    this.faceUp = true;
    this.faceDown = false;
    this.className = "card "+this.suitstr+this.realNumber;
  },

  setFaceDown: function() {
    this.faceUp = false;
    this.faceDown = true;
    this.className = "card facedown";
  },

  turnFaceUp: function() {
    var card = this;
    disableUI();
    var oldLeft = card._left;
    var oldWidth = card.boxObject.width;
    var oldHalfWidth = oldWidth / 2;
    var stepNum = 7;
    var interval = setInterval(function() {
      stepNum--;
      if(stepNum==-1) { // testing for -1 ensures a 40ms delay after the turn completes
        clearInterval(interval);
        card.left = oldLeft;
        card.width = oldWidth;
        animatedActionFinished();
        return;
      }
      var newHalfWidth = cardTurnFaceUpCosines[stepNum] * oldHalfWidth;
      card.width = 2 * newHalfWidth;
      card.left = oldLeft + oldHalfWidth - newHalfWidth;
      if(stepNum==3) card.setFaceUp();  // gone past pi/2
    }, 45);
  }
};

// precompute cosines for cardMethods.turnFaceUp
var cardTurnFaceUpCosines = new Array(7);
for(var i = 0; i != 7; i++) cardTurnFaceUpCosines[i] = Math.abs(Math.cos((7-i) * Math.PI / 7));





function initPileFromId(id) {
  var elt = document.getElementById(id);
  if(!elt) return null;
  return initPile(elt);
}

function initPile(elt) {
  elt.isCard = false;
  elt.isPile = true;
  elt.isFoundation = false;
  elt.isCell = false;
  elt.isReserve = false;
  elt.isStock = false;
  elt.isWaste = false;
  elt.isNormalPile = false;

  elt.offset = 0;

  // for the animated move pile and the drag pile |source|
  // is set to the pile the cards originally came from.
  elt.source = elt;

  if(elt.className=="fan-down") {
    elt.getNextCardLeft = function() { return 0; };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.offset || gVFanOffset);
    };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.top = card._top = prev ? prev._top + (this.offset || gVFanOffset) : 0;
      card.left = card._left = 0;
    };

    elt.fixLayout = function() {
      if(!this.hasChildNodes()) {
        this.offset = 0;
        return;
      }

      const firstbox = this.firstChild.boxObject;
      var space = window.innerHeight - firstbox.y - firstbox.height;
      var offset = Math.min(Math.floor(space / this.childNodes.length), gVFanOffset);
      var old = this.offset || gVFanOffset;
      this.offset = offset;
      if(offset == old) return;
      var top = 0;
      var card = this.firstChild;
      while(card) {
        card.top = card._top = top;
        top += offset;
        card = card.nextSibling;
      }
    };

  } else if(elt.className=="slide") {
    elt.getNextCardLeft = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._left + (this.childNodes.length<6 ? gSlideOffset : 0);
    };

    elt.getNextCardTop = function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.childNodes.length<6 ? gSlideOffset : 0);
    };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(!prev) {
        card.top = card.left = card._top = card._left = 0;
        return;
      }
      var offset = this.childNodes.length<6 ? gSlideOffset : 0;
      card.top = card._top = prev._top + offset
      card.left = card._left = prev._left + offset;
    };

    elt.fixLayout = function() {};

  } else if(elt.className=="fan-right") {
    elt.getNextCardLeft = function() {
      return this.hasChildNodes() ? this.lastChild._left + gHFanOffset : 0;
    };

    elt.getNextCardTop = function() { return 0; };

    elt.addCard = function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.left = card._left = prev ? prev._left + gHFanOffset : 0;
      card.top = card._top = 0;
    };

    elt.fixLayout = function() { this.offset = 0; };

  } else {
    elt.getNextCardLeft = function() { return 0; };
    elt.getNextCardTop = function() { return 0; };
    elt.addCard = function(card) {
      this.appendChild(card);
      card.top = card.left = card._top = card._left = 0;
    };
    elt.fixLayout = function() { this.offset = 0; };
  }

  // transfers the card and all those that follow it
  elt.addCards = function(first) {
    var next, card = first, source = first.parentNode.source;
    if(!this.offset) this.offset = source.offset;
    while(card) {
      next = card.nextSibling;
      this.addCard(card);
      card = next;
    }
    if(this.id) {
      this.fixLayout();
      if(source.id) source.fixLayout();
    }
  };

  return elt;
}



function createFloatingPile() {
  var pile = document.createElement("stack");
  initPile(pile);
  // putting the pile where it's not visible is faster than setting it's |hidden| property
  pile.hide = function() {
    this.width = this.height = 0;
    this.top = this.left = this._top = this._left = -1000;
  };
  pile.addCards = function(card) {
    var left = card._left, top = card._top;
    for(var next = card.nextSibling; card; card = next) {
      next = card.nextSibling;
      this.appendChild(card);
      card.top = card._top -= top;
      card.left = card._left -= left;
    }
    // setting the width and height avoids not-repainting artifacts after cards are removed from the floating pile
    var last = this.lastChild;
    this.width = last._left + last.boxObject.width;
    this.height = last._top + last.boxObject.height;
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
    this.top = this.left = this._top = this._left = -1000;
    this.width = this.height = 0;
  };
  box.highlight = function(card) {
    // card might be a pile really
    const cardbox = card.boxObject;
    this.top = this._top = cardbox.y - gGameStackTop;
    this.left = this._left = cardbox.x - gGameStackLeft;
    this.width = cardbox.width;
    const lastbox = card.parentNode.lastChild.boxObject;
    if(card.isCard) this.height = lastbox.y + lastbox.height - cardbox.y;
    else this.height = cardbox.height;
    // xxx should use a highlight box the size of a card for an empty pile
  };
  box.unhighlight();
  return box;
}










// we don't want to enable the UI between an animated move and any autoplay it triggers
function animatedActionFinished(pileWhichHasHadCardsRemoved) {
  if(Game.autoplay(pileWhichHasHadCardsRemoved)) return;
  enableUI();
  if(!gFloatingPileNeedsHiding) return;
  gFloatingPileNeedsHiding = false;
  gFloatingPile.hide();
}

function playGame(game) {
  if(GameController) GameController.switchFrom();

  gPrefs.setCharPref("current-game",game);
  window.title = gStrings[game+".name"];

  GameController = Games[game];
  GameController.switchTo();
}


function initDifficultyLevelMenu(items, selectedItem) {
  gDifficultyLevelMenu.shouldBeEnabled = !!items;
  if(!items) {
    gDifficultyLevelMenu.setAttribute("disabled", "true");
    return;
  }

  gDifficultyLevelMenu.removeAttribute("disabled");

  var menu = gDifficultyLevelPopup;
  while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);

  for(var i = 0; i != items.length; i++) {
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", gStrings["difficulty."+items[i]]);
    mi.setAttribute("value", i);
    mi.setAttribute("type", "radio");
    if(i==selectedItem) mi.setAttribute("checked","true");
    menu.appendChild(mi);
  }
}


function newGame() {
  var couldUndo = Game.canUndo || GameController.havePastGames;
  var couldRedo = Game.canRedo || GameController.haveFutureGames;
  GameController.newGame();
  if(!couldUndo) gCmdUndo.removeAttribute("disabled");
  if(couldRedo) gCmdRedo.setAttribute("disabled", "true");
}


function restartGame() {
  var couldUndo = Game.canUndo || GameController.havePastGames;
  var couldRedo = Game.canRedo || GameController.haveFutureGames;
  GameController.restartGame();
  if(!couldUndo) gCmdUndo.removeAttribute("disabled");
  if(couldRedo) gCmdRedo.setAttribute("disabled", "true");
}


function undo() {
  var couldRedo = Game.canRedo || GameController.haveFutureGames;
  if(Game.canUndo) Game.undo();
  else GameController.restorePastGame();
  if(!Game.canUndo && !GameController.havePastGames) gCmdUndo.setAttribute("disabled","true");
  if(!couldRedo) gCmdRedo.removeAttribute("disabled");
}


function redo() {
  var couldUndo = Game.canUndo || GameController.havePastGames;
  if(Game.canRedo) Game.redo();
  else GameController.restoreFutureGame();
  if(!couldUndo) gCmdUndo.removeAttribute("disabled");
  if(!Game.canRedo && !GameController.haveFutureGames) gCmdRedo.setAttribute("disabled","true");
}


// enable/disable the UI elements. this is done whenever any animation
// is taking place, as problems ensue otherwise.
function enableUI() {
  gUIEnabled = true;
  gCmdHint.removeAttribute("disabled");
  gCmdNewGame.removeAttribute("disabled");
  gCmdRestartGame.removeAttribute("disabled");
  gOptionsMenu.removeAttribute("disabled");
  if(gDifficultyLevelMenu.shouldBeEnabled) gDifficultyLevelMenu.removeAttribute("disabled");
  gGameSelector.removeAttribute("disabled");
  if(Game.canUndo || GameController.havePastGames) gCmdUndo.removeAttribute("disabled");
  if(Game.canRedo || GameController.haveFutureGames) gCmdRedo.removeAttribute("disabled");
  if(Game.canRedeal()) gCmdRedeal.removeAttribute("disabled");
}


function disableUI() {
  if(!gUIEnabled) return;
  gUIEnabled = false;
  gCmdHint.setAttribute("disabled","true");
  gCmdNewGame.setAttribute("disabled","true");
  gCmdRestartGame.setAttribute("disabled","true");
  gOptionsMenu.setAttribute("disabled","true");
  gDifficultyLevelMenu.setAttribute("disabled","true");
  gGameSelector.setAttribute("disabled","true");
  gCmdUndo.setAttribute("disabled","true");
  gCmdRedo.setAttribute("disabled","true");
  gCmdRedeal.setAttribute("disabled","true");
}


// called from BaseCardGame.autoplay(), which is a function called after all significant
// moves, so handles checking whether the game has been won and taking appropriate action.
function showGameWon() {
  disableUI();
  gGameWonMsg.hidden = false;
  // will get click events before the other event handlers
  window.onclick = function(e) {
    window.onclick = null;
    gGameWonMsg.hidden = true;
    newGame();
    enableUI();
  };
}


function showInsufficientSpacesMsg() {
  disableUI();
  gInsufficientSpacesMsg.hidden = false;
  window.onclick = function(e) {
    window.onclick = null;
    gInsufficientSpacesMsg.hidden = true;
    enableUI();
  };
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
