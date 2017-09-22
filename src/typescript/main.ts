var g_current_game: Game = null;
var g_current_game_type: GameType = null;

// This is filled in by game-*.js
const g_game_classes: { [game_id: string]: typeof Game } = {};

const g_game_types: { [game_id: string]: GameType } = {};


window.onload = function() {
  ui.init();
  document.addEventListener('keypress', key_press_handler, false);
  g_floating_pile.init();
  for(let k in g_game_classes) g_game_types[k] = new GameType(k, g_game_classes[k]);
  // without the setTimeout the game often ends up with one pile incorrectly laid out
  // (typically a fan down that ends up fanning upwards)
  setTimeout(play_game, 0, "klondike1");
};


function key_press_handler(ev: KeyboardEvent): void {
  if(ev.ctrlKey || ev.metaKey) return; // don't interfere with browser shortcuts
  switch(ev.charCode) {
    case 104: // h
    case 105: // i
      hint();
      break;
    case 110: // n
      new_game();
      break;
    case 114: // r
      restart_game();
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


function play_game(game_id: string): void {
  if(g_current_game_type) g_current_game_type.switch_from();

  ui.show_game_name(document.getElementById("choosegame-" + game_id).textContent);

  g_current_game_type = g_game_types[game_id];
  g_current_game_type.switch_to();

  ui.update_undo_redo();
  // Mostly this will be triggered by something else, but when the app is first loading, it's not.
  g_floating_pile.hide();
}


function on_game_selected(ev: Event): boolean {
  hide_game_chooser();
  const m = (ev.target as Element).id.match(/^choosegame-(.*)$/);
  if(m) play_game(m[1]);
  return false;
}


function show_game_chooser(ev: Event): void {
  interrupt();
  set_visibility(ui.game_chooser, true);
  window.onclick = hide_game_chooser;
  // So the event doesn't trigger the .onclick handler we just installed
  ev.stopPropagation();
}


function hide_game_chooser(): void {
  set_visibility(ui.game_chooser, false);
  window.onclick = null;
}


function new_game(): void {
  interrupt();
  g_current_game_type.new_game();
  ui.update_undo_redo();
}


function restart_game(): void {
  interrupt();
  // don't restart if nothing has been done yet
  // xxx should disable the Restart button instead really
  if(!g_current_game.can_undo) return;
  g_current_game_type.restart();
  ui.update_undo_redo();
}


// "do" is a reserved word
function doo(action: Action, was_dragging?: boolean): void {
  if(!action) return;
  interrupt(was_dragging);
  ui.update_undo_redo();
  if(g_current_game_type.have_future_games) g_current_game_type.clear_future_games();
  const animation_details = g_current_game.doo(action);
  if(animation_details) g_animations.run(animation_details, done);
  else done();
  // Typically g_floating_pile would get hidden after an animation completes.  But for e.g. Pyramid's drag-to-form-pairs ui, that doesn't happen (because there's no animation), so we must clean it up here instead.
  if(was_dragging && !animation_details) g_floating_pile.hide();
}


function done(): void {
  const act = g_current_game.autoplay();
  if(act) {
    doo(act);
  } else {
    if(g_current_game.is_won()) ui.show_message("Congratulations – you've won!", "Click to play again", new_game);
  }
}


function interrupt(was_dragging?: boolean): void {
  // Ensure we hide the "You've won" message if user presses one of our keyboard shortcuts while it's showing
  if(ui.hide_message()) return;
  if(!was_dragging && g_current_game && g_current_game.layout) g_current_game.layout.cancel_drag();
  g_animations.cancel();
}


function undo(): void {
  interrupt();
  const could_redo = g_current_game.can_redo || g_current_game_type.have_future_games;
  if(g_current_game.can_undo) g_current_game.undo();
  else g_current_game_type.restore_past_game();
  ui.update_undo_redo();
}


function redo(): void {
  interrupt();
  if(g_current_game.can_redo) g_current_game.redo();
  else g_current_game_type.restore_future_game();
  ui.update_undo_redo();
}


function hint(): void {
  interrupt();
  g_current_game.hint();
}


function set_visibility(el: HTMLElement, visible: boolean): void {
  if(visible) el.style.display = "block";
  else el.style.display = "none";
}


class ui {
  private static _game_name: HTMLElement;
  private static _score_panel: HTMLElement;
  private static _score_display: HTMLElement;
  private static _move_display: HTMLElement;
  private static _undo_button: HTMLElement;
  private static _redo_button: HTMLElement;
  private static _msg1: HTMLElement;
  private static _msg2: HTMLElement;
  private static _messageui: HTMLElement;
  private static _message_showing: boolean = false;
  private static _message_callback: () => void = null;
  private static _helpui: HTMLElement;

  public static game_stack: HTMLElement;
  public static game_chooser: HTMLElement;
  public static card_images: HTMLImageElement;

  static init() {
    this._game_name = document.getElementById("game-name");
    this._score_panel = document.getElementById("score-panel");
    this._score_display = document.getElementById("score-display");
    this._move_display = document.getElementById("moves-display");
    this._undo_button = document.getElementById("btn-undo");
    this._redo_button = document.getElementById("btn-redo");
    this._msg1 = document.getElementById("message1");
    this._msg2 = document.getElementById("message2");
    this._messageui = document.getElementById("messageui");
    this._helpui = document.getElementById("helpui");

    this.game_stack = document.getElementById("games");
    this.game_chooser = document.getElementById("game-chooser");
    this.card_images = document.getElementById("cardsimg") as HTMLImageElement;
  }

  static show_game_name(name: string) {
    this._game_name.textContent = name;
  }

  static set_score_visibility(show: boolean): void {
    set_visibility(this._score_panel, show);
  }

  static update_score_and_moves(score: number, moves: number): void {
    this._score_display.textContent = score.toString();
    this._move_display.textContent = moves.toString();
  }

  static update_undo_redo(): void {
    ui._undo_button.className = g_current_game.can_undo || g_current_game_type.have_past_games ? "" : "disabled";
    ui._redo_button.className = g_current_game.can_redo || g_current_game_type.have_future_games ? "" : "disabled";
  }

  static show_message(text1: string, text2: string, callback?: () => void): void {
    this._message_callback = callback;
    this._msg1.textContent = text1;
    this._msg2.textContent = text2;
    set_visibility(ui._messageui, true);
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
    set_visibility(ui._messageui, false);
    this._message_showing = false;
    const f = this._message_callback;
    this._message_callback = null;
    if(f) f();
  }

  static show_help(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation(); // So we don't trigger the .onclick we're about to set.
    const section = document.getElementById("help-" + (g_current_game.help_id || g_current_game.id));
    set_visibility(section, true);
    set_visibility(this._helpui, true);
    section.onclick = ev => ev.stopPropagation();
    window.onclick = _ => {
      set_visibility(section, false);
      set_visibility(this._helpui, false);
      window.onclick = null;
    };
  }
};


// We handle Retina screens by setting our <canvas> .width and .height to 2x, setting .style.width and .style.height to half that, using a 2x set of card images, and setting a 2x transform on the <canvas> context.  This is not an ideal way of doing things, but Firefox doesn't support expose backingStorePixelRatio on the context, so it's not obvious what else to do.  (It'd be nice if everything just followed the Safari approach of using a HiDPI backing-store automatically.)
function retina_scale_factor(): number {
  return window.devicePixelRatio > 1 ? 2 : 1;
}
