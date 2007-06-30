const BaseCardGame = {
  // This becomes an array of all the cards a game uses, either explicitly in the game's init(), or
  // by initialise() if it is a number (of decks to be created) or an array [[suits], repeat]
  cards: 1,

  // these are all automatically set up
  piles: [],       // array of tableau piles
  foundations: [], // array of foundation piles
  reserves: [],    // ...
  cells: [],
  stock: null,     // the stock pile if the game has one, otherwise null
  waste: null,
  foundation: null, // the last foundation created (usually used in games with just one)
  reserve: null,
  dragDropTargets: null, // a list of piles on which cards can be dropped

  // a Layout object from liblayout.js
  layout: null,

  // pilesToBuild should be something like "4c 4f 8p".  "4f" means create 4 piles using pileTypes.f
  // as the bases.  The entire string leads to 16 piles of various kinds being created, with the
  // order of creation deciding the correspondence with the elements of this.layout.views.
  pilesToBuild: null,
  // When accessing this field, the code will walk up the __proto__ chain for the game such that
  // overriding the entire object will effectively only override individual fields.
  pileTypes: { f: KlondikeFoundation, c: Cell, r: Reserve, w: Waste },

  _pilesToBuildLetters: [],
  _pilesToBuildClasses: [],

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
    if(this.getHints) gCmdHint.removeAttribute("disabled");
    else gCmdHint.setAttribute("disabled","true");
    gScorePanel.hidden = !this.hasScoring;
    gScoreDisplay.value = this.score;
  },

  hide: function() {
    this.layout.hide();
  },


  classInit: function() {
    this.classInit = null; // to avoid re-calling
    this.initialised = true;
    // replace strings with functions (see rules.js)
    for(var r in Rules) if(typeof this[r] == "string") this[r] = Rules[r][this[r]];
    this.layout == { __proto__: this.layout };  // avoid weirdness if shared
    this.layout.init();
    this.classInitPilesToBuild();
  },

  // Parse the string representation to create an array of letters and of classes
  classInitPilesToBuild: function() {
    const map = this.pileTypes;
    for(var obj = this.__proto__; obj; obj = obj.__proto__) {
      if(!obj.pileTypes) continue;
      var map2 = obj.pileTypes;
      for(var letter in map2) if(!map[letter]) map[letter] = map2[letter];
    }
  
    const bits = this.pilesToBuild.split(" ");
    const letters = this._pilesToBuildLetters = [];
    const classes = this._pilesToBuildClasses = [];
    for(var i = 0; i != bits.length; ++i) {
      var matches = bits[i].match(/(\d*)(\w)/);
      var num = parseInt(matches[1]) || 1; // ""->NaN.  (NaN || 1) == 1
      var letter = matches[2], clas = map[letter];
      for(var j = 0; j != num; ++j) classes.push(clas), letters.push(letter);
    }
  },

  createPiles: function() {
    const views = this.layout.views, numV = views.length;
    const letters = this._pilesToBuildLetters, num = letters.length;
    const classes = this._pilesToBuildClasses;
    const bytype = this.pilesByType = {};
    const all = this.allpiles = [];
    if(num != numV) throw "game is trying to create " + num + " piles for " + numV + " views!";

    for(var i = 0; i != num; ++i) {
      var letter = letters[i], impl = classes[i], view = views[i];
      var pile = createPile(impl);
      all.push(pile);
      var view = views[i];
      pile.view = view;
      view.displayPile(pile);
      if(bytype[letter]) bytype[letter].push(pile);
      else bytype[letter] = [pile];
    }
    // xxx existince is rather icky, but yay list comprehensions
    this.dragDropTargets = [f for each(f in this.allpiles) if(f.canDrop)];

    for each(var set in bytype)
      for(i = 1; i != set.length; ++i) set[i].prev = set[i-1], set[i-1].next = set[i];

    var p;
    // xxx would be nice to kill all of these
    this.piles = [p for each(p in all) if(p.isPile)];
    this.cells = [p for each(p in all) if(p.isCell)];
    this.reserves = [p for each(p in all) if(p.isReserve)];
    this.foundations = [p for each(p in all) if(p.isFoundation)];
    for(i in this.foundations) this.foundations[i].index = i;
    this.wastes = [p for each(p in all) if(p.isWaste)];
    this.waste = this.wastes[0] || null;
    this.foundation = this.foundations[0] || null
    this.reserve = this.reserves[0] || null;
    this.stock = bytype.s ? bytype.s[0] : null;

    this.loadPreferredFoundationSuits();
  },

  initCards: function() {
    // see comments above
    if(typeof this.cards == "number") this.cards = makeDecks(this.cards);
    else if(!(this.cards[0] instanceof Card)) this.cards = makeCardSuits.apply(null, this.cards);
  },

  // A string, unless deal() is overridden.
  //  template ::= foo "; " template | foo
  //  foo ::= [PFCRWS] " " nums | [pfcrws] (" " nums)+
  //  nums ::= [0-9] ("," [0-9])*
  //
  // "nums" lists are alternate numbers of face-down and face-up cards.
  // Capital letters mean "deal this (nums) pattern to every pile of this type".
  // Lower-case letters are followed by a pattern for each pile of that type
  // e.g. "F 0,1; p 0,1 1,2"
  // would mean "deal a single face-up card to each foundation, a single face-up card to
  // the first pile, and two-face up cards on top of one face-down card to the second pile"
  //
  // p=pile, f=foundation, c=cell, r=reserve, w=waste, s=stock
  // Once all the cards are dealt, any further instructions will be silently ignored. This
  // is used by, e.g.,  Fan ("P 0,3") to leave the final pile with just 1 card
  dealTemplate: null,

  // Created by parsing dealTemplate, and used when actually dealing. A list of
  // [pile, nums] arrays, where 'nums' is the format used by _dealSomeCards.
  dealMap: null,


  // === Start Game =======================================
  // Games should override deal(), and shuffleImpossible() if they need to

  // 'order' is used to "restart" games - by starting a new one with the same
  // shuffled cards.  If not null, it's a permutation of indices
  begin: function(order) {
    this.createPiles();
    this.init();
    this.initCards();

    var cardsToDeal;
    if(order) {
      this.orderCardsDealt = order;
      cardsToDeal = [this.cards[order[i]] for(i in this.cards)];
    } else {
      var ixs = [i for each(i in range(this.cards.length))];
      do {
        this.orderCardsDealt = order = shuffle(ixs);
        cardsToDeal = [this.cards[order[i]] for(i in this.cards)];
      } while(this.shuffleImpossible(cardsToDeal));
    }

    this.actionList = [];
    if(this.dealTemplate) this._parseDealTemplate();
    this.deal(cardsToDeal);
    gScoreDisplay.value = this.score = this.initialScore;
  },

  _parseDealTemplate: function(cards) {
    const mapbatches = [];
    const bits = this.dealTemplate.split("; ");
    // get comma-separated digit-strings for each pile, in batches by pile type
    for each(var bit in bits) {
      var ch = bit.charAt(0);
      var lch = ch.toLowerCase();
      var piles = this.pilesByType[lch] || null;
      if(!piles) throw "dealTemplate contains bad character: " + ch;
      bit = bit.slice(2); // drop the leading "x "
      if(ch == lch) { // separate nums for each pile
        var numss = bit.split(" ");
        mapbatches.push([[piles[j], numss[j]] for(j in numss)]);
      } else {
        mapbatches.push([[piles[j], bit] for(j in piles)]);
      }
    }
    // flatten batches, and parse digit-strings into arrays of integers
    const strmap = Array.concat.apply(null, mapbatches);
    this.dealMap = [[p, [parseInt(i,10) for each(i in s.split(","))]] for each([p,s] in strmap)];
  },

  // overriding versions should deal out the provided shuffled cards for a new game.
  deal: function(cards) {
    if(!this.dealMap) throw "deal() not overridden, and dealMap not defined";
    for each([pile, nums] in this.dealMap) this._dealSomeCards(pile, cards, nums);
    // deal any remaining cards to the stock (keeps the templates simple)
    if(this.stock) this._dealSomeCards(this.stock, cards, [cards.length]);
  },

  // |nums| is an array of ints
  _dealSomeCards: function(pile, cards, nums) {
    const cs = [];
    for(var i = 0, faceDown = true; i != nums.length; ++i, faceDown = !faceDown) {
      var n = nums[i];
      for(var j = 0; j != n; ++j) {
        var c = cards.pop();
        if(!c) continue; // some games (e.g. Montana) have nulls in their cards array
        c.faceUp = !faceDown;
        cs.push(c);
      }
    }
    pile.addCardsFromArray(cs);
  },

  // Cards will be shuffled repeatedly until this returns false.
  // Override to eliminate (some) impossible deals.
  shuffleImpossible: function(shuffledCards) {
    return false;
  },



  // === Winning ==========================================
  // Games should obviously override this
  isWon: function() {
    return false;
  },



  // === Scoring ==========================================
  // games may override getScoreFor (and hasScoring)

  // score at the start of a game
  // read after deal() (which is important if a game uses a getter function for this)
  initialScore: 0,

  hasScoring: false,

  // when adjusting this you should also adjust gScoreDisplay.value
  score: 0,

  // action is an Action object
  getScoreFor: function(action) {
    return 0;
  },

  // score for each card revealed.  done() handles the revealing of cards
  scoreForRevealing: 0,



  // === Move tracking and Undoing ========================

  actionList: [],
  actionPtr: 0,
  canUndo: false,
  canRedo: false,

  doo: function(action) {
    this.pileWhichLastHadCardRemoved = null; // paranoia
    if(this.canRedo) this.actionList = this.actionList.slice(0, this.actionPtr); // clear Redo history
    this.actionList[this.actionPtr++] = action;
    this.canUndo = true;
    this.canRedo = false;
    action.score = this.getScoreFor(action);
    this.hintsReady = false;

    action.perform();

    const act = action;
    const pile = action.pileWhichMayNeedCardsRevealing || null;
    const cs = act.revealedCards = pile ? this.getCardsToReveal(pile) : [];
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);
    act.score += cs.length * this.scoreForRevealing;
    gScoreDisplay.value = this.score += act.score;
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

    gScoreDisplay.value = this.score -= action.score;
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

    gScoreDisplay.value = this.score += action.score;
    this.hintsReady = false;

    if(action.redo) action.redo();
    else action.perform();
    const cs = action.revealedCards;
    for(var i = 0; i != cs.length; ++i) cs[i].setFaceUp(true);
  },

  // called after each move (unless interrupted by user).
  // Should return an Action, or null.  Generally shouldn't handle revealing of cards
  autoplay: function(pileWhichHasHadCardsRemoved) {
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

  // Called when a user right-clicks on a card.  Should return an Action (or null).
  // Generally it's easier to override getBestDestinationFor instead of getBestActionFor
  getBestActionFor: function(card) {
    if(!card.pile.mayTakeCard(card)) return null;
    const target = this.getBestDestinationFor(card);
    return target ? new Move(card, target) : null;
  },

  getBestDestinationFor: function(card) {
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
      if(p != card.pile && p.hasCards && p.mayAddCard(card)) ds.push(p);
    for each(var f in this.foundations)
      if(f != card.pile && f.mayAddCard(card)) ds.push(f);
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
  loadPreferredFoundationSuits: function(card, foundation) {
    const byIx = this._preferredSuitForFoundationIndex = [null for(ix in this.foundations)];
    const bySuit = this._preferredFoundationIndexesBySuit = {
      S: [], H: [], D: [], C: [] // names must match SPADE/HEART/DIAMOND/CLUB consts
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

  // === Miscellany =======================================

  get firstEmptyFoundation() {
    var fs = this.foundations, len = fs.length;
    for(var i = 0; i != len; i++) if(!fs[i].hasCards) return fs[i];
    return null;
  },

  get firstEmptyPile() {
    var ps = this.piles, len = ps.length;
    for(var i = 0; i != len; i++) if(!ps[i].hasCards) return ps[i];
    return null;
  },

  get emptyCell() {
    const cs = this.cells, num = cs.length;
    for(var i = 0; i != num; i++) if(!cs[i].hasCards) return cs[i];
    return null;
  }
}





function GameControllerObj(id, proto) {
  this.id = id;
  proto.id = id; // main.js still uses this
  this.instanceProto = proto;
  this.pastGames = [];
  this.futureGames = [];
}
GameControllerObj.prototype = {
  instanceProto: null,
  pastGames: [],
  havePastGames: false,
  currentGame: null,
  futureGames: [],
  haveFutureGames: false,

  switchTo: function() {
    if(!this.currentGame) this.newGame();
    else Game = this.currentGame;
    Game.show();
  },

  switchFrom: function() {
    this.currentGame.hide();
  },

  newGame: function(cardsOrder) {
    if(this.currentGame) {
      if(this.pastGames.length==2) this.pastGames.shift();
      this.pastGames.push(this.currentGame);
      this.havePastGames = true;
    }

    if(this.instanceProto.classInit) this.instanceProto.classInit();
    Game = this.currentGame = { __proto__: this.instanceProto };
    Game.begin(cardsOrder || null);
    const act = Game.autoplay();
    if(act) doo(act);
  },

  restart: function() {
    this.newGame(this.currentGame.orderCardsDealt);
  },

  restorePastGame: function() {
    if(this.futureGames.length == 2) this.futureGames.shift();
    this.futureGames.push(this.currentGame);
    this.haveFutureGames = true;
    Game = this.currentGame = this.pastGames.pop();
    this.havePastGames = this.pastGames.length!=0;
    Game.show();
  },

  restoreFutureGame: function() {
    if(this.pastGames.length == 2) this.pastGames.shift();
    this.pastGames.push(this.currentGame);
    this.havePastGames = true;
    Game = this.currentGame = this.futureGames.pop();
    this.haveFutureGames = this.futureGames.length!=0;
    Game.show();
  },

  clearFutureGames: function() {
    this.futureGames = [];
    this.haveFutureGames = false;
  }
}
