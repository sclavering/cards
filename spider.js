// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

var SpiderBase = {
  __proto__: BaseCardGame,

  stockType: StockDealToPilesIfNoneAreEmpty,
  foundationType: Spider8Foundation,
  pileType: SpiderPile,
  pileLayout: FanDownLayout,

  layoutTemplate: "h2p1p1p1p1p1p1p1p1p1p2[f sl]2",

  kings: [12, 25, 38, 51, 64, 77, 90, 103],

  init2: function() {
    // replace the array of indices with a *new* array of cards
    const ki = this.kings, num = ki.length, cs = this.cards;
    const ks = this.kings = new Array(num);
    for(var i = 0; i != num; i++) ks[i] = cs[ki[i]];
  },

  getBestDestinationFor: "down and same suit, or down, or empty",

  // this sucks
  autoplay: function() {
    const ks = this.kings, num = ks.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var k = ks[i], p = k.parentNode;
      if(p.isPile && p.mayTakeCard(k) && f.mayAddCard(k)) return new Move(k, f);
    }
    return null;
  },

  sendToFoundations: function(card) {
    const f = this.foundation;
    return card.parentNode.mayTakeCard(card) && f.mayAddCard(card)
        ? new Move(card, f) : null;
  },

  isWon: "foundation holds all cards",

  hasScoring: true,

  getScoreFor: function(act) {
    return act instanceof Move ? (act.destination.isFoundation ? 100 : -1) : 0;
  }
};





const Spider = {
  __proto__: SpiderBase,
  helpId: "spider",

  dealTemplate: "p 5,1 5,1 5,1 5,1 4,1 4,1 4,1 4,1 4,1 4,1",

  getLowestMovableCard: "descending, in suit",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  }
};


Games.spider1 = {
  __proto__: Spider,
  cards: [[SPADE], 8]
};


Games.spider2 = {
  __proto__: Spider,
  cards: [[SPADE, HEART], 4]
};


Games.spider4 = {
  __proto__: Spider,
  cards: 2
};





Games.blackwidow = {
  __proto__: Spider,
  helpId: null,

  pileType: BlackWidowPile,

  cards: 2,

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

  stockType: StockDealToNonemptyPiles,

  dealTemplate: "P 0,5",

  init: function() {
    this.cards = makeDecksMod13(2);
  },

  getLowestMovableCard: "descending, in suit",

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  autoplay: function() {
    const ps = this.piles, num = ps.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var p = ps[i], n = p.childNodes.length - 13;
      if(n < 0) continue;
      var c = p.childNodes[n];
      if(p.mayTakeCard(c) && f.mayAddCard(c)) return new Move(c, f);
    }
    return null;
  }
};





Games.wasp = {
  __proto__: SpiderBase,

  stockType: StockDealToPiles,
  foundationType: Spider4Foundation,
  pileType: WaspPile,
  pileLayout: null,

  layoutTemplate: "h2p1p1p1p1p1p1p2[f s]2",
  dealTemplate: "p 3,4 3,4 3,4 0,7 0,7 0,7 0,7",

  // converted to an array of cards by SpiderBase.init2()
  kings: [12, 25, 38, 51],

  getBestDestinationFor: "to up or nearest space",

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





const SimonBase = {
  __proto__: SpiderBase,
  helpId: "simon",

  foundationType: Spider4Foundation,

  layoutTemplate: "h2p1p1p1p1p1p1p1p1p1p2f2",
  dealTemplate: "p 0,8 0,8 0,8 0,7 0,6 0,5 0,4 0,3 0,2 0,1",

  // see SpiderBase.init2
  kings: [12, 25, 38, 51],

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, in suit"
};

Games.simon1 = {
  __proto__: SimonBase,
  cards: [[SPADE], 4]
};

Games.simon2 = {
  __proto__: SimonBase,
  cards: [[SPADE, HEART], 2]
};

Games.simon4 = {
  __proto__: SimonBase,
  cards: 1
};
