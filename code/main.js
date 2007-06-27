// function for use on Arrays.  this used to be a getter function to hide it from for..in loops, but that does not work anymore in gecko 1.8x
function flattenOnce(a) { return a.concat.apply([], a); }

function extendObj(obj, stuffToAdd, allowReplacement) {
  for(var m in stuffToAdd) {
    if(!allowReplacement && (m in obj)) throw "extendObj: trying to replace an existing property";
    var getter = stuffToAdd.__lookupGetter__(m);
    if(getter) obj.__defineGetter__(m, getter);
    else obj[m] = stuffToAdd[m];
  }
}

function overrideGetter(obj, prop, val) {
  const proto = obj.__proto__;
  obj.__proto__ = {};
  obj[prop] = val;
  obj.__proto__ = proto;
  return val;
}

var gPrefs = null; // nsIPrefBranch for "games.cards."

var gStrings = []; // the contents of the stringbundle

var Game = null;  // the current games
var GameController = null;

var Games = {}; // all the game controllers, indexed by game id
var gGamesInMenu = []; // array of ids of games shown in Games menu

// <command/> elements
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
var gGameSelector = "game-type-menu";
var gGameMenuPopup = "menupopup-gametypes";
var gScorePanel = "score-panel";
var gScoreDisplay = "score-display";
var gGameStack = "games"; // the main <stack>

// <html:img>s for use by canvases.  Keys are typically of the form "S3"
const images = {};

var gFloatingPileNeedsHiding = false; // see done()

const CI = Components.interfaces;
const CC = Components.classes;


function init() {
  const things = ["gCmdNewGame", "gCmdRestartGame", "gCmdUndo", "gCmdRedo",
    "gCmdHint", "gCmdRedeal", "gMessageBox", "gMessageLine1", "gMessageLine2",
    "gOptionsMenu", "gGameSelector", "gScorePanel", "gScoreDisplay",
    "gGameStack", "gGameMenuPopup"];
  for(var i = 0; i != things.length; ++i) {
    var thing = things[i];
    window[thing] = document.getElementById(window[thing]);
  }

  const images_el = document.getElementById("images");
  for each(var img in images_el.childNodes) images[img.id] = img;
  // high aces are treated as cards with number 14
  images.S14 = images.S1;
  images.H14 = images.H1;
  images.D14 = images.D1;
  images.C14 = images.C1;

  gFloatingPile.init();

  // init the pref branch
  gPrefs = CC["@mozilla.org/preferences-service;1"]
      .getService(CI.nsIPrefService).getBranch("games.cards.");

  // load stringbundle
  var svc = CC["@mozilla.org/intl/stringbundle;1"].getService(CI.nsIStringBundleService);
  var bundle = svc.createBundle("chrome://cards/locale/cards.properties").getSimpleEnumeration();
  while(bundle.hasMoreElements()) {
    var property = bundle.getNext().QueryInterface(CI.nsIPropertyElement);
    gStrings[property.key] = property.value;
  }

  // make controllers for each game type
  for(var game in Games) Games[game] = new GameControllerObj(game, Games[game]);

  // work out which game was played last
  var game = loadPref("current-game");
  if(!(game in Games)) game = "klondike1"; // if pref corrupted or missing

  // build the games menu
  var gamesInMenu = loadPref("gamesInMenu")
      || "freecell,fan,divorce,gypsy4,klondike1,mod3,penguin,pileon,russiansol"
          + ",simon4,spider2,spider4,unionsquare,wasp,whitehead,yukon";
  gamesInMenu = gamesInMenu.split(",");
  buildGamesMenu(gamesInMenu, game);

  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, game);
}

window.addEventListener("load", init, false);


function loadPref(name) {
  try {
    return gPrefs.getCharPref(name);
  } catch(e) {}
  return null;
}

function savePref(name, val) {
//   alert("saving: "+name+"="+val);
  gPrefs.setCharPref(name, val);
}



// Not a Pile, nor a View.  Just a <html:canvas> really.
// Needs a <xul:box> so it can be positioned in the <xul:stack>
const gFloatingPile = {
  init: function() {
    this.element = document.createElement("box");
    this.hide();
    gGameStack.appendChild(this.element);
    const HTMLns = "http://www.w3.org/1999/xhtml";
    const canvas = document.createElementNS(HTMLns, "canvas");
    this.element.appendChild(canvas);
    this.context = canvas.getContext("2d");
  },

  element: null,
  context: null, // <canvas> 2d rendering context
  _left: 0,
  _top: 0,

  // Used to suppress repositioning/redrawing between mouseup and animation
  // starting when dropping a card on a new valid pile.
  lastCard: null,

  // putting the pile where it's not visible is faster than setting it's |hidden| property
  hide: function() {
    this.moveTo(-1000, -1000);
    this.lastCard = null;
    gFloatingPileNeedsHiding = false;
  },

  sizeCanvas: function(width, height) {
    this.context.canvas.height = 0;
    this.context.canvas.width = width;
    this.context.canvas.height = height;
  },

  // Show at (x, y).  Must be preceded by a call to sizeCanvas().
  // 'card' has to be stored so that animations starting after a drag look right
  showFor: function(card, x, y) {
    this.lastCard = card;
    // context widths already set appropriately in sizeCanvas
    this.element.width = this.context.canvas.width;
    this.element.height = this.context.canvas.height;
    this.moveTo(x, y);
  },

  moveBy: function(dx, dy) {
    const self = gFloatingPile;
    self.moveTo(self._left + dx, self._top + dy);
  },

  moveTo: function(x, y) {
    const self = gFloatingPile;
    self.element.left = self._left = x;
    self.element.top = self._top = y;
  }
};


function playGame(game) {
  if(GameController) GameController.switchFrom();

  savePref("current-game", game);
  document.title = gStrings["game."+game];

  GameController = Games[game];
  GameController.switchTo();

  updateUI();
  gCmdRedeal.disabled = !Game.redeal;
}


function showGameSelector() {
  const url = "chrome://cards/content/selectgame.xul";
  const flags = "dialog,dependent,modal,chrome,resizable";

  var game, name;
  var names = [];
  var lookup = {};

  for(game in Games) {
    names.push(name = gStrings["game."+game]);
    lookup[name] = game;
  }
  names.sort();

  var ids = new Array(names.length);
  for(var i = 0; i != ids.length; ++i) ids[i] = lookup[names[i]];

  openDialog(url, null, flags, ids, names, gGamesInMenu, Game.id);
}


function gameSelectorClosing(selected, ticked) {
  savePref("gamesInMenu", ticked.join(","));
  buildGamesMenu(ticked, selected);
  playGame(selected);
}


function help() {
  const helpid = Game.helpId || Game.id;
  // position the help window roughly centered on the Cards window
  const w = 450, h = 350;
  const t = Math.floor(screenY + (outerHeight - h) / 3);
  const l = Math.floor(screenX + (outerWidth - w) / 2);
  const featureStr = "dialog=no,width=" + w + ",height=" + h + ",top=" + t + ",left=" + l;
  openDialog("chrome://cards/locale/help.html#" + helpid, null, featureStr);
}


// |items| is an array of game ids; |selected| a game id for which the menuitem should be checked
function buildGamesMenu(items, selected) {
  const menu = gGameMenuPopup;
  gGamesInMenu = items;

  // removing any existing items
  var separator = menu.childNodes[1];
  while(separator != menu.lastChild) menu.removeChild(menu.lastChild);

  // decide on menuitem names and sort them
  var names = [];
  var lookup = [];
  for(var i = 0; i != items.length; i++) {
    var game = items[i];
    var name = gStrings["game."+game];
    names.push(name);
    lookup[name] = game;
  }
  names.sort();

  // build menu
  for(i in names) {
    name = names[i];
    game = lookup[name];
    var mi = document.createElement("menuitem");
    mi.setAttribute("type", "radio");
    mi.setAttribute("label", names[i]);
    if(game==selected) mi.setAttribute("checked", "true");
    mi.gameId = game;
    menu.appendChild(mi);
  }
}


function newGame(cards) {
  interrupt();
  GameController.newGame(cards);
  updateUI();
}


function restartGame() {
  interrupt();
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(!Game.canUndo) return;
  newGame(Game.cardsAsDealt.slice(0));
  updateUI();
}


function doo(action) { // "do" is a reserved word
  if(!action) return;
  // enable undo + disable redo (but avoid doing so unnecessarily)
  if(!Game.canUndo && !GameController.havePastGames) gCmdUndo.removeAttribute("disabled");
  if(Game.canRedo || GameController.haveFutureGames) gCmdRedo.setAttribute("disabled","true");

  if(GameController.haveFutureGames) GameController.clearFutureGames();
  Game.doo(action);

  // Animated actions schedule done() approptiately themselves
  if(action.synchronous) animations.schedule(done, kAnimationDelay);
  // For both the above timer and any requested by an animated action
  animations.setTimeouts();
}


function done() {
  const act = Game.autoplay();
  if(act) {
    doo(act);
  } else {
    if(gFloatingPileNeedsHiding) gFloatingPile.hide();
    if(Game.isWon()) showGameWon();
  }
}


function interrupt() {
  animations.interrupt()
  if(gFloatingPileNeedsHiding) gFloatingPile.hide();
}


function undo() {
  interrupt();
  var couldRedo = Game.canRedo || GameController.haveFutureGames;
  if(Game.canUndo) Game.undo();
  else GameController.restorePastGame();
  if(!Game.canUndo && !GameController.havePastGames) gCmdUndo.setAttribute("disabled","true");
  if(!couldRedo) gCmdRedo.removeAttribute("disabled");
}


function redo() {
  interrupt();
  var couldUndo = Game.canUndo || GameController.havePastGames;
  if(Game.canRedo) Game.redo();
  else GameController.restoreFutureGame();
  if(!couldUndo) gCmdUndo.removeAttribute("disabled");
  if(!Game.canRedo && !GameController.haveFutureGames) gCmdRedo.setAttribute("disabled","true");
}


function hint() {
  interrupt();
  Game.hint();
}


function redeal() {
  interrupt();
  Game.redeal();
  updateUI();
}


function updateUI() {
  if(Game.canUndo || GameController.havePastGames) gCmdUndo.removeAttribute("disabled");
  else gCmdUndo.setAttribute("disabled","true");
  if(Game.canRedo || GameController.haveFutureGames) gCmdRedo.removeAttribute("disabled");
  else gCmdRedo.setAttribute("disabled","true");
}


function showGameWon() {
  showMessage("won", newGame);
}


var gMessageCallback = null;

function showMessage(msg, fun) {
  gMessageCallback = fun;
  gMessageLine1.value = gStrings["message."+msg];
  gMessageLine2.value = gStrings["message2."+msg];
  gMessageBox.hidden = false;

  // the setTimeout is to flush any mouse event that led to the showMessage() call
  setTimeout(function() { window.onclick = doneShowingMessage; }, 0);
}

function doneShowingMessage() {
  window.onclick = null;
  gMessageBox.hidden = true;
  if(gMessageCallback) gMessageCallback();
}
