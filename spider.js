// Spider, Black Widow, Grounds for Divorce, and Wasp

Games.blackwidow = Games.divorce = Games.wasp = true;

Games.spider = {
  names: ["easy-1suit", "medium-2suits", "hard-4suits"],
  ids: ["spider-easy", "spider-medium", "spider"]
};


var SpiderBase = {
  __proto__: BaseCardGame,

  layout: "spider",

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

  sendToFoundations: function(card) {
    const f = this.foundation;
    return card.parentNode.mayTakeCard(card) && f.mayAddCard(card) && this.moveTo(card, f);
  },

  hasBeenWon: function() {
    return this.foundation.childNodes.length==104;
  },

  scores: {
    "->foundation": 100,
    "pile->pile": -1
  }
};


var Spider = {
  __proto__: SpiderBase,

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
    const ks = this.kings;
    for(var i = 0; i != 8; i++) {
      var k = ks[i], p = k.parentNode;
      if(!p.isNormalPile) continue;
      var n = p.childNodes.length - 13;
      if(n>=0 && p.childNodes[n]==k && k.parentNode.mayTakeCard(k)) return this.moveTo(k, this.foundation);
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


AllGames.divorce = {
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
  }
};


AllGames.wasp = {
  __proto__: SpiderBase,

  id: "wasp",
  layout: "wasp",

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
      if(downp!=pile && downp.isNormalPile) this.addHint(down, pile);
    }
  },

  hasBeenWon: "52 cards on foundation"
};
