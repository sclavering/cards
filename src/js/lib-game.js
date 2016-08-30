// The base-type for all games
const Game = {
  init_cards: () => make_cards(1),

  // Once a game is running, this is an array of the all the card objects used by the game.
  allcards: null,

  // Piles in arrays by type, and the first piles of some types
  piles: [],
  foundations: [],
  reserves: [],
  cells: [],
  stocks: [],
  stock: null,
  wastes: [],
  waste: null,
  foundation: null,
  reserve: null,
  dragDropTargets: null, // a list of piles on which cards can be dropped

  // A Layout (or subclass) instance.  The actual instance is shared with other games of the same type.
  layout: null,

  // All subclasses must implement this and have it return a Layout instance.  It's called on the "class" itself, not the instance.
  static_create_layout() {
    throw new Error("not implemented");
  },

  // Subclasses must implement this, which describes the piles to create.  It returns a mapping of:
  //    pile_kind (string) -> tuple of [
  //        num_piles_of_kind : int,
  //        PileClass : class,
  //        num_to_deal_face_down : int | int[],
  //        num_to_deal_face_up : int | int[],
  //    ]
  // e.g.:
  //     pile_details: () => ({
  //       stocks: [1, StockDeal3OrRefill, 0, 0],
  //       wastes: [1, Waste, 0, 0],
  //       piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
  //       foundations: [4, KlondikeFoundation, 0, 0],
  //     }),
  // The keys usually refer to an existing AnyPile-array collections in Game, but *can* be custom ones.  The first letter of the key is used to match AnyPile objects to their View in the Layout.
  pile_details: () => ({
  }),

  show: function() {
    this.layout.attach_piles_to_views(this.pile_arrays_by_letter);
    this.layout.show();
    setVisibility(ui.scorePanel, this.hasScoring);
    ui.scoreDisplay.textContent = this.score;
    ui.movesDisplay.textContent = this.actionPtr;
  },

  hide: function() {
    this.layout.hide();
  },

  _create_piles: function() {
    const details = this.pile_details();
    this.all_piles = [];
    this.pile_arrays_by_letter = {};
    for(let k in details) {
      let [num, PileClass, face_down, face_up] = details[k];
      let collection = this[k] = this.pile_arrays_by_letter[k[0]] = [];
      for(let i = 0; i !== num; ++i) {
        let p = new PileClass();
        p.owning_game = this;
        p.num_to_deal_face_down = face_down instanceof Array ? face_down[i] : face_down;
        p.num_to_deal_face_up = face_up instanceof Array ? face_up[i] : face_up;
        collection.push(p);
        this.all_piles.push(p);
      }
      linkList(collection, "prev", "next");
    }

    this.dragDropTargets = this.all_piles.filter(p => p.is_drop_target);
    for(let i in this.foundations) this.foundations[i].index = i;
    this.waste = this.wastes[0] || null;
    this.foundation = this.foundations[0] || null
    this.reserve = this.reserves[0] || null;
    this.stock = this.stocks[0] || null;
    this.hint_and_autoplay_source_piles = [].concat(this.reserves, this.cells, this.wastes, this.piles);
  },

  // The actual entry-point to starting a game instance.
  begin: function(shared_layout, optional_order_to_deal) {
    this.layout = shared_layout;

    this.actionList = [];
    ui.scoreDisplay.textContent = this.score = 0;
    ui.movesDisplay.textContent = this.actionPtr;
    this._create_piles();
    if(this.init_cards) this.allcards = this.init_cards();
    this.init();
    this._foundation_clusters = this._get_foundation_clusters(this.allcards, this.foundations);
    this.allcards.forEach((c, ix) => { if(c) c.__allcards_index = ix; });
    let cs;
    // Storing .order_cards_dealt as an array of indexes rather than cards is necessary for "Restart" to work properly (since it works by starting a new game with the same deal-order, and the new game instance has its own separate card objects).
    if(optional_order_to_deal) {
      cs = optional_order_to_deal.map(ix => this.allcards[ix] || null);
      this.order_cards_dealt = optional_order_to_deal;
    } else {
      cs = this.allcards.slice();
      do { shuffle_in_place(cs) } while(this.is_shuffle_impossible(cs));
      this.order_cards_dealt = cs.map(c => c ? c.__allcards_index : null);
    }
    this.deal(cs);
  },

  // For subclasses to optionally implement.  Called for each new game instance.  Typically used to add extra properties to piles.
  init: function() {},

  // Deal the provided pre-shuffled cards for a new game.  Many subclasses will find this version sufficient.
  deal: function(cards) {
    let ix = 0;
    for(let p of this.all_piles) ix = this._deal_cards(cards, ix, p, p.num_to_deal_face_down, p.num_to_deal_face_up);
    if(ix < cards.length) ix = this._deal_cards(cards, ix, this.stock, cards.length, 0);
  },

  // Used in implementing .deal().  It's intentionally tolerant of being asked to deal too many cards, because that makes it easier to specify game layouts (several games have their final pile have fewer cards in it than the others).
  _deal_cards: function(cards, ix, pile, num_face_down, num_face_up) {
    const cs = cards.slice(ix, ix + num_face_down + num_face_up);
    for(let i = num_face_down; i < cs.length; ++i) cs[i].faceUp = true;
    pile.add_cards_from_array(cs, true);
    return ix + cs.length;
  },

  _deal_cards_with_nulls_for_spaces: function(cards) {
    for(let [i, c] of cards.entries()) if(c) {
      c.faceUp = true;
      this.piles[i].add_cards_from_array([c], true);
    }
  },

  // Subclasses may override this to prevent (some) impossible games from being dealt. Cards will be shuffled repeatedly until this returns false.
  is_shuffle_impossible: function(shuffledCards) {
    return false;
  },



  // === Winning ==========================================

  // Most subclasses will find this sufficient.
  is_won: function() {
    const expected_foundation_length = this.allcards.length / this.foundations.length;
    for(let f of this.foundations) if(f.cards.length !== expected_foundation_length) return false;
    return true;
  },



  // === Scoring ==========================================

  // Should not be directly set in subclasses.  Code that does set it should also adjust ui.scoreDisplay.textContent
  score: 0,

  // Subclasses should set this true if desired.
  hasScoring: false,

  getScoreFor: function(action) {
    return 0;
  },



  // === Move tracking and Undoing ========================

  actionList: [],
  actionPtr: 0,
  canUndo: false,
  canRedo: false,

  doo: function(action) {
    if(this.canRedo) this.actionList = this.actionList.slice(0, this.actionPtr); // clear Redo history
    this.actionList[this.actionPtr++] = action;
    action.score = this.getScoreFor(action);
    const animation_details = action.perform() || null;
    this.score += action.score;
    this._on_do_or_undo();
    return animation_details;
  },

  undo: function() {
    --this.actionPtr;
    const action = this.actionList[this.actionPtr];
    this.score -= action.score;
    action.undo();
    this._on_do_or_undo();
  },

  redo: function() {
    const action = this.actionList[this.actionPtr];
    ++this.actionPtr;
    this.score += action.score;
    if(action.redo) action.redo();
    else action.perform();
    this._on_do_or_undo();
  },

  _on_do_or_undo: function() {
    ui.scoreDisplay.textContent = this.score;
    ui.movesDisplay.textContent = this.actionPtr;
    this._hints = null;
    this.canUndo = this.actionPtr !== 0;
    this.canRedo = this.actionPtr !== this.actionList.length;
  },

  // Subclasses may override this.
  // Called after each move (unless interrupted by user), it should return an Action or null.  Revealing face-down cards is generally handled elsewhere.
  autoplay: function() {
    return null;
  },

  // Used by autoplay_default.  It should return a (Card -> boolean) function saying whether the passed card is currently suitable for autoplaying.
  autoplayable_predicate: function() {
    throw "not implemented";
  },

  // Called when right-clicking a card, this should try to return an Action for moving that card to a foundation (if possible), or null otherwise.
  // Subclasses may override this, but typically it's easier to implement .foundation_destination_for() instead.
  foundation_action_for: function(cseq) {
    const card = cseq.first;
    if(!cseq.source.may_take_card(card)) return null;
    const f = this.foundation_destination_for(cseq);
    return f ? new Move(card, f) : null;
  },

  // Given a CardSequence that has already been determined to be movable, return a foundation pile it can be legally moved to, or null.
  // Subclasses may override this.
  foundation_destination_for: function(cseq) {
    // This branch is about putting aces of the same suit together, in games where that's relevant.
    if(this._foundation_clusters && cseq.first.number === 1)
      for(let fs of this._foundation_clusters)
        if(fs.every(f => !f.hasCards || f.cards[0].suit === cseq.first.suit))
          return findEmpty(fs);
    for(let f of this.foundations) if(f.may_add_card_maybe_to_self(cseq.first)) return f;
    return null;
  },

  // Called when a user left-clicks on a card (that has already been determined to be movable).  Should return an Action (or null).
  // Subclasses may override this, but typically it's easier to implement .best_destination_for() instead.
  best_action_for: function(cseq) {
    if(!cseq.source.may_take_card(cseq.first)) return null;
    const target = this.best_destination_for(cseq);
    return target ? new Move(cseq.first, target) : null;
  },

  // Given a CardSequence, return the preferred legal destination pile to move it to, or null.
  // Subclasses should override this.
  best_destination_for: function(cseq) {
    return null;
  },



  // === Hints ============================================
  // Generally nothing here needs overriding by subclasses.

  _hints: null, // Array of { hint_source_card: Card, hint_destinations: [Pile] } structs, or null.
  _next_hint_index: 0,

  hint: function() {
    if(!this._hints) {
      this._hints = this.get_hints();
      this._next_hint_index = 0;
    }
    if(this._hints.length === 0) return;
    const hint = this._hints[this._next_hint_index];
    this._next_hint_index = (this._next_hint_index + 1) % this._hints.length;
    show_hints(hint.hint_source_card, hint.hint_destinations);
  },

  get_hints: function() {
    const rv = [];
    for(let p of this.hint_and_autoplay_source_piles) for(let source of p.hint_sources()) this._add_hints_for(source, rv);
    return rv;
  },

  _add_hints_for: function(card, hints) {
    const ds = [];
    for(let p of this.piles) if((this.show_hints_to_empty_piles || p.hasCards) && p.may_add_card_maybe_to_self(card)) ds.push(p);
    for(let f of this.foundations) if(f.may_add_card_maybe_to_self(card)) ds.push(f);
    if(ds.length) hints.push({ hint_source_card: card, hint_destinations: ds });
  },

  // In most games, a hint where the destination is an empty pile is not worth showing (because it's obvious that the move is possible, and it gets in the way of showing more interesting hints).
  show_hints_to_empty_piles: false,



  // === Preferred foundations ============================
  // When a game has multiple foundations of the same suit (e.g. Gypsy), it looks nicer if they are grouped together.  Games can opt in to automoves doing such grouping, which works by dividing the foundations into "clusters", and then using the first cluster that is empty or has matching suits.  (This only works so long as the user doesn't move aces to other foundations for themself, but handling that would complicate it significantly.)

  // To use this feature, subclasses should set this to the number of suits in use.  (It's opt-in because of edge-cases like Mod3 that don't want it.)
  foundation_cluster_count: null,

  _get_foundation_clusters: function(cards, foundations) {
    if(!this.foundation_cluster_count) return null;
    const cluster_size = this.foundations.length / this.foundation_cluster_count;
    const rv = [];
    for(let i = 0; i < foundations.length; i += cluster_size) rv.push(foundations.slice(i, i + cluster_size));
    return rv;
  },
};



class GameType {
  constructor(id, proto) {
    this.id = id;
    proto.id = id; // main.js still uses this
    this.instanceProto = proto;
    this.pastGames = [];
    this.futureGames = [];
    this.havePastGames = false;
    this.haveFutureGames = false;
    this.currentGame = null;
  }

  switchTo() {
    if(!this.currentGame) this.newGame();
    else gCurrentGame = this.currentGame;
    gCurrentGame.show();
  }

  switchFrom() {
    this.currentGame.hide();
  }

  newGame(cardsOrder) {
    if(this.currentGame) {
      if(this.pastGames.length === 2) this.pastGames.shift();
      this.pastGames.push(this.currentGame);
      this.havePastGames = true;
    }

    if(!this.shared_layout) this.shared_layout = this.instanceProto.static_create_layout();
    const game = gCurrentGame = this.currentGame = { __proto__: this.instanceProto };
    game.begin(this.shared_layout, cardsOrder || null);
    game.show();
    const act = game.autoplay();
    if(act) doo(act);
  }

  restart() {
    this.newGame(this.currentGame.order_cards_dealt);
  }

  restorePastGame() {
    if(!this.havePastGames) return;
    if(this.futureGames.length === 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    gCurrentGame = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    gCurrentGame.show();
  }

  restoreFutureGame() {
    if(!this.haveFutureGames) return;
    if(this.pastGames.length === 2) this.pastGames.shift();
    this.pastGames.push(this.currentGame);
    this.havePastGames = true;
    gCurrentGame = this.currentGame = this.futureGames.pop();
    this.haveFutureGames = this.futureGames.length!=0;
    gCurrentGame.show();
  }

  clearFutureGames() {
    this.futureGames = [];
    this.haveFutureGames = false;
  }
};
