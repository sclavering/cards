// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: BaseCardGame,

  layout: SpiderLayout,
  pilesToBuild: "10p f s",
  pileTypes: { s: StockDealToPilesIfNoneAreEmpty, f: SpiderFoundation, p: SpiderPile },

  // Indices of kings within this.cards.  Used by .autoplay()
  kings: [12, 25, 38, 51, 64, 77, 90, 103],

  getBestDestinationFor: "down and same suit, or down, or empty",

  autoplay: function() {
    const cs = this.cards, ixs = this.kings, num = ixs.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var k = cs[ixs[i]], p = k.pile;
      if(p.isPile && p.mayTakeCard(k) && f.mayAddCard(k)) return new Move(k, f);
    }
    return null;
  },

  sendToFoundations: function(card) {
    const f = this.foundation;
    return card.pile.mayTakeCard(card) && f.mayAddCard(card)
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
  pileTypes: { p: BlackWidowPile },
  cards: 2
};





Games.divorce = {
  __proto__: SpiderBase,
  pileTypes: { s: StockDealToNonemptyPiles },
  dealTemplate: "P 0,5",

  init: function() {
    this.cards = makeDecksMod13(2);
  },

  autoplay: function() {
    const ps = this.piles, num = ps.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var p = ps[i], n = p.cards.length - 13;
      if(n < 0) continue;
      var c = p.cards[n];
      if(p.mayTakeCard(c) && f.mayAddCard(c)) return new Move(c, f);
    }
    return null;
  }
};





Games.wasp = {
  __proto__: SpiderBase,

  layout: WaspLayout,
  pilesToBuild: "7p f s",
  pileTypes: { s: StockDealToPiles, p: WaspPile },
  dealTemplate: "p 3,4 3,4 3,4 0,7 0,7 0,7 0,7",
  kings: [12, 25, 38, 51],
  getBestDestinationFor: "to up or nearest space",
};





const SimonBase = {
  __proto__: SpiderBase,
  helpId: "simon",
  pilesToBuild: "10p f",
  layout: SimonLayout,
  dealTemplate: "p 0,8 0,8 0,8 0,7 0,6 0,5 0,4 0,3 0,2 0,1",
  kings: [12, 25, 38, 51],
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
