// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

var SpiderBase = {
  __proto__: BaseCardGame,

  layout: "spider",

  kings: [12, 25, 38, 51, 64, 77, 90, 103],

  init2: function() {
    // replace the array of indices with a *new* array of cards
    const ki = this.kings, num = ki.length, cs = this.cards;
    const ks = this.kings = new Array(num);
    for(var i = 0; i != num; i++) ks[i] = cs[ki[i]];
  },

  dealFromStock: "to piles, if none empty",

  mayTakeCardFromFoundation: "no",

  mayAddCardToPile: "down",

  getBestMoveForCard: "down and same suit, or down, or empty",

  autoplayMove: function() {
    const ks = this.kings, num = ks.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var k = ks[i], p = k.parentNode;
      if(p.isPile && p.mayTakeCard(k) && f.mayAddCard(k))
        return this.moveTo(k, f);
    }
    return false;
  },

  sendToFoundations: function(card) {
    const f = this.foundation;
    return card.parentNode.mayTakeCard(card) && f.mayAddCard(card) && this.moveTo(card, f);
  },

  hasBeenWon: "foundation holds all cards",

  scores: {
    "->foundation": 100,
    "pile->pile": -1
  }
};





var Spider = {
  __proto__: SpiderBase,

  getLowestMovableCard: "descending, in suit",

  deal: function(cards) {
    for(var i = 0; i != 4; i++) this.piles[i].dealTo(cards, 5, 1);
    for(i = 4; i != 10; i++) this.piles[i].dealTo(cards, 4, 1);
    this.stock.dealTo(cards, 50, 0);
  },

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToFoundation: "13 cards",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


Games["spider-1suit"] = {
  __proto__: Spider,
  id: "spider-1suit",
  cards: [[SPADE], 8]
};


Games["spider-2suits"] = {
  __proto__: Spider,
  id: "spider-2suits",
  cards: [[SPADE, HEART], 4]
};


Games.spider = {
  __proto__: Spider,
  id: "spider",
  cards: 2
};





Games.blackwidow = {
  __proto__: SpiderBase,

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





Games.divorce = {
  __proto__: SpiderBase,

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
  },

  autoplayMove: function() {
    const ps = this.piles, num = ps.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var p = ps[i], n = p.childNodes.length - 13;
      if(n < 0) continue;
      var c = p.childNodes[n];
      if(p.mayTakeCard(c) && f.mayAddCard(c)) return this.moveTo(c, f);
    }
    return false;
  }
};





Games.wasp = {
  __proto__: SpiderBase,

  id: "wasp",
  layout: "wasp",

  // converted to an array of cards by SpiderBase.init2()
  kings: [12, 25, 38, 51],

  deal: function(cards) {
    for(var i = 0; i != 3; i++) this.piles[i].dealTo(cards, 3, 4);
    for(i = 3; i != 7; i++) this.piles[i].dealTo(cards, 0, 7);
    this.stock.dealTo(cards, 3, 0);
  },

  dealFromStock: "to piles",

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
      if(downp!=pile && downp.isPile) this.addHint(down, pile);
    }
  }
};





var SimonBase = {
  __proto__: SpiderBase,

  layout: "simon",

  // see SpiderBase.init2
  kings: [12, 25, 38, 51],

  deal: function(cards) {
    const ps = this.piles;
    ps[0].dealTo(cards, 0, 8);
    ps[1].dealTo(cards, 0, 8);
    for(var i = 2; i != 10; i++) ps[i].dealTo(cards, 0, 10-i);
  },

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToFoundation: "13 cards",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, in suit"
};


Games["simon-1suit"] = {
  __proto__: SimonBase,
  id: "simon-1suit",
  cards: [[SPADE], 4]
};


Games["simon-2suits"] = {
  __proto__: SimonBase,
  id: "simon-2suits",
  cards: [[SPADE, HEART], 2]
};


Games["simon"] = {
  __proto__: SimonBase,
  id: "simon"
};
