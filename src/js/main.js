function overrideGetter(obj, prop, val) {
  const proto = obj.__proto__;
  obj.__proto__ = {};
  obj[prop] = val;
  obj.__proto__ = proto;
  return val;
}

var gPrefs = {};

var gCurrentGame = null;
var gCurrentGameType = null;

var Games = {}; // all the game controllers, indexed by game id

var ui = {
  btnUndo: "btn-undo",
  btnRedo: "btn-redo",
  btnHint: "btn-hint",
  btnRedeal: "btn-redeal",
  messageBox: "message",
  messageLine1: "message1",
  messageLine2: "message2",
  scorePanel: "score-panel",
  scoreDisplay: "score-display",
  movesDisplay: "moves-display",
  gameStack: "games",
  gameChooser: "game-chooser",
  gameName: "game-name",
  gameNameSub: "game-name-sub",
  cardImages: "cardsimg",
};

var gMessageBoxIsShowing = false;
var gFloatingPileNeedsHiding = false; // see done()


function init() {
  for(var k in ui) ui[k] = document.getElementById(ui[k]);

  document.addEventListener('keypress', keyPressHandler, false);

  gFloatingPile.init();

  for(var game in Games) Games[game] = new GameType(game, Games[game]);

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
    this._element = document.getElementById("floatingpile");
    this.hide();
    const canvas = document.createElement("canvas");
    this._element.appendChild(canvas);
    this.context = canvas.getContext("2d");
  },

  boundingRect: function() { return this._element.getBoundingClientRect(); },

  _element: null,
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
    this._element.style.width = this.context.canvas.width + 'px';
    this._element.style.height = this.context.canvas.height + 'px';
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
    self._element.style.left = self._left + 'px';
    // xxx this seems to sometimes cause warnings to show on the error console (seen in Fx 3.0):
    // "Warning: Error in parsing value for property 'top'.  Declaration dropped."
    self._element.style.top = self._top + 'px';
  }
};


function playGame(game) {
  if(gCurrentGameType) gCurrentGameType.switchFrom();

  savePref("current-game", game);

  var full_name = document.getElementById('choosegame-' + game).textContent;
  var parts = full_name.match(/^([^)]+)\(([^)]+)\)/);
  ui.gameName.textContent = parts ? parts[1] : full_name;
  ui.gameNameSub.textContent = parts ? parts[2] : '';

  gCurrentGameType = Games[game];
  gCurrentGameType.switchTo();

  updateUI();
  ui.btnRedeal.setAttribute("disabled", !gCurrentGame.redeal);
  // Mostly this will be triggered by something else, but when the app is first loading, it's not.
  gFloatingPile.hide();
}


function help() {
  const helpid = gCurrentGame.helpId || gCurrentGame.id;
  // position the help window roughly centered on the Cards window
  const w = 450, h = 350;
  const t = Math.floor(screenY + (outerHeight - h) / 3);
  const l = Math.floor(screenX + (outerWidth - w) / 2);
  const featureStr = "dialog=no,width=" + w + ",height=" + h + ",top=" + t + ",left=" + l;
  window.open("help.html#" + helpid, null, featureStr);
}


function onGameSelected(ev) {
  hideGameChooser();
  const m = ev.originalTarget.id.match(/^choosegame-(.*)$/);
  if(m) playGame(m[1]);
  return false;
}


function showGameChooser(ev) {
  interrupt();
  ui.gameChooser.style.display = 'block';
  window.onclick = hideGameChooser;
  // So the event doesn't trigger the .onclick handler we just installed
  ev.stopPropagation();
}


function hideGameChooser() {
  ui.gameChooser.style.display = 'none';
  window.onclick = null;
}


function newGame() {
  interrupt();
  gCurrentGameType.newGame();
  updateUI();
}


function restartGame() {
  interrupt();
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(!gCurrentGame.canUndo) return;
  gCurrentGameType.restart();
  updateUI();
}


function doo(action) { // "do" is a reserved word
  if(!action) return;
  // enable undo + disable redo (but avoid doing so unnecessarily)
  if(!gCurrentGame.canUndo && !gCurrentGameType.havePastGames) ui.btnUndo.removeAttribute("disabled");
  if(gCurrentGame.canRedo || gCurrentGameType.haveFutureGames) ui.btnRedo.setAttribute("disabled","true");

  if(gCurrentGameType.haveFutureGames) gCurrentGameType.clearFutureGames();
  gCurrentGame.doo(action);

  // Animated actions schedule done() approptiately themselves
  if(action.synchronous) animations.schedule(done, kAnimationDelay);
  // For both the above timer and any requested by an animated action
  animations.setTimeouts();
}


function done() {
  const act = gCurrentGame.autoplay();
  if(act) {
    doo(act);
  } else {
    if(gFloatingPileNeedsHiding) gFloatingPile.hide();
    if(gCurrentGame.is_won()) showGameWon();
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
  var couldRedo = gCurrentGame.canRedo || gCurrentGameType.haveFutureGames;
  if(gCurrentGame.canUndo) gCurrentGame.undo();
  else gCurrentGameType.restorePastGame();
  if(!gCurrentGame.canUndo && !gCurrentGameType.havePastGames) ui.btnUndo.setAttribute("disabled","true");
  if(!couldRedo) ui.btnRedo.removeAttribute("disabled");
}


function redo() {
  interrupt();
  var couldUndo = gCurrentGame.canUndo || gCurrentGameType.havePastGames;
  if(gCurrentGame.canRedo) gCurrentGame.redo();
  else gCurrentGameType.restoreFutureGame();
  if(!couldUndo) ui.btnUndo.removeAttribute("disabled");
  if(!gCurrentGame.canRedo && !gCurrentGameType.haveFutureGames) ui.btnRedo.setAttribute("disabled","true");
}


function hint() {
  interrupt();
  gCurrentGame.hint();
}


function redeal() {
  interrupt();
  gCurrentGame.redeal();
  updateUI();
}


function updateUI() {
  ui.btnUndo.setAttribute("disabled", !(gCurrentGame.canUndo || gCurrentGameType.havePastGames));
  ui.btnRedo.setAttribute("disabled", !(gCurrentGame.canRedo || gCurrentGameType.haveFutureGames));
}


function showGameWon() {
  showMessage("Congratulations – you've won!", "Click to play again", newGame);
}


var gMessageCallback = null;

function showMessage(msgText1, msgText2, fun) {
  gMessageCallback = fun;
  ui.messageLine1.textContent = msgText1;
  ui.messageLine2.textContent = msgText2;
  ui.messageBox.style.display = 'block';
  gMessageBoxIsShowing = true;
  // the setTimeout is to flush any mouse event that led to the showMessage() call
  setTimeout(function() { window.onclick = doneShowingMessage; }, 0);
}

function doneShowingMessage() {
  window.onclick = null;
  ui.messageBox.style.display = 'none';
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
