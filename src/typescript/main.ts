var gCurrentGame: Game = null;
var gCurrentGameType: GameType = null;

// This is filled in by game-*.js
const gGameClasses: { [game_id: string]: typeof Game } = {};

const gGameTypes: { [game_id: string]: GameType } = {};


window.onload = function() {
  ui.init();
  document.addEventListener('keypress', keyPressHandler, false);
  g_floating_pile.init();
  for(let k in gGameClasses) gGameTypes[k] = new GameType(k, gGameClasses[k]);
  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(playGame, 0, "klondike1");
};


function keyPressHandler(ev: KeyboardEvent): void {
  if(ev.ctrlKey || ev.metaKey) return; // don't interfere with browser shortcuts
  switch(ev.charCode) {
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
  ev.preventDefault();
}


function playGame(game_id: string): void {
  if(gCurrentGameType) gCurrentGameType.switchFrom();

  const full_name = document.getElementById("choosegame-" + game_id).textContent;
  const parts = full_name.match(/^([^)]+)\(([^)]+)\)/);
  ui.show_game_name(parts ? parts[1] : full_name, parts ? parts[2] : "");

  gCurrentGameType = gGameTypes[game_id];
  gCurrentGameType.switchTo();

  ui.update_undo_redo();
  // Mostly this will be triggered by something else, but when the app is first loading, it's not.
  g_floating_pile.hide();
}


function help(): void {
  const helpid = gCurrentGame.helpId || gCurrentGame.id;
  // position the help window roughly centered on the Cards window
  const w = 450, h = 350;
  const t = Math.floor(screenY + (outerHeight - h) / 3);
  const l = Math.floor(screenX + (outerWidth - w) / 2);
  const featureStr = "dialog=no,width=" + w + ",height=" + h + ",top=" + t + ",left=" + l;
  window.open("help.html#" + helpid, null, featureStr);
}


function onGameSelected(ev: Event): boolean {
  hideGameChooser();
  const m = (ev.target as Element).id.match(/^choosegame-(.*)$/);
  if(m) playGame(m[1]);
  return false;
}


function showGameChooser(ev: Event): void {
  interrupt();
  setVisibility(ui.gameChooser, true);
  window.onclick = hideGameChooser;
  // So the event doesn't trigger the .onclick handler we just installed
  ev.stopPropagation();
}


function hideGameChooser(): void {
  setVisibility(ui.gameChooser, false);
  window.onclick = null;
}


function newGame(): void {
  interrupt();
  gCurrentGameType.newGame();
  ui.update_undo_redo();
}


function restartGame(): void {
  interrupt();
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(!gCurrentGame.canUndo) return;
  gCurrentGameType.restart();
  ui.update_undo_redo();
}


// "do" is a reserved word
function doo(action: Action, was_dragging?: boolean): void {
  if(!action) return;
  interrupt(was_dragging);
  ui.update_undo_redo();
  if(gCurrentGameType.haveFutureGames) gCurrentGameType.clearFutureGames();
  const animation_details = gCurrentGame.doo(action);
  if(animation_details) g_animations.run(animation_details, done);
  else done();
  // Typically g_floating_pile would get hidden after an animation completes.  But for e.g. Pyramid's drag-to-form-pairs ui, that doesn't happen (because there's no animation), so we must clean it up here instead.
  if(was_dragging && !animation_details) g_floating_pile.hide();
}


function done(): void {
  const act = gCurrentGame.autoplay();
  if(act) {
    doo(act);
  } else {
    if(gCurrentGame.is_won()) ui.show_message("Congratulations – you've won!", "Click to play again", newGame);
  }
}


function interrupt(was_dragging?: boolean): void {
  // Ensure we hide the "You've won" message if user presses one of our keyboard shortcuts while it's showing
  if(ui.hide_message()) return;
  if(!was_dragging && gCurrentGame && gCurrentGame.layout) gCurrentGame.layout.cancel_drag();
  g_animations.cancel();
}


function undo(): void {
  interrupt();
  const could_redo = gCurrentGame.canRedo || gCurrentGameType.haveFutureGames;
  if(gCurrentGame.canUndo) gCurrentGame.undo();
  else gCurrentGameType.restorePastGame();
  ui.update_undo_redo();
}


function redo(): void {
  interrupt();
  if(gCurrentGame.canRedo) gCurrentGame.redo();
  else gCurrentGameType.restoreFutureGame();
  ui.update_undo_redo();
}


function hint(): void {
  interrupt();
  gCurrentGame.hint();
}


function setVisibility(el: HTMLElement, visible: boolean): void {
  if(visible) el.style.display = "block";
  else el.style.display = "none";
}


class ui {
  private static _game_name: HTMLElement;
  private static _game_name_sub: HTMLElement;
  private static _score_panel: HTMLElement;
  private static _score_display: HTMLElement;
  private static _move_display: HTMLElement;
  private static _undo_button: HTMLElement;
  private static _redo_button: HTMLElement;
  private static _msg1: HTMLElement;
  private static _msg2: HTMLElement;
  private static _message_box: HTMLElement;
  private static _message_showing: boolean = false;
  private static _message_callback: () => void = null;

  public static gameStack: HTMLElement;
  public static gameChooser: HTMLElement;
  public static cardImages: HTMLImageElement;

  static init() {
    this._game_name = document.getElementById("game-name");
    this._game_name_sub = document.getElementById("game-name-sub");
    this._score_panel = document.getElementById("score-panel");
    this._score_display = document.getElementById("score-display");
    this._move_display = document.getElementById("moves-display");
    this._undo_button = document.getElementById("btn-undo");
    this._redo_button = document.getElementById("btn-redo");
    this._msg1 = document.getElementById("message1");
    this._msg2 = document.getElementById("message2");
    this._message_box = document.getElementById("message");

    this.gameStack = document.getElementById("games");
    this.gameChooser = document.getElementById("game-chooser");
    this.cardImages = document.getElementById("cardsimg") as HTMLImageElement;
  }

  static show_game_name(name: string, sub: string) {
    this._game_name.textContent = name;
    this._game_name_sub.textContent = sub;
  }

  static set_score_visibility(show: boolean): void {
    setVisibility(this._score_panel, show);
  }

  static update_score_and_moves(score: number, moves: number): void {
    this._score_display.textContent = score.toString();
    this._move_display.textContent = moves.toString();
  }

  static update_undo_redo(): void {
    ui._undo_button.className = gCurrentGame.canUndo || gCurrentGameType.havePastGames ? "" : "disabled";
    ui._redo_button.className = gCurrentGame.canRedo || gCurrentGameType.haveFutureGames ? "" : "disabled";
  }

  static show_message(text1: string, text2: string, callback?: () => void): void {
    this._message_callback = callback;
    this._msg1.textContent = text1;
    this._msg2.textContent = text2;
    setVisibility(ui._message_box, true);
    this._message_showing = true;
    // the setTimeout is to flush any mouse event that led to the show_message() call
    setTimeout(function() { window.onclick = () => ui._hide_message(); }, 0);
  }

  static hide_message(): boolean {
    if(!this._message_showing) return false;
    ui._hide_message();
    return true;
  }

  private static _hide_message(): void {
    window.onclick = null;
    setVisibility(ui._message_box, false);
    this._message_showing = false;
    const f = this._message_callback;
    this._message_callback = null;
    if(f) f();
  }
}
