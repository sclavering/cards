// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: BaseCardGame,

  xulTemplate: "h2p1p1p1p1p1p1p1p1p1p2[f s]2",

  // Indices of kings within this.allcards.  Used by .autoplay()
  kings: [12, 25, 38, 51, 64, 77, 90, 103],

  getBestDestinationFor: "down and same suit, or down, or empty",

  autoplay: function() {
    const cs = this.allcards, ixs = this.kings, num = ixs.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var k = cs[ixs[i]], p = k.pile;
      if(p.isPile && p.mayTakeCard(k) && f.mayAddCard(k)) return new Move(k, f);
    }
    return null;
  },

  isWon: "foundation holds all cards",

  hasScoring: true,

  getScoreFor: function(act) {
    return act instanceof Move ? (act.destination.isFoundation ? 100 : -1) : 0;
  }
};





const Spider = {
  __proto__: SpiderBase,
  pileDetails: [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, SpiderPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  helpId: "spider"
};


Games.spider1 = {
  __proto__: Spider,
  allcards: [8, "S"]
};


Games.spider2 = {
  __proto__: Spider,
  allcards: [4, "SH"]
};


Games.spider4 = {
  __proto__: Spider,
  allcards: [2]
};





Games.blackwidow = {
  __proto__: Spider,
  helpId: null,
  pileDetails: [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, BlackWidowPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  allcards: [2]
};




Games.divorce = {
  __proto__: SpiderBase,
  pileDetails: [
    "s", 1, StockDealToNonemptyPiles, StockView, 0, 0,
    "p", 10, SpiderPile, FanDownView, 0, 5,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],

  allcards: [2, , , true],

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
  pileDetails: [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 7, WaspPile, FanDownView, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  xulTemplate: "h2p1p1p1p1p1p1p2[f s]2",
  kings: [12, 25, 38, 51],
  getBestDestinationFor: "to up or nearest space",
};





const SimonBase = {
  __proto__: SpiderBase,
  pileDetails: [
    "p", 10, SpiderPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  xulTemplate: "h2p1p1p1p1p1p1p1p1p1p2f2",
  helpId: "simon",
  kings: [12, 25, 38, 51],
};

Games.simplersimon = {
  __proto__: SimonBase,
  pileDetails: [
    "p", 10, BlackWidowPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
}

Games.simon1 = {
  __proto__: SimonBase,
  allcards: [4, "S"]
};

Games.simon2 = {
  __proto__: SimonBase,
  allcards: [2, "SH"]
};

Games.simon4 = {
  __proto__: SimonBase
};
