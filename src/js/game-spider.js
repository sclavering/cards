// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: Game,

  layoutTemplate: '#<   p p p p p p p p p p  [fs]   >.',

  // Indices of kings within this.allcards.  Used by .autoplay()
  kings: [12, 25, 38, 51, 64, 77, 90, 103],

  best_destination_for: function(card) {
    let maybe = null, empty = null;
    for each(let p in card.pile.surrounding) {
      let last = p.lastCard;
      if(!last) {
        if(!empty) empty = p;
        continue;
      }
      if(card.upNumber !== last.number) continue;
      if(card.suit === last.suit) return p;
      if(!maybe) maybe = p;
    }
    return maybe || empty;
  },

  autoplay: function() {
    const cs = this.allcards, ixs = this.kings, num = ixs.length, f = this.foundation;
    for(var i = 0; i != num; i++) {
      var k = cs[ixs[i]], p = k.pile;
      if(p.isPile && p.mayTakeCard(k) && f.mayAddCard(k)) return new Move(k, f);
    }
    return null;
  }
};



const Spider = {
  __proto__: SpiderBase,
  pileDetails: function() [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, SpiderPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  helpId: "spider"
};

gGameClasses.spider1 = {
  __proto__: Spider,
  allcards: [8, "S"]
};

gGameClasses.spider2 = {
  __proto__: Spider,
  allcards: [4, "SH"]
};

gGameClasses.spider4 = {
  __proto__: Spider,
  allcards: [2]
};



gGameClasses.blackwidow = {
  __proto__: Spider,
  helpId: null,
  pileDetails: function() [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, BlackWidowPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  allcards: [2]
};



gGameClasses.divorce = {
  __proto__: SpiderBase,
  pileDetails: function() [
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



gGameClasses.wasp = {
  __proto__: SpiderBase,
  pileDetails: function() [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 7, WaspPile, FanDownView, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p  [fs]   >.',
  kings: [12, 25, 38, 51],
  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,
};



const SimonBase = {
  __proto__: SpiderBase,
  pileDetails: function() [
    "p", 10, SpiderPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p p p p  f   >.',
  helpId: "simon",
  kings: [12, 25, 38, 51]
};

gGameClasses.simplersimon = {
  __proto__: SimonBase,
  pileDetails: function() [
    "p", 10, BlackWidowPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ]
};

gGameClasses.simon1 = {
  __proto__: SimonBase,
  allcards: [4, "S"]
};

gGameClasses.simon2 = {
  __proto__: SimonBase,
  allcards: [2, "SH"]
};

gGameClasses.simon4 = {
  __proto__: SimonBase
};

gGameClasses.doublesimon = {
  __proto__: SimonBase,
  allcards: [2],
  pileDetails: function() [
    "p", 12, SpiderPile, FanDownView, 0, [16, 16, 14, 14, 12, 10, 8, 6, 4, 2, 1, 1],
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p p p p p p  f   >.',
  helpId: "simon",
  kings: [12, 25, 38, 51, 64, 77, 90, 103]
};
