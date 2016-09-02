interface Hint {
  hint_source_card: Card;
  hint_destinations: AnyPile[];
}

type AutoplayPredicate = (c: Card) => boolean;


// The base-type for all games
class Game {
  public id: string;

  protected pile_details: {
    [pile_collection_name: string]: [number, typeof AnyPile, number | number[], number | number[]];
  };
  all_cards: Card[];
  foundation_cluster_count: number;
  protected show_hints_to_empty_piles: boolean;
  hasScoring: boolean;
  score: number;
  piles: AnyPile[];
  cells: AnyPile[];
  foundations: AnyPile[];
  foundation: AnyPile;
  reserves: AnyPile[];
  reserve: AnyPile;
  stocks: Stock[];
  stock: Stock;
  wastes: Waste[];
  waste: Waste;
  pile_arrays_by_letter: { [key: string]: AnyPile[] };
  _foundation_clusters: AnyPile[][];
  all_piles: AnyPile[];
  dragDropTargets: AnyPile[];
  hint_and_autoplay_source_piles: AnyPile[];
  actionList: Action[];
  actionPtr: number;
  canUndo: boolean;
  canRedo: boolean;
  private _hints: Hint[];
  private _next_hint_index: number;
  helpId: string;
  layout: Layout;
  order_cards_dealt: number[];

  // All subclasses must implement this and have it return a Layout instance.  It's called on the "class" itself, not the instance.
  static create_layout(): Layout {
    throw new Error("not implemented");
  }

  constructor() {
    // Subclasses should set this, which describes the piles to create.  It is mapping of:
    //     pile_kind (string) -> tuple of [
    //         num_piles_of_kind : int,
    //         PileClass : class,
    //         num_to_deal_face_down : int | int[],
    //         num_to_deal_face_up : int | int[],
    //     ]
    // e.g.:
    //     this.pile_details = {
    //       stocks: [1, StockDeal3OrRefill, 0, 0],
    //       wastes: [1, Waste, 0, 0],
    //       piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
    //       foundations: [4, KlondikeFoundation, 0, 0],
    //     };
    // The keys usually refer to an existing AnyPile-array collections in Game, but *can* be custom ones.  The first letter of the key is used to match AnyPile objects to their View in the Layout.
    this.pile_details = null;

    // Once a game is running, this is an array of the all the card objects used by the game.
    // Subclasses should set this in their constructor.
    this.all_cards = null;

    // Part of the preferred-foundation system feature.  Subclasses may set it to the number of suits to use to opt in.  (It's opt-in because of edge cases like Mod3).
    this.foundation_cluster_count = null;

    // In most games, a hint where the destination is an empty pile is not worth showing (because it's obvious that the move is possible, and it gets in the way of showing more interesting hints).
    this.show_hints_to_empty_piles = false;

    // Subclasses should overwrite this if desired.
    this.hasScoring = false;

    // Should not be directly set in subclasses.
    this.score = 0;

    // Piles in arrays by type, and the first piles of some such types.
    this.piles = [];
    this.cells = [];
    this.foundations = [];
    this.foundation = null;
    this.reserves = [];
    this.reserve = null;
    this.stocks = [];
    this.stock = null;
    this.wastes = [];
    this.waste = null;

    // An array of piles on which cards can be dropped.
    this.dragDropTargets = null;

    // Undo/Redo state
    this.actionList = [];
    this.actionPtr = 0;
    this.canUndo = false;
    this.canRedo = false;

    // Hint state
    this._hints = null; // Array of { hint_source_card: Card, hint_destinations: [Pile] } structs, or null.
    this._next_hint_index = 0;

    this.helpId = null;

    // A Layout (or subclass) instance.  The actual instance is shared with other games of the same type.
    this.layout = null;
  }

  show(): void {
    this.layout.attach_piles_to_views(this.pile_arrays_by_letter);
    this.layout.show();
    ui.set_score_visibility(this.hasScoring);
    ui.update_score_and_moves(this.score, this.actionPtr);
  }

  hide(): void {
    this.layout.hide();
  }

  _create_piles(): void {
    const details = this.pile_details;
    this.all_piles = [];
    this.pile_arrays_by_letter = {};
    for(let k in details) {
      let [num, PileClass, face_down, face_up] = details[k];
      let collection: AnyPile[] = this.pile_arrays_by_letter[k[0]] = [];
      this[k] = collection;
      for(let i = 0; i !== num; ++i) {
        let p = new PileClass();
        p.owning_game = this;
        p.num_to_deal_face_down = face_down instanceof Array ? face_down[i] : face_down;
        p.num_to_deal_face_up = face_up instanceof Array ? face_up[i] : face_up;
        collection.push(p);
        this.all_piles.push(p);
      }

      for(let i = 0; i !== collection.length; ++i) {
        collection[i].prev = collection[i - 1] || null;
        collection[i].next = collection[i + 1] || null;
      }
    }

    this.dragDropTargets = this.all_piles.filter(p => p.is_drop_target);
    this.foundations.forEach((f, ix) => f.index = ix);
    this.waste = this.wastes[0] || null;
    this.foundation = this.foundations[0] || null
    this.reserve = this.reserves[0] || null;
    this.stock = this.stocks[0] || null;
    this.hint_and_autoplay_source_piles = [].concat(this.reserves, this.cells, this.wastes, this.piles);
  }

  // The actual entry-point to starting a game instance.
  begin(shared_layout: Layout, optional_order_to_deal?: number[]): void {
    this.layout = shared_layout;

    this.actionList = [];
    this.score = 0;
    ui.update_score_and_moves(this.score, this.actionPtr);
    this._create_piles();
    if(!this.all_cards) this.all_cards = make_cards(1);
    this.init();
    this._foundation_clusters = this._get_foundation_clusters(this.all_cards, this.foundations);
    this.all_cards.forEach((c, ix) => { if(c) c.__all_cards_index = ix; });
    let cs: Card[];
    // Storing .order_cards_dealt as an array of indexes rather than cards is necessary for "Restart" to work properly (since it works by starting a new game with the same deal-order, and the new game instance has its own separate card objects).
    if(optional_order_to_deal) {
      cs = optional_order_to_deal.map(ix => this.all_cards[ix] || null);
      this.order_cards_dealt = optional_order_to_deal;
    } else {
      cs = this.all_cards.slice();
      do { shuffle_in_place(cs) } while(this.is_shuffle_impossible(cs));
      this.order_cards_dealt = cs.map((c: Card) => c ? c.__all_cards_index : null);
    }
    this.deal(cs);
  }

  // For subclasses to optionally implement.  Typically used to add extra properties to piles.
  init(): void {
  }

  // Deal the provided pre-shuffled cards for a new game.  Many subclasses will find this version sufficient.
  deal(cards: Card[]): void {
    let ix = 0;
    for(let p of this.all_piles) ix = this._deal_cards(cards, ix, p, p.num_to_deal_face_down, p.num_to_deal_face_up);
    if(ix < cards.length) ix = this._deal_cards(cards, ix, this.stock, cards.length, 0);
  }

  // Used in implementing .deal().  It's intentionally tolerant of being asked to deal too many cards, because that makes it easier to specify game layouts (several games have their final pile have fewer cards in it than the others).
  protected _deal_cards(cards: Card[], ix: number, pile: AnyPile, num_face_down: number, num_face_up: number): number {
    const cs = cards.slice(ix, ix + num_face_down + num_face_up);
    for(let i = num_face_down; i < cs.length; ++i) cs[i].faceUp = true;
    pile.add_cards_from_array(cs, true);
    return ix + cs.length;
  }

  protected _deal_cards_with_nulls_for_spaces(cards: Card[]): void {
    cards.forEach((c, ix) => {
      if(!c) return;
      c.faceUp = true;
      this.piles[ix].add_cards_from_array([c], true);
    });
  }

  // Subclasses may override this to prevent (some) impossible games from being dealt. Cards will be shuffled repeatedly until this returns false.
  protected is_shuffle_impossible(shuffled_cards: Card[]): boolean {
    return false;
  }


  // === Winning ==========================================

  // Most subclasses will find this sufficient.
  public is_won(): boolean {
    const expected_foundation_length = this.all_cards.length / this.foundations.length;
    for(let f of this.foundations) if(f.cards.length !== expected_foundation_length) return false;
    return true;
  }


  // === Scoring ==========================================

  protected getScoreFor(action: Action): number {
    return 0;
  }


  // === Move tracking and Undoing ========================

  public doo(action: Action): AnimationDetails | void {
    if(this.canRedo) this.actionList = this.actionList.slice(0, this.actionPtr); // clear Redo history
    this.actionList[this.actionPtr++] = action;
    action.score = this.getScoreFor(action);
    const animation_details = action.perform() || null;
    this.score += action.score;
    this._on_do_or_undo();
    return animation_details;
  }

  public undo(): void {
    --this.actionPtr;
    const action = this.actionList[this.actionPtr];
    this.score -= action.score;
    action.undo();
    this._on_do_or_undo();
  }

  public redo(): void {
    const action = this.actionList[this.actionPtr];
    ++this.actionPtr;
    this.score += action.score;
    if(action.redo) action.redo();
    else action.perform();
    this._on_do_or_undo();
  }

  private _on_do_or_undo(): void {
    ui.update_score_and_moves(this.score, this.actionPtr);
    this._hints = null;
    this.canUndo = this.actionPtr !== 0;
    this.canRedo = this.actionPtr !== this.actionList.length;
  }

  // Subclasses may override this.
  // Called after each move (unless interrupted by user), it should return an Action or null.  Revealing face-down cards is generally handled elsewhere.
  autoplay(): Action {
    return null;
  }

  // Used to implement .autoplay() for many games.
  protected autoplay_using_predicate(predicate: AutoplayPredicate): Action {
    for(let p of this.hint_and_autoplay_source_piles) {
      let c = p.lastCard;
      if(!c || !predicate(c)) continue;
      let act = this.foundation_action_for(CardSequence.from_card(c));
      if(act) return act;
    }
    return null;
  }

  // Called when right-clicking a card, this should try to return an Action for moving that card to a foundation (if possible), or null otherwise.
  // Subclasses may override this, but typically it's easier to implement .foundation_destination_for() instead.
  public foundation_action_for(cseq: CardSequence): Action {
    const card = cseq.first;
    if(!cseq.source.may_take_card(card)) return null;
    const f = this.foundation_destination_for(cseq);
    return f ? new Move(card, f) : null;
  }

  // Given a CardSequence that has already been determined to be movable, return a foundation pile it can be legally moved to, or null.
  // Subclasses may override this.
  protected foundation_destination_for(cseq: CardSequence): AnyPile {
    // This branch is about putting aces of the same suit together, in games where that's relevant.
    if(this._foundation_clusters && cseq.first.number === 1)
      for(let fs of this._foundation_clusters)
        if(fs.every(f => !f.hasCards || f.cards[0].suit === cseq.first.suit))
          return findEmpty(fs);
    for(let f of this.foundations) if(f.may_add_card_maybe_to_self(cseq.first)) return f;
    return null;
  }

  // Called when a user left-clicks on a card (that has already been determined to be movable).  Should return an Action (or null).
  // Subclasses may override this, but typically it's easier to implement .best_destination_for() instead.
  public best_action_for(cseq: CardSequence): Action {
    if(!cseq.source.may_take_card(cseq.first)) return null;
    const target = this.best_destination_for(cseq);
    return target ? new Move(cseq.first, target) : null;
  }

  // Given a CardSequence, return the preferred legal destination pile to move it to, or null.
  // Subclasses should override this.
  protected best_destination_for(cseq: CardSequence): AnyPile {
    return null;
  }

  // Commonly-useful implementations of .best_destination_for(cseq)

  protected best_destination_for__nearest_legal_pile_preferring_nonempty(cseq: CardSequence): AnyPile {
    const ps = cseq.source.is_pile ? cseq.source.surrounding() : this.piles;
    let maybe: AnyPile = null;
    for(let p of ps) {
      if(!p.may_add_card_maybe_to_self(cseq.first)) continue;
      if(p.cards.length) return p;
      if(!maybe) maybe = p;
    }
    return maybe;
  }

  protected best_destination_for__nearest_legal_pile(cseq: CardSequence): AnyPile {
    const ps = cseq.source.is_pile ? cseq.source.surrounding() : this.piles;
    for(let p of ps) if(p.may_add_card_maybe_to_self(cseq.first)) return p;
    return null;
  }

  protected best_destination_for__nearest_legal_pile_or_cell(cseq: CardSequence): AnyPile {
    const p = this.best_destination_for__nearest_legal_pile(cseq);
    return p || (cseq.first.isLast ? findEmpty(this.cells) : null);;
  }


  // === Hints ============================================
  // Generally nothing here needs overriding by subclasses.

  public hint(): void {
    if(!this._hints) {
      this._hints = this.get_hints();
      this._next_hint_index = 0;
    }
    if(this._hints.length === 0) return;
    const hint = this._hints[this._next_hint_index];
    this._next_hint_index = (this._next_hint_index + 1) % this._hints.length;
    show_hints(hint.hint_source_card, hint.hint_destinations);
  }

  protected get_hints(): Hint[] {
    const rv: Hint[] = [];
    for(let p of this.hint_and_autoplay_source_piles) for(let source of p.hint_sources()) this._add_hints_for(source, rv);
    return rv;
  }

  protected _add_hints_for(card: Card, hints: Hint[]): void {
    const ds: AnyPile[] = [];
    for(let p of this.piles) if((this.show_hints_to_empty_piles || p.hasCards) && p.may_add_card_maybe_to_self(card)) ds.push(p);
    for(let f of this.foundations) if(f.may_add_card_maybe_to_self(card)) ds.push(f);
    if(ds.length) hints.push({ hint_source_card: card, hint_destinations: ds });
  }


  // === Preferred foundations ============================
  // When a game has multiple foundations of the same suit (e.g. Gypsy), it looks nicer if they are grouped together.  Games can opt in to automoves doing such grouping, which works by dividing the foundations into "clusters", and then using the first cluster that is empty or has matching suits.  (This only works so long as the user doesn't move aces to other foundations for themself, but handling that would complicate it significantly.)

  _get_foundation_clusters(cards: Card[], foundations: AnyPile[]): AnyPile[][] {
    if(!this.foundation_cluster_count) return null;
    const cluster_size = this.foundations.length / this.foundation_cluster_count;
    const rv: AnyPile[][] = [];
    for(let i = 0; i < foundations.length; i += cluster_size) rv.push(foundations.slice(i, i + cluster_size));
    return rv;
  }
};



class GameType {
  id: string;
  private game_class: typeof Game;
  private pastGames: Game[];
  private futureGames: Game[];
  public havePastGames: boolean;
  public haveFutureGames: boolean;
  private currentGame: Game;
  private shared_layout: Layout;

  constructor(id: string, game_class: typeof Game) {
    this.id = id;
    this.game_class = game_class;
    this.pastGames = [];
    this.futureGames = [];
    this.havePastGames = false;
    this.haveFutureGames = false;
    this.currentGame = null;
  }

  switchTo(): void {
    if(!this.currentGame) this.newGame();
    else gCurrentGame = this.currentGame;
    gCurrentGame.show();
  }

  switchFrom(): void {
    this.currentGame.hide();
  }

  newGame(cardsOrder?: number[]): void {
    if(this.currentGame) {
      if(this.pastGames.length === 2) this.pastGames.shift();
      this.pastGames.push(this.currentGame);
      this.havePastGames = true;
    }

    if(!this.shared_layout) this.shared_layout = this.game_class.create_layout();
    const game = gCurrentGame = this.currentGame = new this.game_class();
    game.id = this.id;
    game.begin(this.shared_layout, cardsOrder || null);
    game.show();
    const act = game.autoplay();
    if(act) doo(act);
  }

  restart(): void {
    this.newGame(this.currentGame.order_cards_dealt);
  }

  restorePastGame(): void {
    if(!this.havePastGames) return;
    if(this.futureGames.length === 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    gCurrentGame = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    gCurrentGame.show();
  }

  restoreFutureGame(): void {
    if(!this.haveFutureGames) return;
    if(this.pastGames.length === 2) this.pastGames.shift();
    this.pastGames.push(this.currentGame);
    this.havePastGames = true;
    gCurrentGame = this.currentGame = this.futureGames.pop();
    this.haveFutureGames = this.futureGames.length!=0;
    gCurrentGame.show();
  }

  clearFutureGames(): void {
    this.futureGames = [];
    this.haveFutureGames = false;
  }
};
