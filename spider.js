// Spider, Black Widow, Grounds for Divorce, and Wasp

Games.blackwidow = Games.divorce = Games.wasp = true;

Games.spider = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["spider-easy", "spider-medium", "spider"]
};


var SpiderBase = {
  __proto__: BaseCardGame,

  dealFromStock: "to piles, if none empty",
  canMoveToPile: "descending",

  getBestMoveForCard: function(card) {
    const ps = getPilesRound(card.parentNode), num = ps.length;
    var maybe = null, empty = null;
    for(var i = 0; i != num; i++) {
      var p = ps[i], last = p.lastChild;
      if(!last) {
        if(!empty) empty = p;
        continue;
      }
      if(!this.canMoveToPile(card, p)) continue;
      if(card.suit==p.lastChild.suit) return p;
      if(!maybe) maybe = p;
    }
    return maybe || empty;
  },

  autoplayMove: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var pile = this.piles[i];
      var n = pile.childNodes.length - 13;
      if(n>=0 && this.sendToFoundations(pile.childNodes[n])) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation": 100,
    "move-between-piles":  -1
  }
};


// for games which use Spider's layout, where the foundations are compacted
var SpiderLayoutBase = {
  __proto__: SpiderBase,
  layout: "spider",

  moveTo: function(card, target) {
    if(target.isFoundation) target = this.firstEmptyFoundation;
    BaseCardGame.moveTo.call(this,card,target);
    return true;
  },

  sendToFoundations: function(card) {
    // don't try and use attemptMove here, because it will break for Black Widow
    // (because we need |null| to be passed to canMoveToFoundation)
    return this.canMoveCard(card) && this.canMoveToFoundation(card, null)
        && this.moveTo(card, this.foundations[0]);
  }
};


var Spider = {
  __proto__: SpiderLayoutBase,

  canMoveCard: "descending, in suit, not from foundation",
  canMoveToFoundation: "13 cards",
  getLowestMovableCard: "descending, in suit",

  kings: null,

  deal: function(cards) {
    if(!this.kings) {
      var cs = this.cards;
      this.kings = [cs[12], cs[25], cs[38], cs[51], cs[64], cs[77], cs[90], cs[103]];
    }

    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 5, 1);
    for(i = 4; i != 10; i++) dealToPile(cards, this.piles[i], 4, 1);
    dealToPile(cards, this.stock, 50, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  autoplayMove: function() {
    for(var i = 0; i != 8; i++) {
      var k = this.kings[i], p = k.parentNode;
      if(!p.isNormalPile) continue;
      var n = p.childNodes.length - 13;
      if(n>=0 && p.childNodes[n]==k && this.canMoveCard(k)) return this.moveTo(k, this.firstEmptyFoundation);
    }
    return false;
  }
};


AllGames["spider-easy"] = {
  __proto__: Spider,
  id: "spider-easy",
  cards: [[SPADE], 8]
};


AllGames["spider-medium"] = {
  __proto__: Spider,
  id: "spider-medium",
  cards: [[SPADE, HEART], 4]
};


AllGames.spider = {
  __proto__: Spider,
  id: "spider",
  cards: 2
};


AllGames.blackwidow = {
  __proto__: SpiderLayoutBase,

  id: "blackwidow",
  cards: 2,
  canMoveCard: "descending, not from foundation",
  canMoveToFoundation: "king->ace flush",

  deal: function(cards) {
    for(var i = 0; i != 4; i++) dealToPile(cards, this.piles[i], 5, 1);
    for(i = 4; i != 10; i++) dealToPile(cards, this.piles[i], 4, 1);
    dealToPile(cards, this.stock, 50, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) {
      var card = this.piles[i].lastChild;
      while(card && card.faceUp) {
        var prv = card.previousSibling;
        if(!prv || !prv.faceUp) {
          this.addHintsFor(card);
        } else if(prv.number!=card.upNumber) {
          this.addHintsFor(card);
          break;
        } else if(prv.suit!=card.suit) {
          this.addHintsFor(card);
        } // otherwise it's from the same suit, so don't suggest moving
        card = prv;
      }
    }
  }
};


AllGames.divorce = {
  __proto__: SpiderLayoutBase,

  id: "divorce",

  get stockCounterStart() { return this.stock.childNodes.length; },

  dealFromStock: "to nonempty piles",
  canMoveToFoundation: "13 cards",

  init: function() {
    this.cards = makeDecksMod13(2);
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], 0, 5);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveCard: "descending, in suit, not from foundation",

  canMoveToPile: "descending",

  getLowestMovableCard: "descending, in suit",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


AllGames.wasp = {
  __proto__: SpiderBase,

  id: "wasp",
  dealFromStock: "to piles",
  canMoveCard: "not from foundation",
  canMoveToFoundation: "king->ace flush",

  deal: function(cards) {
    for(var i = 0; i != 3; i++) dealToPile(cards, this.piles[i], 3, 4);
    for(i = 3; i != 7; i++) dealToPile(cards, this.piles[i], 0, 7);
    dealToPile(cards, this.stock, 3, 0);
  },

  canMoveToPile: "onto up, any in spaces",

  getBestMoveForCard: "to up or nearest space",

  getHints: function() {
    for(var i = 0; i != 7; i++) {
      var pile = this.piles[i];
      if(!pile.hasChildNodes()) continue;
      var last = pile.lastChild, down = last.down;
      if(!down || down.faceDown) continue;
      var downp = down.parentNode;
      if(downp!=pile && downp.isNormalPile) this.addHint(down, pile);
    }
  }
};
