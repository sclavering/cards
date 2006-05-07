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



var gPrefs = null; // nsIPrefBranch for "games.cards."

var gStrings = []; // the contents of the stringbundle

var Game = null;  // the current games
var GameController = null;

var Games = {}; // all the game controllers, indexed by game id
var gGamesInMenu = []; // array of ids of games shown in Games menu

var gHintHighlighter = null;

var gCardHeight = 0; // cards' heights in pixels (set in useCardSet)
var gCardWidth = 0;

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
var gGameStackTop = 0;    // ... and its coords
var gGameStackLeft = 0;

// Actually just a View, not a Pile.  (Name predates MV-split.)
var gFloatingPile = null; 
var gFloatingPileNeedsHiding = false; // see done()

const CI = Components.interfaces;
const CC = Components.classes;


function init() {
  const things = ["gCmdNewGame","gCmdRestartGame","gCmdUndo","gCmdRedo","gCmdHint",
      "gCmdRedeal","gMessageBox","gMessageLine1","gMessageLine2","gOptionsMenu",
      "gGameSelector","gScorePanel","gScoreDisplay","gGameStack","gGameMenuPopup"];
  for(var i = 0; i != things.length; ++i) {
    var thing = things[i];
    window[thing] = document.getElementById(window[thing]);
  }

  gGameStackTop = gGameStack.boxObject.y;
  gGameStackLeft = gGameStack.boxObject.x;

  createFloatingPile();

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

  createHintHighlighter();

  // We use onmouseup rather than onclick because in Fx1.5mac (at least) there is no click event 
  // if you hold the mouse in one place for a few seconds between moving it and releasing the btn.
  gGameStack.onmouseup = handleMouseClick;
  gGameStack.onmousedown = handleMouseDown;
  // Fx 20050623 on Mac only produces an Up event with .ctrlKey true for right-
  // clicks (no down or click events), so it's easiest to do all right-click
  // detection this way. NB: middle-click only gives a click event (no up/down).
  gGameStack.oncontextmenu = handleRightClick;

  // make controllers for each game type
  for(var game in Games) Games[game] = new GameControllerObj(game, Games[game]);

  // work out which game was played last
  game = "klondike1";
  try { game = gPrefs.getCharPref("current-game"); } catch(e) {}
  if(!(game in Games)) game = "klondike1"; // just in case pref gets corrupted

  // build the games menu
  var gamesInMenu = ["freecell","fan","divorce","gypsy4","klondike1","mod3","penguin","pileon",
      "russiansol","simon4","spider2","spider4","unionsquare","wasp","whitehead","yukon"];
  try { gamesInMenu = gPrefs.getCharPref("gamesInMenu").split(","); } catch(e) {}
  buildGamesMenu(gamesInMenu, game);

  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, game);
}

window.addEventListener("load", init, false);


function handleMouseDown(e) {
  if(e.button==0) Game.mouseDown(e);
}
function handleMouseClick(e) {
  if(e.button==0) Game.mouseClick(e);
}
function handleRightClick(e) {
  Game.mouseRightClick(e);
}


const FloatingPile = {
  pile: null, // will be a fake, because the view expects it

  // coords relative to window corner
  // card is the lowest-index card to be shown
  show: function(card, x, y) {
    const p = card.pile, ix = card.index;
    const cs = this.pile.cards = p.cards.slice(ix);
    this.update(0, cs.length);
    this.top = this._top = y - gGameStackTop;
    this.left = this._left = x - gGameStackLeft;
    // hide the cards in their real pile
    p.view.update(ix, ix);
  },

  // putting the pile where it's not visible is faster than setting it's |hidden| property
  hide: function() {
    this.width = this.height = 0;
    this.top = this.left = this._top = this._left = -1000;
    gFloatingPileNeedsHiding = false;
    // do these really matter?
    this.pile.cards = [];
    this.update(0, 0);
  }
};

function createFloatingPile() {
  FloatingPile.__proto__ = FanDownView;
  gFloatingPile = createPileView(FloatingPile);
  gFloatingPile.pile = { __proto__: Pile, cards: [] };
  gGameStack.appendChild(gFloatingPile);
  gFloatingPile.hide();
}


function createHintHighlighter() {
  const box = gHintHighlighter = document.createElement("box");
  for(var i in _hintHighlighter) box[i] = _hintHighlighter[i];
  box.unhighlight();
  gGameStack.appendChild(box);
  return box;
}
const _hintHighlighter = {
  className: "card-highlight",
  unhighlight: function() {
    this.top = this.left = -1000;
    this.width = this.height = 0;
  },
  highlight: function(thing) { // a Card or a pile
    const card = thing instanceof Card ? thing : null;
    const pile = card ? card.pile : thing;
//    dump("highlight card: "+card+" pile: "+pile);
    const view = pile.view, box = view.boxObject;
    const bounds = view.getHighlightBounds(card);
//    dump(" bounds: x:"+bounds.x+" y:"+bounds.y+" w:"+bounds.width+" h:"+bounds.height+"\n");
    this.top = box.y - gGameStackTop + bounds.y;
    this.left = box.x - gGameStackLeft + bounds.x;
    this.width = bounds.width;
    this.height = bounds.height;
  },
  showHint: function(from, to) {
    const dest = !to.isCard && to.hasCards ? to.lastCard : to;
    this.highlight(from);
    const self = this;
    setTimeout(function() { self.highlight(dest); }, 350);
    setTimeout(function() { self.unhighlight(); }, 800);
  }
};


function playGame(game) {
  if(GameController) GameController.switchFrom();

  gPrefs.setCharPref("current-game",game);
  document.title = gStrings["game."+game];

  GameController = Games[game];
  GameController.switchTo();

  updateUI();
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
  gPrefs.setCharPref("gamesInMenu", ticked.join(","));
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
  // enable undo + disable redo (but avoid doing so unnecessarily)
  if(!Game.canUndo && !GameController.havePastGames) gCmdUndo.removeAttribute("disabled");
  if(Game.canRedo || GameController.haveFutureGames) gCmdRedo.setAttribute("disabled","true");

  if(GameController.haveFutureGames) GameController.clearFutureGames();
  Game.doo(action);
  action.perform();

  // asynch. (i.e. animated) actions trigger autoplay themselves
  if(!action.synchronous) return;
  const t = setTimeout(done, kAnimationDelay, null);
  interruptAction = function() {
    clearTimeout(t);
    return null;
  };
}


// we don't want to enable the UI between an animated move and any autoplay it triggers
function done(pileWhichHasHadCardsRemoved) {
  interruptAction = null;
  if(Game.done(pileWhichHasHadCardsRemoved, false)) return;
  const act = Game.autoplay(pileWhichHasHadCardsRemoved);
  if(act) {
    doo(act);
  } else {
    if(gFloatingPileNeedsHiding) gFloatingPile.hide();
    if(Game.isWon()) showGameWon();
  }
}


function interrupt() {
  if(!interruptAction) return;
  const pile = interruptAction();
  interruptAction = null;
  Game.done(pile, true);
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
  if(Game.canRedeal) gCmdRedeal.removeAttribute("disabled");
  else gCmdRedeal.setAttribute("disabled","true");
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


function useCardSet(set) {
  // xxx As of Fx 1.0 (on Ubuntu Linux 4.10) stylesheets in XUL still lose their titles'
  // if Cards is run more than once (without closing Firefox in between)
  const isCardset = /\/cardsets\/[^.]*\.css$/;
  const rightCardset = new RegExp(set+".css$");
  const sheets = document.styleSheets, num = sheets.length;
  for(var i = 0; i != num; i++) {
    var sheet = sheets[i];
    // the right way
    //if(sheet.title) sheet.disabled = sheet.title!=set;
    // the unpleasant hack
    if(isCardset.test(sheet.href)) sheet.disabled = !rightCardset.test(sheet.href);
  }
  // save pref
  gPrefs.setCharPref("cardset", set);
  // xxx evilish hack
  var isSmallSet = set=="small";
  gCardHeight = isSmallSet ? 80 : 96;
  gCardWidth = isSmallSet ? 59 : 71;
}
