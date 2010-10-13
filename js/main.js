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

// <toolbarbutton/> elements
var gCmdUndo = "cmd:undo";
var gCmdRedo = "cmd:redo";
var gCmdHint = "cmd:hint";
var gCmdRedeal = "cmd:redeal";

// other bits of UI
var gMessageBox = "message";
var gMessageLine1 = "message1";
var gMessageLine2 = "message2";
var gScorePanel = "score-panel";
var gScoreDisplay = "score-display";
var gGameStack = "games";
var gGameChooser = "game-chooser";
var gGameName = "game-name";
var gGameNameSub = "game-name-sub";
var gCardImages = "cardsimg";

var gMessageBoxIsShowing = false;
var gFloatingPileNeedsHiding = false; // see done()


function init() {
  const things = ['gCmdUndo', 'gCmdRedo', 'gCmdHint', 'gCmdRedeal', 'gGameStack', 'gGameChooser',
    'gMessageBox', 'gMessageLine1', 'gMessageLine2', 'gScorePanel', 'gScoreDisplay', 'gGameName',
    'gGameNameSub', 'gCardImages'];
  for(var i = 0; i != things.length; ++i) {
    var thing = things[i];
    window[thing] = document.getElementById(window[thing]);
  }

  document.addEventListener('keypress', keyPressHandler, false);

  gFloatingPile.init();

  // make controllers for each game type
  for(var game in Games) Games[game] = new GameControllerObj(game, Games[game]);

  // work out which game was played last
  var game = loadPref("current-game");
  if(!(game in Games)) game = "klondike1"; // if pref corrupted or missing

  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, game);
}

window.addEventListener("load", init, false);


function keyPressHandler(e) {
  if(e.ctrlKey || e.metaKey) return; // don't interfere with browser shortcuts
  switch(e.charCode) {
    case 104: // h
    case 105: // i
      hint();
      break;
    case 110: // n
      newGame();
      break;
    case 114: // r
      restartGame();
      break;
    case 117: // u
    case 122: // z
      undo();
      break;
    case 90: // Z
      redo();
      break;
    default:
      return; // avoid the code below
  }
  e.preventDefault();
}


function loadPref(name) {
  return name in gPrefs ? gPrefs[name] : null;
}

function savePref(name, val) {
  gPrefs[name] = val;
}


// A <div><canvas/></div> used to show cards being dragged or animated.
const gFloatingPile = {
  init: function() {
    this.element = document.getElementById("floatingpile");
    this.hide();
    const canvas = document.createElement("canvas");
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
    this.element.style.width = this.context.canvas.width + 'px';
    this.element.style.height = this.context.canvas.height + 'px';
    this.moveTo(x, y);
  },

  moveBy: function(dx, dy) {
    const self = gFloatingPile;
    self.moveTo(self._left + dx, self._top + dy);
  },

  moveTo: function(x, y) {
    const self = gFloatingPile;
    self._left = x;
    self._top = y;
    self.element.style.left = self._left + 'px';
    // xxx this seems to sometimes cause warnings to show on the error console (seen in Fx 3.0):
    // "Warning: Error in parsing value for property 'top'.  Declaration dropped."
    self.element.style.top = self._top + 'px';
  }
};


function playGame(game) {
  if(GameController) GameController.switchFrom();

  savePref("current-game", game);

  var full_name = gStrings["game."+game];
  var parts = full_name.match(/^([^)]+)\(([^)]+)\)/);
  gGameName.textContent = parts ? parts[1] : full_name;
  gGameNameSub.textContent = parts ? parts[2] : '';

  GameController = Games[game];
  GameController.switchTo();

  updateUI();
  gCmdRedeal.setAttribute("disabled", !Game.redeal);
  // Mostly this will be triggered by something else, but when the app is first loading, it's not.
  gFloatingPile.hide();
}


function help() {
  const helpid = Game.helpId || Game.id;
  // position the help window roughly centered on the Cards window
  const w = 450, h = 350;
  const t = Math.floor(screenY + (outerHeight - h) / 3);
  const l = Math.floor(screenX + (outerWidth - w) / 2);
  const featureStr = "dialog=no,width=" + w + ",height=" + h + ",top=" + t + ",left=" + l;
  window.open("help.html#" + helpid, null, featureStr);
}


function onGameSelected(ev) {
  hideGameChooser();
  const gameid = ev.originalTarget.getAttribute("data-gameid");
  if(gameid) playGame(gameid);
  return false;
}


function showGameChooser(ev) {
  interrupt();
  gGameChooser.style.display = 'block';
  window.onclick = hideGameChooser;
  // So the event doesn't trigger the .onclick handler we just installed
  ev.stopPropagation();
}


function hideGameChooser() {
  gGameChooser.style.display = 'none';
  window.onclick = null;
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
  // Ensure we hide the "You've won" message if user presses one of our keyboard shortcuts while it's showing
  if(gMessageBoxIsShowing) { doneShowingMessage(); return; }

  animations.interrupt();
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
  gMessageLine1.textContent = gStrings['message.' + msg];
  gMessageLine2.textContent = gStrings['message2.' + msg];
  gMessageBox.style.display = 'block';
  gMessageBoxIsShowing = true;
  // the setTimeout is to flush any mouse event that led to the showMessage() call
  setTimeout(function() { window.onclick = doneShowingMessage; }, 0);
}

function doneShowingMessage() {
  window.onclick = null;
  gMessageBox.style.display = 'none';
  gMessageBoxIsShowing = false;
  var f = gMessageCallback;
  gMessageCallback = null;
  if(f) f();
}


function createHTML(class_name) {
  var el = document.createElement("div");
  el.className = class_name;
  return el;
}


function setVisibility(el, visible) {
  if(visible) el.style.display = '';
  else el.style.display = 'none';
}
