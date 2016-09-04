interface Hint {
  hint_source: CardSequence;
  hint_destinations: AnyPile[];
}
interface PileClassConstructor {
  new(): AnyPile;
}

type AutoplayPredicate = (cseq: CardSequence) => boolean;


// The base-type for all games
class Game {
  public id: string;
  public helpId: string;

  // A Layout (or subclass) instance.  The actual instance is shared with other games of the same type.
  layout: Layout;

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
  protected pile_details: {
    [pile_collection_name: string]: [number, PileClassConstructor, number | number[], number | number[]];
  };

  // Once a game is running, this is an array of the all the card objects used by the game.
  // Subclasses should set this in their constructor.
  all_cards: Card[];

  // Part of the preferred-foundation system feature.  Subclasses may set it to the number of suits to use to opt in.  (It's opt-in because of edge cases like Mod3).
  foundation_cluster_count: number;

  // In most games, a hint where the destination is an empty pile is not worth showing (because it's obvious that the move is possible, and it gets in the way of showing more interesting hints).
  protected show_hints_to_empty_piles: boolean;

  // Subclasses should set this if desired.
  protected hasScoring: boolean;

  // Should not be directly set in subclasses.
  score: number;

  // Piles in arrays by type, and the first piles of some such types.
  public piles: AnyPile[];
  public cells: AnyPile[];
  public foundations: AnyPile[];
  public foundation: AnyPile;
  public reserves: AnyPile[];
  public reserve: AnyPile;
  public stocks: Stock[];
  public stock: Stock;
  public wastes: Waste[];
  public waste: Waste;

  all_piles: AnyPile[];
  hint_and_autoplay_source_piles: AnyPile[];

  private _pile_arrays_by_letter: { [key: string]: AnyPile[] };
  private _foundation_clusters: AnyPile[][];

  // Undo/Redo state
  protected actionList: Action[];
  protected actionPtr: number;
  public canUndo: boolean;
  public canRedo: boolean;

  // Hint state
  private _hints: Hint[];
  private _next_hint_index: number;

  public order_cards_dealt: number[];


  static create_layout(): Layout {
    throw new Error("not implemented");
  }

  constructor() {
    this.pile_details = null;
    this.all_cards = null;
    this.foundation_cluster_count = null;
    this.show_hints_to_empty_piles = false;
    this.hasScoring = false;
    this.score = 0;

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

    this.actionList = [];
    this.actionPtr = 0;
    this.canUndo = false;
    this.canRedo = false;

    this._hints = null;
    this._next_hint_index = 0;

    this.helpId = null;

    this.layout = null;
  }

  show(): void {
    this.layout.attach_game(this, this._pile_arrays_by_letter);
    this.layout.show();
    ui.set_score_visibility(this.hasScoring);
    ui.update_score_and_moves(this.score, this.actionPtr);
  }

  hide(): void {
    this.layout.hide();
  }

  private _create_piles(): void {
    const details = this.pile_details;
    this.all_piles = [];
    this._pile_arrays_by_letter = {};
    for(let k in details) {
      let [num, PileClass, face_down, face_up] = details[k];
      let collection: AnyPile[] = this._pile_arrays_by_letter[k[0]] = [];
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
  protected init(): void {
  }

  // Deal the provided pre-shuffled cards for a new game.  Many subclasses will find this version sufficient.
  protected deal(cards: Card[]): void {
    let ix = 0;
    for(let p of this.all_piles) ix = this.deal_cards(cards, ix, p, p.num_to_deal_face_down, p.num_to_deal_face_up);
    if(ix < cards.length) ix = this.deal_cards(cards, ix, this.stock, cards.length, 0);
  }

  // Used in implementing .deal().  It's intentionally tolerant of being asked to deal too many cards, because that makes it easier to specify game layouts (several games have their final pile have fewer cards in it than the others).
  protected deal_cards(cards: Card[], ix: number, pile: AnyPile, num_face_down: number, num_face_up: number): number {
    const cs = cards.slice(ix, ix + num_face_down + num_face_up);
    for(let i = num_face_down; i < cs.length; ++i) cs[i].faceUp = true;
    pile.add_cards_from_array(cs, true);
    return ix + cs.length;
  }

  protected deal_cards_with_nulls_for_spaces(cards: Card[]): void {
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
  is_won(): boolean {
    const expected_foundation_length = this.all_cards.length / this.foundations.length;
    for(let f of this.foundations) if(f.cards.length !== expected_foundation_length) return false;
    return true;
  }


  // === Scoring ==========================================

  protected getScoreFor(action: Action): number {
    return 0;
  }


  // === Move tracking and Undoing ========================

  doo(action: Action): AnimationDetails | void {
    if(this.canRedo) this.actionList = this.actionList.slice(0, this.actionPtr); // clear Redo history
    this.actionList[this.actionPtr++] = action;
    action.score = this.getScoreFor(action);
    const animation_details = action.perform() || null;
    this.score += action.score;
    this._on_do_or_undo();
    return animation_details;
  }

  undo(): void {
    --this.actionPtr;
    const action = this.actionList[this.actionPtr];
    this.score -= action.score;
    action.undo();
    this._on_do_or_undo();
  }

  redo(): void {
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
      let cseq = p.cseq_at_negative(-1);
      if(!cseq || !predicate(cseq)) continue;
      let act = this.foundation_action_for(cseq);
      if(act) return act;
    }
    return null;
  }

  // Called when right-clicking a card, this should try to return an Action for moving that card to a foundation (if possible), or null otherwise.
  // Subclasses may override this, but typically it's easier to implement .foundation_destination_for() instead.
  foundation_action_for(cseq: CardSequence): Action {
    const card = cseq.first;
    if(!cseq.source.may_take(cseq)) return null;
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
    for(let f of this.foundations) if(f.may_add_maybe_from_self(cseq)) return f;
    return null;
  }

  // Called when a user left-clicks on a card (that has already been determined to be movable).  Should return an Action (or null).
  // Subclasses may override this, but typically it's easier to implement .best_destination_for() instead.
  best_action_for(cseq: CardSequence): Action {
    if(!cseq.source.may_take(cseq)) return null;
    const target = this.best_destination_for(cseq);
    return target ? new Move(cseq.first, target) : null;
  }

  // Given a CardSequence, return the preferred legal destination pile to move it to, or null.
  // Subclasses should override this.
  protected best_destination_for(cseq: CardSequence): AnyPile {
    return null;
  }

  // Commonly-useful implementations of .best_destination_for(cseq)


  protected best_destination_for__nearest_legal_using_ranking(cseq: CardSequence, ranking_func: (p: AnyPile) => 0 | 1 | 2): AnyPile {
    let maybe: [AnyPile, AnyPile] = [null, null];
    const ps = cseq.source instanceof Pile ? cseq.source.surrounding() : this.piles;
    for(let p of ps) {
      if(!p.may_add_maybe_from_self(cseq)) continue;
      let rank = ranking_func(p);
      if(rank === 2) return p;
      if(!maybe[rank]) maybe[rank] = p;
    }
    return maybe[1] || maybe[0];
  }

  protected best_destination_for__nearest_legal_pile_preferring_nonempty(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_using_ranking(cseq, p => p.hasCards ? 2 : 0);
  }

  protected best_destination_for__nearest_legal_pile(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_using_ranking(cseq, _ => 2);
  }

  protected best_destination_for__nearest_legal_pile_or_cell(cseq: CardSequence): AnyPile {
    const p = this.best_destination_for__nearest_legal_pile(cseq);
    return p || (cseq.is_single ? findEmpty(this.cells) : null);
  }


  // === Hints ============================================
  // Generally nothing here needs overriding by subclasses.

  hint(): void {
    if(!this._hints) {
      this._hints = this.get_hints();
      this._next_hint_index = 0;
    }
    if(this._hints.length === 0) return;
    const hint = this._hints[this._next_hint_index];
    this._next_hint_index = (this._next_hint_index + 1) % this._hints.length;
    show_hints(hint.hint_source, hint.hint_destinations);
  }

  protected get_hints(): Hint[] {
    const rv: Hint[] = [];
    for(let p of this.hint_and_autoplay_source_piles) for(let cseq of p.hint_sources()) this._add_hints_for(cseq, rv);
    return rv;
  }

  private _add_hints_for(cseq: CardSequence, hints: Hint[]): void {
    const ds: AnyPile[] = [];
    for(let p of this.piles) if((this.show_hints_to_empty_piles || p.hasCards) && p.may_add_maybe_from_self(cseq)) ds.push(p);
    for(let f of this.foundations) if(f.may_add_maybe_from_self(cseq)) ds.push(f);
    if(ds.length) hints.push({ hint_source: cseq, hint_destinations: ds });
  }


  // === Preferred foundations ============================
  // When a game has multiple foundations of the same suit (e.g. Gypsy), it looks nicer if they are grouped together.  Games can opt in to automoves doing such grouping, which works by dividing the foundations into "clusters", and then using the first cluster that is empty or has matching suits.  (This only works so long as the user doesn't move aces to other foundations for themself, but handling that would complicate it significantly.)

  private _get_foundation_clusters(cards: Card[], foundations: AnyPile[]): AnyPile[][] {
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
