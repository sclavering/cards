// Spider, Black Widow, Grounds for Divorce, and Wasp

Games.blackwidow = Games.divorce = Games.wasp = true;

Games.spider = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["spider-easy", "spider-medium", "spider"]
};


var SpiderBase = {
  __proto__: BaseCardGame,

  dealFromStock: "to piles, if none empty",

  mayTakeCardFromFoundation: "no",

  mayAddCardToPile: "down",

  getBestMoveForCard: "down and same suit, or down, or empty",

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
    "->foundation": 100,
    "pile->pile": -1
  }
};


// for games which use Spider's layout, where the foundations are compacted
var SpiderLayoutBase = {
  __proto__: SpiderBase,
  layout: "spider",

  // Special version which if target is a foundation uses the first empty foundation instead.
  // Necessary because of the compact layout of foundations in Spider.
  moveTo: function(card, target) {
    if(target.isFoundation) target = this.firstEmptyFoundation;
    BaseCardGame.moveTo.call(this,card,target);
    return true;
  },

  sendToFoundations: function(card) {
    // the last foundation is empty unless the game has been won, so use its mayAddCard
    var fs = this.foundations, f = fs[fs.length - 1];
    return card.parentNode.mayTakeCard(card) && f.mayAddCard(card) && this.moveTo(card, f);
  }
};


var Spider = {
  __proto__: SpiderLayoutBase,

  getLowestMovableCard: "descending, in suit",

  kings: null,

  deal: function(cards) {
    if(!this.kings) {
      var cs = this.cards;
      this.kings = [cs[12], cs[25], cs[38], cs[51], cs[64], cs[77], cs[90], cs[103]];
    }

    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 5, 1);
    for(i = 4; i != 10; i++) this.piles[i].dealTo(cards, 4, 1);
    this.stock.dealTo(cards, 50, 0);
  },

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToFoundation: "13 cards",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  autoplayMove: function() {
    for(var i = 0; i != 8; i++) {
      var k = this.kings[i], p = k.parentNode;
      if(!p.isNormalPile) continue;
      var n = p.childNodes.length - 13;
      if(n>=0 && p.childNodes[n]==k && k.parentNode.mayTakeCard(k)) return this.moveTo(k, this.firstEmptyFoundation);
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

  deal: function(cards) {
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 5, 1);
    for(i = 4; i != 10; i++) this.piles[i].dealTo(cards, 4, 1);
    this.stock.dealTo(cards, 50, 0);
  },

  mayAddCardToFoundation: "king->ace flush",

  mayTakeCardFromPile: "run down",

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

  init: function() {
    this.cards = makeDecksMod13(2);
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) this.piles[i].dealTo(cards, 0, 5);
    this.stock.dealTo(cards, cards.length, 0);
  },

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToFoundation: "13 cards",

  mayAddCardToPile: "down",

  getLowestMovableCard: "descending, in suit",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


AllGames.wasp = {
  __proto__: SpiderBase,

  id: "wasp",
  dealFromStock: "to piles",

  deal: function(cards) {
    for(var i = 0; i != 3; i++) this.piles[i].dealTo(cards, 3, 4);
    for(i = 3; i != 7; i++) this.piles[i].dealTo(cards, 0, 7);
    this.stock.dealTo(cards, 3, 0);
  },

  mayAddCardToFoundation: "king->ace flush",

  mayAddCardToPile: "onto .up",

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
