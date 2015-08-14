var gCurrentGame = null;
var gCurrentGameType = null;
const gGameClasses = {}; // game-id -> Game subclass, filled by game-*.js
const gGameTypes = {}; // game-id -> GameType object

const ui = {
  btnUndo: "btn-undo",
  btnRedo: "btn-redo",
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


window.onload = function() {
  for(let k in ui) ui[k] = document.getElementById(ui[k]);
  document.addEventListener('keypress', keyPressHandler, false);
  gFloatingPile.init();
  for(let k in gGameClasses) gGameTypes[k] = new GameType(k, gGameClasses[k]);
  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, "klondike1");
};


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


function playGame(game) {
  if(gCurrentGameType) gCurrentGameType.switchFrom();

  var full_name = document.getElementById('choosegame-' + game).textContent;
  var parts = full_name.match(/^([^)]+)\(([^)]+)\)/);
  ui.gameName.textContent = parts ? parts[1] : full_name;
  ui.gameNameSub.textContent = parts ? parts[2] : '';

  gCurrentGameType = gGameTypes[game];
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
  interrupt();
  // enable undo + disable redo (but avoid doing so unnecessarily)
  if(!gCurrentGame.canUndo && !gCurrentGameType.havePastGames) ui.btnUndo.removeAttribute("disabled");
  if(gCurrentGame.canRedo || gCurrentGameType.haveFutureGames) ui.btnRedo.setAttribute("disabled","true");

  if(gCurrentGameType.haveFutureGames) gCurrentGameType.clearFutureGames();
  const animation_details = gCurrentGame.doo(action);
  if(animation_details) gAnimations.run(animation_details, done);
  else done();
}


function done() {
  const act = gCurrentGame.autoplay();
  if(act) {
    doo(act);
  } else {
    if(gCurrentGame.is_won()) showGameWon();
  }
}


function interrupt() {
  // Ensure we hide the "You've won" message if user presses one of our keyboard shortcuts while it's showing
  if(gMessageBoxIsShowing) { doneShowingMessage(); return; }
  if(gCurrentGame && gCurrentGame.layout) gCurrentGame.layout.cancel_drag();
  gAnimations.cancel();
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


var gMessageBoxIsShowing = false;
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


function setVisibility(el, visible) {
  if(visible) el.style.display = '';
  else el.style.display = 'none';
}
