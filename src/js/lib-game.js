// The base-type for all games
const Game = {
  // An Card objects used in this game.
  // Passed as arguments to makeCards() if non-null.
  allcards: [1],

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

  // a Layout object, based on those in lib-layouts.js
  layout: null,

  // Instructions to the code in lib-layout.js on how to create the needed HTML
  layoutTemplate: null,

  // An array giving details of all the piles to be created.  Consists of parts
  // in the form:
  //   letter, number, Pile, View, face-down, face-up
  // Where 'letter' corresponds to one used in .layoutTemplate, 'number' is how
  // many of that kind exist, Pile and View are the subtypes of those objects
  // to be used. 'face-down' and 'face-up' give the number of cards to be dealt
  // to the pile, if .deal() isn't replaced. Either a number (applying to all
  // of the piles) or an array of numbers (one per pile) can be used.
  pileDetails: [
  /* partial example:
    "s", 1, null, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 1, null, FanDownView, 0, 0,
    "f", 1, KlondikeFoundation, View, 0, 0,
    "c", 1, Cell, View, 0, 0,
    "r", 1, Reserve, View, 0, 0,
  */
  ],


  // ======================================================
  // The following is a mix of initialisation for the "class" (not that JS
  // really has classes) and the instance games.  It's a legacy from when
  // the two object were the same (don't ask).

  // For games to override.  Called for each new instance
  init: function() {},

  show: function() {
    // some other game may have been using the layout, so need to reassociate piles+views
    const all = this.allpiles, num = all.length;
    for(var i = 0; i != num; ++i) all[i].view.displayPile(all[i]);
    this.layout.show();
    if(this.getHints) ui.btnHint.removeAttribute("disabled");
    else ui.btnHint.setAttribute("disabled","true");
    setVisibility(ui.scorePanel, this.hasScoring);
    ui.scoreDisplay.textContent = this.score;
    ui.movesDisplay.textContent = this.actionPtr;
  },

  hide: function() {
    this.layout.hide();
  },


  classInit: function() {
    this.classInit = null; // to avoid re-calling

    if(!this.layout) this.layout = { __proto__: Layout };
    const layout = this.layout
    layout.template = this.layoutTemplate;

    const details = this.pileDetails;
    const eLen = 6; // length of an entry/row in .pileDetails
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
      if(typeof downs[l] == "number") downs[l] = repeat(downs[l], nums[l]);
      else downs[l] = downs[l].slice(); //copy because we later modify it
      if(typeof ups[l] == "number") ups[l] = repeat(ups[l], nums[l]);
      else ups[l] = ups[l].slice();
    }

    // Returns a sequence of the letters from layoutTemplate that referred to
    // views/piles, excluding, e.g., annotations.
    const layoutletters = this.layout.init();

    // Convert to flattened lists, ordered the way the layout was created.
    this._pilesToCreateLetters = layoutletters;
    this._pilesToCreate = [impls[l] for each(l in layoutletters)];
    this._cardsToDealDown = [downs[l].shift() for each(l in layoutletters)];
    this._cardsToDealUp = [ups[l].shift() for each(l in layoutletters)];
  },

  createPiles: function() {
    const views = this.layout.views;
    const impls = this._pilesToCreate;
    const letters = this._pilesToCreateLetters;
    const all = this.allpiles = [createPile(impl) for each(impl in impls)];
    const bytype = {};
    for(var i in all) {
      all[i].view = views[i];
      all[i].view.displayPile(all[i]);
      var l = letters[i];
      if(!bytype[l]) bytype[l] = [];
      bytype[l].push(all[i]);
    }
    for(let [l, set] in Iterator(bytype)) {
      for(let i = 0; i != set.length; ++i) set[i].p_name = l + i;
      linkList(set, "prev", "next");
    }
  },

  createPileArrays: function() {
    const all = this.allpiles;
    this.dragDropTargets = [f for each(f in all) if(f.canDrop)];
    this.piles = [p for each(p in all) if(p.isPile)];
    this.cells = [p for each(p in all) if(p.isCell)];
    this.reserves = [p for each(p in all) if(p.isReserve)];
    this.foundations = [p for each(p in all) if(p.isFoundation)];
    for(i in this.foundations) this.foundations[i].index = i;
    this.wastes = [p for each(p in all) if(p.isWaste)];
    this.waste = this.wastes[0] || null;
    this.foundation = this.foundations[0] || null
    this.reserve = this.reserves[0] || null;
    this.stock = [p for each(p in all) if(p.isStock)][0] || null;
  },



  // === Start Game =======================================
  // Games should override deal(), and shuffleImpossible() if they need to

  // 'order' is used to "restart" games - by starting a new one with the same
  // shuffled cards.  If not null, it's a permutation of indices
  begin: function(order) {
    this.actionList = [];
    ui.scoreDisplay.textContent = this.score = 0;
    ui.movesDisplay.textContent = this.actionPtr;
    this.createPiles();
    this.createPileArrays();
    this.loadPreferredFoundationSuits();
    if(this.allcards) this.allcards = makeCards.apply(null, this.allcards);
    this.init();
    this.orderCardsDealt = order || this._getDealOrder();
    this.deal([this.allcards[ix] for each(ix in this.orderCardsDealt)]);
  },

  _getDealOrder: function() {
    const ixs = range(this.allcards.length);
    var order, cards;
    do {
      order = shuffle(ixs);
      cards = [this.allcards[ix] for each(ix in order)];
    } while(this.shuffleImpossible(cards));
    return order;
  },

  // overriding versions should deal out the provided shuffled cards for a new game.
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

  // Cards will be shuffled repeatedly until this returns false.
  // Override to eliminate (some) impossible deals.
  shuffleImpossible: function(shuffledCards) {
    return false;
  },



  // === Winning ==========================================

  // This version works for most games.
  is_won: function() {
    const expected_foundation_length = this.allcards.length / this.foundations.length;
    for each(let f in this.foundations) if(f.cards.length != expected_foundation_length) return false;
    return true;
  },



  // === Scoring ==========================================
  // games may override getScoreFor (and hasScoring)

  hasScoring: false,

  // when adjusting this you should also adjust ui.scoreDisplay.textContent
  score: 0,

  // action is an Action object
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

    action.perform();

    const act = action;
    const pile = action.pileWhichMayNeedCardsRevealing || null;
    this._lastActionSourcePile = pile;
    const cs = act.revealedCards = pile ? this.getCardsToReveal(pile) : [];
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);
    act.score += cs.length * this.scoreForRevealing;
    ui.scoreDisplay.textContent = this.score += act.score;
    ui.movesDisplay.textContent = this.actionPtr;
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
    this.canUndo = ptr != 0;

    ui.scoreDisplay.textContent = (this.score -= action.score);
    ui.movesDisplay.textContent = this.actionPtr;
    this.hintsReady = false;

    action.undo();
    const cs = action.revealedCards || [];
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(false);
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
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);
  },

  // called after each move (unless interrupted by user).
  // Should return an Action, or null.  Generally shouldn't handle revealing of cards
  autoplay: function() {
    return null;
  },

  // Attempts to move a card to somewhere on the foundations, returning |true| if successful.
  // This default version is for Klondike-like games, Spider-like games may need to override it.
  getFoundationMoveFor: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const f = this.getFoundationDestinationFor(card);
    return f ? new Move(card, f) : null;
  },

  getFoundationDestinationFor: function(card) {
    for each(var f in this.foundations) if(f.mayAddCard(card)) return f;
    return null;
  },

  // Called when a user left-clicks on a card.  Should return an Action (or null).
  // Generally it's easier to override .best_destination_for() instead.
  getBestActionFor: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const target = this.best_destination_for(card);
    return target ? new Move(card, target) : null;
  },

  // Should return a pile, or null.
  best_destination_for: function(card) {
    return null;
  },



  // === Hints ============================================
  // Games should override getHints(); the implementation should call addHint[s]() repeatedly.
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

    if(this.hintSources.length == 0) return;
    const num = this.hintNum++; // must *post*-increment
    if(this.hintNum == this.hintSources.length) this.hintNum = 0;
    showHints(this.hintSources[num], this.hintDestinations[num]);
  },

  // can be overridden e.g. to show hints from foundations
  get hintOriginPileCollections() {
    return [this.reserves, this.cells, this.wastes, this.piles];
  },

  // If set null the Hint toolbar button will be disabled.
  getHints: function() {
    const collections = this.hintOriginPileCollections;
    for each(var ps in collections)
      for each(var p in ps)
        for each(var source in p.getHintSources())
          this.addHintsFor(source);
  },

  addHintsFor: function(card) {
    const ds = [];
    for each(var p in this.piles)
      // suggesting moves to empty piles is ugly/annoying/pointless
      if(p.hasCards && p.mayAddCard(card)) ds.push(p);
    for each(var f in this.foundations)
      if(f.mayAddCard(card)) ds.push(f);
    if(ds.length) this.addHints(card, ds);
  },

  addHints: function(card, destinations) {
    this.hintSources.push(card);
    this.hintDestinations.push(destinations);
  },



  // == Preferred foundations for different suits =========
  // Different people like to order the suits in different ways.  We support
  // this by remembering any explicit choice of foundation on a per-suit basis,
  // using a pref of the form: "S:3,4;H:5" (meaning Spades should go first to
  // foundation 3, then to foundation 4, and Hearts should go to foundation 5).
  // If the user explicitly drags an Ace to a foundation, that will become the
  // new front-most element of the preference list, and the last element may be
  // discarded.  If no preference is recorded, we try to find a foundation that
  // isn't preferred for some other suit, and optionally also based on aethetic
  // choice (e.g. placing identical suits side-by-side in Gypsy).

  // xxx maybe this should be merged in part with the autoplay stuff above, and
  // getFoundationMoveFor/getFoundationDestinationFor in particular.

  // xxx in a sane world, we'd just set this based on the cards in use
  // Controls how many piles are tracked as being the preferred destination for
  // Aces (or other base card) for a given suit
  numPreferredFoundationsPerSuit: 1,

  // Suit -> foundation *index* list
  _preferredFoundationIndexesBySuit: {},
  // foundation index -> suit map, with null for "don't care"
  _preferredSuitForFoundationIndex: {},
  // An array of foundations for which there is no preferred suit
  _unpreferredFoundations: null,

  // Should return the best possible foundation to put the Ace (or other
  // foundation base card) on.  This version tries for the preffered foundation
  // for the suit, then for a foundation not preferred by any suit, and then
  // for any empty foundation.  (The latter part shouldn't be reached unless
  // the code managing the preferences goes wrong, but meh.)
  getFoundationForAce: function(card) {
    const suit = card.suit, fs = this.foundations;
    const prefs = [fs[i] for each(i in this._preferredFoundationIndexesBySuit[suit])];
    const unpref = this._unpreferredFoundations;
    return findEmpty(prefs) || findEmpty(unpref) || findEmpty(fs);
  },

  // Call at startup
  loadPreferredFoundationSuits: function() {
    const byIx = this._preferredSuitForFoundationIndex = [null for(ix in this.foundations)];
    const bySuit = this._preferredFoundationIndexesBySuit = {
      S: [], H: [], D: [], C: []
    };
    const pref = this.loadPref("suits_preferred_foundations");
    const max = this.numPreferredFoundationsPerSuit;
    const isNum = function(x) { return !isNaN(x); };
    this._unpreferredFoundations = []; // fallback. we'll search all foundations anyway
    if(!pref) return;
    for each(var blob in pref.split(";")) { // blob: "S:1,3"
      let [suit, numsBlob] = blob.split(":");
      if(!numsBlob) continue;
      bySuit[suit] = numsBlob.split(",").map(parseInt,10).filter(isNum).slice(0, max);
      for each(i in bySuit[suit]) byIx[i] = suit;
    }
    const fs = this.foundations;
    this._unpreferredFoundations = [fs[i] for(i in fs) if(!byIx[i])];
  },

  setPreferredFoundationSuit: function(card, foundation) {
    const suit = card.suit;
    const fs = this.foundations;
    const bySuit = this._preferredFoundationIndexesBySuit;
    const byIx = this._preferredSuitForFoundationIndex;
    const oldsuit = byIx[foundation.index];
    if(oldsuit == suit) return;
    // Clear old mapping for the new pile
    const fIndex = foundation.index;
    if(oldsuit) bySuit[oldsuit] = bySuit[oldsuit].filter(function(x) { return x != fIndex });
    // If explicitly removed from a foundation, clear that mapping
    if(card.pile.isFoundation) {
      const oldIndex = card.pile.index;
      bySuit[suit] = bySuit[suit].filter(function(x) { return x != oldIndex });
      byIx[oldIndex] = null;
    }
    // Evict oldest mapping(s) for this suit if necessary
    const max = this.numPreferredFoundationsPerSuit;
    for(var i = max; i < bySuit[suit].length; ++i) byIx[bySuit[suit][i]] = null;
    bySuit[suit] = bySuit[suit].slice(0, max);
    // Set new mapping
    bySuit[suit].unshift(fIndex);
    byIx[fIndex] = suit;
    this._unpreferredFoundations = [fs[i] for(i in fs) if(!byIx[i])];
    // Record in prefs
    const bits = [s + ":" + bySuit[s].join(",") for(s in bySuit)];
    const val = bits.join(";");
    this.savePref("suits_preferred_foundations", val);
  },

  loadPref: function(name) {
    return loadPref(this.id + "." + name);
  },

  savePref: function(name, val) {
    savePref(this.id + "." + name, val);
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
      if(this.pastGames.length == 2) this.pastGames.shift();
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
    this.newGame(this.currentGame.orderCardsDealt);
  },

  restorePastGame: function() {
    if(!this.havePastGames) return;
    if(this.futureGames.length == 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    gCurrentGame = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    gCurrentGame.show();
  },

  restoreFutureGame: function() {
    if(!this.haveFutureGames) return;
    if(this.pastGames.length == 2) this.pastGames.shift();
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
