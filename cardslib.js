// function for use on Arrays.  this used to be a getter function to hide it from for..in loops, but that does not work anymore in gecko 1.8x
function flattenOnce(a) { return a.concat.apply([], a); }


// constants for colours and suits
const RED = 1, BLACK = 2;
const SPADE = 1, HEART = 2, DIAMOND = 3, CLUB = 4;

var gPrefs = null; // nsIPrefBranch for "games.cards."

var gStrings = []; // the contents of the stringbundle

var Game = null;  // the current games
var GameController = null;

var AllGames = [];
var Games = [];   // all the games, indexed by id

var gUIEnabled = true; // set by [en/dis]ableUI().  used to ignore mouse events

var gHintHighlighter = null;

// xxx these need to become cardset dependent
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide

var gCardHeight = 0; // cards' heights in pixels (set in useCardSet)
var gCardWidth = 0;

// <command/> elements
var gCmdSetDifficulty = "cmd:setdifficulty";
var gCmdNewGame = "cmd:newgame";
var gCmdRestartGame = "cmd:restart";
var gCmdUndo = "cmd:undo";
var gCmdRedo = "cmd:redo";
var gCmdHint = "cmd:hint";
var gCmdRedeal = "cmd:redeal";

// other bits of UI
var gMessageBox = "message";
var gMessageLine1 = "message1";
var gMessageLine2 = "message2";
var gOptionsMenu = "options-menu";
var gDifficultyLevelMenu = "game-difficulty-menu";
var gDifficultyLevelPopup = "game-difficulty-popup";
var gGameSelector = "game-type-menu";
var gScoreDisplay = "score-display";
var gGameStack = "games"; // the main <stack>
var gGameStackTop = 0;    // ... and its coords
var gGameStackLeft = 0;

var gFloatingPile = null;
var gFloatingPileNeedsHiding = false; // see animatedActionFinished()


function init() {
  var things = ["gCmdSetDifficulty","gCmdNewGame","gCmdRestartGame","gCmdUndo","gCmdRedo","gCmdHint",
      "gCmdRedeal","gMessageBox","gMessageLine1","gMessageLine2","gOptionsMenu","gDifficultyLevelMenu",
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
    mi.setAttribute("type", "radio");
    mi.setAttribute("label", names[i]);
    mi.gameId = game;
    menu.appendChild(mi);
  }

  // make controllers for each game type
  for(game in AllGames) AllGames[game] = new GameController(game, AllGames[game]);

  for(game in Games) {
    var gamee = Games[game];
    Games[game] = (gamee===true) ? AllGames[game]
        : new DifficultyLevelsController(game, gamee.ids, gamee.names);
  }

  // switch to last played game
  game = "klondike";
  try { game = gPrefs.getCharPref("current-game"); } catch(e) {}
  if(!(game in Games)) game = "klondike"; // just in case pref gets corrupted

  // set window title. (setting window.title does not work while the app. is starting)
  document.documentElement.setAttribute("title", gStrings[game+".name"]);

  // tick/check the menuitem for current game
  mi = menu.firstChild;
  while(mi.gameId != game) mi = mi.nextSibling;
  mi.setAttribute("checked", "true");

  GameController = Games[game];
  GameController.switchTo();
}

window.addEventListener("load", init, false);





// takes an array of cards, returns a *new* shuffled array
function shuffle(cards) {
  cards = cards.slice(0); // copy

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


function makeDecks(num) {
  return makeCardRuns(1, 13, null, num);
}


function makeDecksMod13(num) {
  var cs = makeDecks(num);
  for(var i = 0; i != cs.length; i+=13) {
    var a = cs[i], k = cs[i+12];
    a.down = k; k.up = a; k.upNumber = 1;
  }
  return cs;
}


function makeCardSuits(suits, repeat) {
  return makeCardRuns(1, 13, suits, repeat);
}


function makeCardRuns(start, finish, suits, repeat) {
  finish++; // so we make a run [start..finish], not [start..finish)
  var nums = new Array(finish - start);
  for(var i = 0; i != nums.length; i++) nums[i] = start+i;
  return makeCards(nums, suits, repeat);
}


function makeCards(numbers, suits, repeat) {
  if(!suits) suits = [SPADE, HEART, DIAMOND, CLUB];
  if(!repeat) repeat = 1;
  var cards = [], cs, numNums = numbers.length, numSuits = suits.length;
  // make cards and init |up| and |down| fields
  for(var r = 0; r != repeat; r++) {
    for(var s = 0; s != numSuits; s++) {
      cards.push(cs = new Array(numNums));
      for(var i = 0; i != numNums; i++) {
        cs[i] = makeCard(numbers[i], suits[s]);
        if(i != 0) cs[i-1].up = cs[i], cs[i].down = cs[i-1];
      }
    }
  }
  // init |twin| fields
  if(repeat!=1) {
    const numSets = cards.length;
    for(s = 0; s != numSets; s++) {
      var set = cards[s], twins = cards[(s+numSuits) % numSets];
      for(i = 0; i != numNums; i++) set[i].twin = twins[i];
    }
  }
  return flattenOnce(cards);
}


// pass number==14 for a "high" Ace
function makeCard(number, suit) {
  var c = document.createElement("image");
  for(var m in cardMethods) c[m] = cardMethods[m]; // add standard methods
  c.number = number;
  c.upNumber = number+1; // card.number==other.number+1 used to be very common
  var realNum = c.realNumber = number==14 ? 1 : number;
  c.colour = [,BLACK, RED, RED, BLACK][suit];
  c.altcolour = c.colour==RED ? BLACK : RED;
  c.suit = suit;
  c.suitstr = [,"S", "H", "D", "C"][suit];
  c.isAce = realNum==1;
  c.isQueen = number==12;
  c.isKing = number==13;
  c.setFaceDown(); // sets faceUp, faceDown and className
  return c;
}


var cardMethods = {
  isCard: true,
  isPile: false,

  // pointers to next card up and down in the same suit
  // for Mod3 3C.up==6C etc.
  up: null,
  down: null,

  // null, or a pointer to another card of the same type with the pointer chains forming a loop
  twin: null,

  // often overridden with a getter function
  mayAutoplay: true,

  toString: function() { return this.number+this.suitstr; },

  differsByOneFrom: function(card) {
    return this.number==card.upNumber || card.number==this.upNumber;
  },

  setFaceUp: function() {
    this.faceUp = true;
    this.faceDown = false;
    this.className = "card "+this.suitstr+this.realNumber;
  },

  setFaceDown: function() {
    this.faceUp = false;
    this.faceDown = true;
    this.className = "card facedown";
  }
};





function initPileFromId(id, property, mayTakeCard, mayAddCard) {
  var elt = document.getElementById(id);
  if(!elt) return null;
  initPile(elt);
  elt[property] = true;
  elt.mayTakeCard = mayTakeCard;
  elt.mayAddCard = mayAddCard;
  return elt;
}


function initPile(elt) {
  elt.offset = 0;
  // for the floating pile |source| is set to the pile the cards originally came from.
  elt.source = elt;

  // copy methods for specific pile type
  var ms = elt.className in pileProperties ? pileProperties[elt.className] : basicPileProperties;
  for(var m in ms) elt[m] = ms[m];
  // add getter functions
  ms = elt.className in pileGetters ? pileGetters[elt.className] : basicPileGetters;
  for(m in ms) elt.__defineGetter__(m, ms[m]);

  return elt;
}


// all piles get these
var basicPileProperties = {
  isCard: false,
  isPile: true,
  // one of these will be set to true elsewhere
  isFoundation: false,
  isCell: false,
  isReserve: false,
  isStock: false,
  isWaste: false,
  isNormalPile: false,

  // previous and next pile of the same type
  // BaseCardGame.initPiles() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  nextCardLeft: 0,
  nextCardTop: 0,

  // these are replaced in BaseCardGame.initPiles, based on the game's mayTakeCardFrom* and mayAddCardTo* methods
  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  addCard: function(card) {
    this.appendChild(card);
    card.top = card.left = card._top = card._left = 0;
  },

  fixLayout: function() {},

  // transfers the card and all those that follow it
  addCards: function(first) {
    var next, card = first, source = first.parentNode.source;
    if(!this.offset) this.offset = source.offset;
    while(card) {
      next = card.nextSibling;
      this.addCard(card);
      card = next;
    }
    this.fixLayout();
  },

  dealTo: function(cards, down, up) {
    const num = down + up;
    for(var i = 0; i != num; i++) {
      var card = cards.pop();
      if(!card) continue;
      this.addCard(card);
      if(i>=down) card.setFaceUp();
    }
  }
};


var pileProperties = {
  "fan-down": {
    __proto__: basicPileProperties,

    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.top = card._top = prev ? prev._top + (this.offset || gVFanOffset) : 0;
      card.left = card._left = 0;
    },

    fixLayout: function() {
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
    }
  },

  "fan-right": {
    __proto__: basicPileProperties,

    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.left = card._left = prev ? prev._left + gHFanOffset : 0;
      card.top = card._top = 0;
    }
  },

  "slide": {
    __proto__: basicPileProperties,

    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      if(!prev) {
        card.top = card.left = card._top = card._left = 0;
        return;
      }
      var offset = this.childNodes.length<6 ? gSlideOffset : 0;
      card.top = card._top = prev._top + offset
      card.left = card._left = prev._left + offset;
    }
  },

  // and "foundation8".  Used for Spider, Simon, and Wasp's foundations
  "foundation4": {
    __proto__: basicPileProperties,

    addCards: function(card) {
      var last = this.lastChild;
      var top = last ? last._top + gVFanOffset : 0;
      while(card) {
        var next = card.nextSibling;
        this.appendChild(card);
        card.top = card._top = top;
        card.left = card._left = 0;
        card = next;
      }
    }
  }
};

pileProperties.foundation8 = pileProperties.foundation4;


var basicPileGetters = {
  // the sourrounding piles
  surrounding: function() {
    delete this.surrounding; // so we can replace the getter with an ordinary property
    var ps = this.surrounding = [];
    var prev = this.prev, next = this.next;
    while(prev && next) {
      ps.push(next); ps.push(prev);
      next = next.next; prev = prev.prev;
    }
    while(next) { ps.push(next); next = next.next; }
    while(prev) { ps.push(prev); prev = prev.prev; }
    return ps;
  }
};


var pileGetters = {
  "fan-down": {
    __proto__: basicPileGetters,

    nextCardTop: function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.offset || gVFanOffset);
    }
  },

  "fan-right": {
    __proto__: basicPileGetters,

    nextCardLeft: function() {
      return this.hasChildNodes() ? this.lastChild._left + gHFanOffset : 0;
    }
  },

  "slide": {
    __proto__: basicPileGetters,

    nextCardLeft: function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._left + (this.childNodes.length<6 ? gSlideOffset : 0);
    },

    nextCardTop: function() {
      if(!this.hasChildNodes()) return 0;
      return this.lastChild._top + (this.childNodes.length<6 ? gSlideOffset : 0);
    }
  },

  "foundation4": {
    __proto__: basicPileGetters,

    nextCardTop: function() {
      return this.hasChildNodes() ? this.lastChild._top + gVFanOffset : 0;
    }
  }
};

pileGetters.foundation8 = pileGetters.foundation4;



function createFloatingPile() {
  var pile = document.createElement("stack");
  initPile(pile);
  // putting the pile where it's not visible is faster than setting it's |hidden| property
  pile.hide = function() {
    this.width = this.height = 0;
    this.top = this.left = this._top = this._left = -1000;
  };
  pile.addCards = function(card) {
    var src = card.parentNode.source;
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

    src.fixLayout();
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
    const box = card.boxObject;
    this.top = this._top = box.y - gGameStackTop;
    this.left = this._left = box.x - gGameStackLeft;
    if(card.isCard) {
      const box2 = card.parentNode.lastChild.boxObject;
      this.height = box2.y + box2.height - box.y;
      this.width = box.width;
    } else {
      this.height = gCardHeight;
      this.width = gCardWidth;
    }
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
  disableUI();
  GameController.switchFrom();

  gPrefs.setCharPref("current-game",game);
  window.title = gStrings[game+".name"];

  GameController = Games[game];
  GameController.switchTo();
  enableUI();
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


function newGame(cards) {
  disableUI();
  GameController.newGame(cards);
  enableUI();
}


function restartGame() {
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(Game.canUndo) newGame(Game.cardsAsDealt.slice(0));
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


function showGameWon() {
  showMessage("won", newGame);
}


var gMessageCallback = null;

function showMessage(msg, fun) {
  disableUI();
  gMessageCallback = fun;
  gMessageLine1.value = gStrings["message."+msg];
  gMessageLine2.value = gStrings["message2."+msg];
  gMessageBox.hidden = false;
  // the setTimeout is to ensure any mouse event that led to showMessage being called has gone away
  setTimeout(function() { window.onclick = doneShowingMessage; }, 0);
}

function doneShowingMessage() {
  window.onclick = null;
  gMessageBox.hidden = true;
  if(gMessageCallback) gMessageCallback();
  else enableUI();
}


function useCardSet(set) {
  // switch stylesheets
  const sheets = document.styleSheets, num = sheets.length;
  for(var i = 0; i != num; i++)
    if(sheets[i].title) sheets[i].disabled = sheets[i].title!=set;
  // save pref
  gPrefs.setCharPref("cardset", set);
  // xxx evilish hack
  var isSmallSet = set=="small";
  gCardHeight = isSmallSet ? 80 : 96;
  gCardWidth = isSmallSet ? 59 : 71;
}
