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

var gPrefs = {};

var Game = null;  // the current games
var GameController = null;

var Games = {}; // all the game controllers, indexed by game id

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

  // make controllers for each game type
  for(var game in Games) Games[game] = new GameControllerObj(game, Games[game]);

  // work out which game was played last
  var game = loadPref("current-game");
  if(!(game in Games)) game = "klondike1"; // if pref corrupted or missing

  buildGamesMenu(game);
  migratePrefs();

  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, game);
}

window.addEventListener("load", init, false);


function loadPref(name) {
  return name in gPrefs ? gPrefs[name] : null;
}

function savePref(name, val) {
  gPrefs[name] = val;
}


function migratePrefs() {
  // The set of games shown in the menu used to be set manually by the user in
  // a dialogue window using a list of checkboxes, and be stored in a pref. Now
  // we implement an "intellimenu" -- games played recently show up. To control
  // the games initally shown (or to migrate the pref) we set dates manually.
  if(!loadPref("migrated_gamesInMenu")) {
    savePref("migrated_gamesInMenu", "true");
    const idstr = loadPref("gamesInMenu")
      || "freecell,fan,divorce,gypsy4,klondike1,mod3,penguin,pileon,russiansol"
          + ",simon4,spider2,spider4,unionsquare,wasp,whitehead,yukon";
    const ids = idstr.split(",");
    const valid = [id for each(id in ids) if(id in Games)];
    for each(var id in valid) savePref(id + ".lastplayed", Date.now());
  }
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

  savePref(game + ".lastplayed", Date.now());
  savePref("current-game", game);
  document.title = gStrings["game."+game];

  GameController = Games[game];
  GameController.switchTo();

  updateUI();
  gCmdRedeal.setAttribute("disabled", !Game.redeal);
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
function buildGamesMenu(selected) {
  const menu = gGameMenuPopup;
  const last = menu.lastChild; // the "..." item

  const ids = [id for(id in Games)];
  const nameToId = {};
  for each(var id in ids) nameToId[gStrings["game." + id]] = id;
  const names = [name for(name in nameToId)];
  names.sort();

  for each(name in names) {
    var game = nameToId[name];
    var mi = document.createElement("menuitem");
    mi.setAttribute("type", "radio");
    mi.setAttribute("label", name);
    if(game==selected) mi.setAttribute("checked", "true");
    mi.gameId = game;
    menu.insertBefore(mi, last);
  }
  // <menuitem>s other than the final expander
  menu.gameItems = Array.slice(menu.childNodes, 0, menu.childNodes.length - 1);
}

function onGamesMenuShowing(popup) {
  popup.className = "gamesmenu_unexpanded";
  popup.lastChild.hidden = false;
  const show = {};
  const minDate = Date.now() - 1000 * 60 * 60 * 24 * 30; // one month ago, ish
  for(var id in Games) {
    var lastplayed = parseInt(loadPref(id + ".lastplayed"));
    if(lastplayed > minDate) show[id] = true;
  }
  for each(var mi in popup.gameItems)
    mi.className = show[mi.gameId] ? "" : "notrecentlyplayed";
}

function showAllGames(menuitem) {
  menuitem.parentNode.className = "gamesmenu_expanded";
  menuitem.hidden = true;
}



function newGame() {
  interrupt();
  GameController.newGame();
  updateUI();
}


function restartGame() {
  interrupt();
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(!Game.canUndo) return;
  GameController.restart();
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
  gCmdUndo.setAttribute("disabled", !(Game.canUndo || GameController.havePastGames));
  gCmdRedo.setAttribute("disabled", !(Game.canRedo || GameController.haveFutureGames));
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
