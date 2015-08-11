// The base-type for all games
const Game = {
  // May be set by subclasses to a description of the card objects they want creating in .classInit()
  required_cards: [1],

  // Once a game is running, this is an array of the all the card objects used by the game.
  allcards: null,

  // Piles in arrays by type, and the first piles of some types
  piles: [],
  foundations: [],
  reserves: [],
  cells: [],
  stock: null,
  waste: null,
  foundation: null,
  reserve: null,
  dragDropTargets: null, // a list of piles on which cards can be dropped

  // A Layout (or subclass) instance.  One instance per game-type (not per game-instance).
  layout: null,

  // A class like Layout (for subclasses to specify), to be used as __proto__ of ._layout
  layoutProto: Layout,

  // Instructions to the code the Layout class on how to create the needed HTML, in a compact string-based DSL.
  layoutTemplate: null,

  // Returns an array giving details of all the piles to be created.
  // Consists of parts in the form:
  //   letter, number, Pile, View, face-down, face-up
  // Where 'letter' corresponds to one used in .layoutTemplate, 'number' is how
  // many of that kind exist, Pile and View are the subtypes of those objects
  // to be used. 'face-down' and 'face-up' give the number of cards to be dealt
  // to the pile, if .deal() isn't replaced. Either a number (applying to all
  // of the piles) or an array of numbers (one per pile) can be used.
  pileDetails: () => [
  /* partial example:
    "s", 1, null, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 1, null, FanDownView, 0, 0,
    "f", 1, KlondikeFoundation, View, 0, 0,
    "c", 1, Cell, View, 0, 0,
    "r", 1, Reserve, View, 0, 0,
  */
  ],

  show: function() {
    // Some other game may have been using the layout, so need to reassociate piles+views
    for(let p of this.allpiles) p.view.attach(p);
    this.layout.show();
    setVisibility(ui.scorePanel, this.hasScoring);
    ui.scoreDisplay.textContent = this.score;
    ui.movesDisplay.textContent = this.actionPtr;
  },

  hide: function() {
    this.layout.hide();
  },

  // This gets called just once per game class, rather than once per game instance.
  classInit: function() {
    this.classInit = null; // to avoid re-calling

    const layout = this.layout = { __proto__: this.layoutProto };
    layout.template = this.layoutTemplate;

    const details = this.pileDetails();
    const eLen = 6; // length of an entry/row in .pileDetails()
    const numletters = details.length / eLen;
    const letters = [], nums = {}, impls = {}, downs = {}, ups = {};
    // get mappings of stuff, grouped by letter used in layout template
    for(var i in irange(numletters)) {
      var l = letters[i] = details[i * eLen];
      nums[l]  = details[i * eLen + 1];
      impls[l] = details[i * eLen + 2];
      layout[l] = details[i * eLen + 3]; // for use in layout.init()
      downs[l] = details[i * eLen + 4];
      ups[l]   = details[i * eLen + 5];
      // turn single numbers for face up/down cards into sequences per-pile
      if(typeof downs[l] === "number") downs[l] = repeat(downs[l], nums[l]);
      else downs[l] = downs[l].slice(); //copy because we later modify it
      if(typeof ups[l] === "number") ups[l] = repeat(ups[l], nums[l]);
      else ups[l] = ups[l].slice();
    }

    // Returns a sequence of the letters from layoutTemplate that referred to
    // views/piles, excluding, e.g., annotations.
    const layoutletters = this.layout.init();

    // Convert to flattened lists, ordered the way the layout was created.
    this._pilesToCreateLetters = layoutletters;
    this._pilesToCreate = [for(l of layoutletters) impls[l]];
    this._cardsToDealDown = [for(l of layoutletters) downs[l].shift()];
    this._cardsToDealUp = [for(l of layoutletters) ups[l].shift()];
  },



  _create_piles: function() {
    const views = this.layout.views;
    const impls = this._pilesToCreate;
    const letters = this._pilesToCreateLetters;
    const all = this.allpiles = [for(impl of impls) createPile(impl)];
    const bytype = {};
    for(var i in all) {
      all[i].view = views[i];
      all[i].view.attach(all[i]);
      var l = letters[i];
      if(!bytype[l]) bytype[l] = [];
      bytype[l].push(all[i]);
    }
    for(let [l, set] in Iterator(bytype)) linkList(set, "prev", "next");
  },

  _create_pile_arrays: function() {
    const all = this.allpiles;
    this.dragDropTargets = [for(f of all) if(f.canDrop) f];
    this.piles = [for(p of all) if(p.isPile) p];
    this.cells = [for(p of all) if(p.isCell) p];
    this.reserves = [for(p of all) if(p.isReserve) p];
    this.foundations = [for(p of all) if(p.isFoundation) p];
    for(let i in this.foundations) this.foundations[i].index = i;
    this.wastes = [for(p of all) if(p.isWaste) p];
    this.waste = this.wastes[0] || null;
    this.foundation = this.foundations[0] || null
    this.reserve = this.reserves[0] || null;
    this.stock = [for(p of all) if(p.isStock) p][0] || null;
  },

  // The actual entry-point to starting a game instance.
  begin: function(optional_order_to_deal) {
    this.actionList = [];
    ui.scoreDisplay.textContent = this.score = 0;
    ui.movesDisplay.textContent = this.actionPtr;
    this._create_piles();
    this._create_pile_arrays();
    if(this.required_cards) this.allcards = makeCards.apply(null, this.required_cards);
    this.init();
    this._foundation_clusters = this._get_foundation_clusters(this.allcards, this.foundations);
    this.allcards.forEach((c, ix) => { if(c) c.__allcards_index = ix; });
    let cs;
    // Storing .order_cards_dealt as an array of indexes rather than cards is necessary for redeals to work properly.  Redeals actually just start a new game with the same deal-order, and the new game instance has its own separate card objects.
    if(optional_order_to_deal) {
      cs = [for(ix of optional_order_to_deal) this.allcards[ix] || null];
      this.order_cards_dealt = optional_order_to_deal;
    } else {
      cs = this.allcards.slice();
      do { shuffle_in_place(cs) } while(this.is_shuffle_impossible(cs));
      this.order_cards_dealt = [for(c of cs) c ? c.__allcards_index : null];
    }
    this.deal(cs);
  },

  // For subclasses to optionally implement.  Called for each new game instance.  Typically used to set up .allcards (if it's something .required_cards can't handle), or to add extra properties to piles.
  init: function() {},

  // Deal the provided pre-shuffled cards for a new game.  Many subclasses will find this version sufficient.
  deal: function(cards) {
    const ps = this.allpiles, down = this._cardsToDealDown, up = this._cardsToDealUp;
    let ix = 0;
    for(let [i, p] in Iterator(ps)) ix = this._deal_cards(cards, ix, p, down[i], up[i]);
    if(ix < cards.length) ix = this._deal_cards(cards, ix, this.stock, cards.length, 0);
  },

  // Used in implementing .deal().  It's intentionally tolerant of being asked to deal too many cards, because that makes it easier to specify game layouts (several games have their final pile have fewer cards in it than the others).
  _deal_cards: function(cards, ix, pile, num_face_down, num_face_up) {
    const cs = cards.slice(ix, ix + num_face_down + num_face_up);
    for(let i = num_face_down; i < cs.length; ++i) cs[i].faceUp = true;
    pile.addCardsFromArray(cs);
    return ix + cs.length;
  },

  // For Montana and Maze
  _deal_cards_with_nulls_for_spaces: function(cards) {
    for(let [i, c] in Iterator(cards)) if(c) {
      c.faceUp = true;
      this.piles[i].addCardsFromArray([c]);
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

  // score for each card revealed.  doo() handles the revealing of cards
  scoreForRevealing: 0,



  // === Move tracking and Undoing ========================

  actionList: [],
  actionPtr: 0,
  canUndo: false,
  canRedo: false,

  doo: function(action) {
    if(this.canRedo) this.actionList = this.actionList.slice(0, this.actionPtr); // clear Redo history
    this.actionList[this.actionPtr++] = action;
    this.canUndo = true;
    this.canRedo = false;
    action.score = this.getScoreFor(action);
    this.hintsReady = false;

    const animation_details = action.perform() || null;

    const act = action;
    const pile = action.pileWhichMayNeedCardsRevealing || null;
    this._lastActionSourcePile = pile;
    const cs = act.revealedCards = pile ? this.getCardsToReveal(pile) : [];
    for(let c of cs) c.setFaceUp(true);
    act.score += cs.length * this.scoreForRevealing;
    ui.scoreDisplay.textContent = this.score += act.score;
    ui.movesDisplay.textContent = this.actionPtr;

    return animation_details;
  },

  // overridden by TriPeaks
  getCardsToReveal: function(pile) {
    const card = pile ? pile.lastCard : null;
    return card && !card.faceUp ? [card] : [];
  },

  undo: function() {
    const ptr = --this.actionPtr;
    const action = this.actionList[ptr];
    this.canRedo = true;
    this.canUndo = ptr !== 0;

    ui.scoreDisplay.textContent = (this.score -= action.score);
    ui.movesDisplay.textContent = this.actionPtr;
    this.hintsReady = false;

    action.undo();
    const cs = action.revealedCards || [];
    for(let c of cs) c.setFaceUp(false);
  },

  redo: function() {
    const acts = this.actionList;
    const action = acts[this.actionPtr];
    const ptr = ++this.actionPtr;
    this.canUndo = true;
    this.canRedo = acts.length > ptr;

    ui.scoreDisplay.textContent = (this.score += action.score);
    ui.movesDisplay.textContent = this.actionPtr;
    this.hintsReady = false;

    if(action.redo) action.redo();
    else action.perform();
    const cs = action.revealedCards;
    for(let c of cs) c.setFaceUp(true);
  },

  // Subclasses may override this.
  // Called after each move (unless interrupted by user), it should return an Action or null.  Revealing face-down cards is generally handled elsewhere.
  autoplay: function() {
    return null;
  },

  // Called when right-clicking a card, this should try to return an Action for moving that card to a foundation (if possible), or null otherwise.
  // Subclasses may override this, but typically it's easier to implement .getFoundationDestinationFor() instead.
  getFoundationMoveFor: function(card) {
    if(!card.mayTake) return null;
    const f = this.getFoundationDestinationFor(card);
    return f ? new Move(card, f) : null;
  },

  // Given a card (that has already been determined to be movable), return a foundation pile it can be legally moved to, or null.
  // Subclasses may override this.
  getFoundationDestinationFor: function(card) {
    for(let f of this.foundations) if(f.mayAddCard(card)) return f;
    return null;
  },

  // Called when a user left-clicks on a card (that has already been determined to be movable).  Should return an Action (or null).
  // Subclasses may override this, but typically it's easier to implement .best_destination_for() instead.
  getBestActionFor: function(card) {
    if(!card.mayTake) return null;
    const target = this.best_destination_for(card);
    return target ? new Move(card, target) : null;
  },

  // Given a card, return the preferred legal destination pile to move it to, or null.
  // Subclasses should override this.
  best_destination_for: function(card) {
    return null;
  },



  // === Hints ============================================
  // Generally nothing here needs overriding by subclasses, except perhaps .hintOriginPileCollections()

  hintSources: [],
  hintDestinations: [], // destination *array* (of Piles) per hintSources element
  hintsReady: false, // means hints have been calculated, though there may not be any.
  hintNum: 0,

  hint: function() {
    if(!this.hintsReady) {
      this.hintSources = [];
      this.hintDestinations = [];
      this.hintNum = 0;
      this.getHints();
      this.hintsReady = true;
    }

    if(this.hintSources.length === 0) return;
    const num = this.hintNum++; // must *post*-increment
    if(this.hintNum === this.hintSources.length) this.hintNum = 0;
    showHints(this.hintSources[num], this.hintDestinations[num]);
  },

  // Can be overridden e.g. to show hints from foundations
  hintOriginPileCollections: function() {
    return [this.reserves, this.cells, this.wastes, this.piles];
  },

  getHints: function() {
    const collections = this.hintOriginPileCollections();
    for(let ps of collections)
      for(let p of ps)
        for(let source of p.getHintSources())
          this.addHintsFor(source);
  },

  addHintsFor: function(card) {
    const ds = [];
    // Note: we skip moves to empty piles, because such hints are ugly/annoying/pointless
    for(let p of this.piles) if(p.hasCards && p.mayAddCard(card)) ds.push(p);
    for(let f of this.foundations) if(f.mayAddCard(card)) ds.push(f);
    if(ds.length) this.addHints(card, ds);
  },

  addHints: function(card, destinations) {
    this.hintSources.push(card);
    this.hintDestinations.push(destinations);
  },



  // === Preferred foundations ============================
  // When a game has multiple foundations of the same suit (e.g. Gypsy), it looks nicer if they are grouped together.  Games can opt in to automoves doing such grouping, which works by dividing the foundations into "clusters", and then using the first cluster that is empty or has matching suits.  (This only works so long as the user doesn't move aces to other foundations for themself, but handling that would complicate it significantly.)

  // To use this feature, subclasses should set this to the number of suits in use.  (It's opt-in because of edge-cases like Mod3 that don't want it.)
  foundation_cluster_count: null,

  // xxx integrate this with .getFoundationMoveFor()
  getFoundationForAce: function(card) {
    if(!this._foundation_clusters) return findEmpty(this.foundations);
    for(let fs of this._foundation_clusters) if(fs.every(f => !f.hasCards || f.cards[0].suit === card.suit)) return findEmpty(fs);
    return findEmpty(this.foundations);
  },

  _get_foundation_clusters: function(cards, foundations) {
    if(!this.foundation_cluster_count) return null;
    const cluster_size = this.foundations.length / this.foundation_cluster_count;
    const rv = [];
    for(let i = 0; i < foundations.length; i += cluster_size) rv.push(foundations.slice(i, i + cluster_size));
    return rv;
  },
};



function GameType(id, proto) {
  this.id = id;
  proto.id = id; // main.js still uses this
  this.instanceProto = proto;
  this.pastGames = [];
  this.futureGames = [];
}
GameType.prototype = {
  instanceProto: null,
  pastGames: [],
  havePastGames: false,
  currentGame: null,
  futureGames: [],
  haveFutureGames: false,

  switchTo: function() {
    if(!this.currentGame) this.newGame();
    else gCurrentGame = this.currentGame;
    gCurrentGame.show();
  },

  switchFrom: function() {
    this.currentGame.hide();
  },

  newGame: function(cardsOrder) {
    if(this.currentGame) {
      if(this.pastGames.length === 2) this.pastGames.shift();
      this.pastGames.push(this.currentGame);
      this.havePastGames = true;
    }

    if(this.instanceProto.classInit) this.instanceProto.classInit();
    gCurrentGame = this.currentGame = { __proto__: this.instanceProto };
    gCurrentGame.begin(cardsOrder || null);
    const act = gCurrentGame.autoplay();
    if(act) doo(act);
  },

  restart: function() {
    this.newGame(this.currentGame.order_cards_dealt);
  },

  restorePastGame: function() {
    if(!this.havePastGames) return;
    if(this.futureGames.length === 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    gCurrentGame = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    gCurrentGame.show();
  },

  restoreFutureGame: function() {
    if(!this.haveFutureGames) return;
    if(this.pastGames.length === 2) this.pastGames.shift();
    this.pastGames.push(this.currentGame);
    this.havePastGames = true;
    gCurrentGame = this.currentGame = this.futureGames.pop();
    this.haveFutureGames = this.futureGames.length!=0;
    gCurrentGame.show();
  },

  clearFutureGames: function() {
    this.futureGames = [];
    this.haveFutureGames = false;
  }
}
