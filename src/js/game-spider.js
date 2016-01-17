// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: Game,

  layoutTemplate: '#<   p p p p p p p p p p  [fs]   >.',

  best_destination_for: function(card) {
    let maybe = null, empty = null;
    for(let p of card.pile.surrounding()) {
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
    const f = this.foundation;
    for(let p of this.piles) {
      let n = p.cards.length - 13;
      if(n < 0) continue;
      let c = p.cards[n];
      if(c.mayTake && f.mayAddCard(c)) return new Move(c, f);
    }
    return null;
  },
};



const Spider = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, SpiderPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  helpId: "spider"
};

gGameClasses.spider1 = {
  __proto__: Spider,
  required_cards: [8, "S"]
};

gGameClasses.spider2 = {
  __proto__: Spider,
  required_cards: [4, "SH"]
};

gGameClasses.spider4 = {
  __proto__: Spider,
  required_cards: [2]
};



gGameClasses.blackwidow = {
  __proto__: Spider,
  helpId: null,
  pileDetails: () => [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, BlackWidowPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  required_cards: [2]
};



gGameClasses.divorce = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "s", 1, StockDealToNonemptyPiles, StockView, 0, 0,
    "p", 10, SpiderPile, FanDownView, 0, 5,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],

  required_cards: [2, , , true],
};



gGameClasses.wasp = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 7, WaspPile, FanDownView, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p  [fs]   >.',
  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,
};



const SimonBase = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "p", 10, SpiderPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p p p p  f   >.',
  helpId: "simon",
};

gGameClasses.simplersimon = {
  __proto__: SimonBase,
  pileDetails: () => [
    "p", 10, BlackWidowPile, FanDownView, 0, [8,8,8,7,6,5,4,3,2,1],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ]
};

gGameClasses.simon1 = {
  __proto__: SimonBase,
  required_cards: [4, "S"]
};

gGameClasses.simon2 = {
  __proto__: SimonBase,
  required_cards: [2, "SH"]
};

gGameClasses.simon4 = {
  __proto__: SimonBase
};

gGameClasses.doublesimon = {
  __proto__: SimonBase,
  required_cards: [2],
  pileDetails: () => [
    "p", 12, SpiderPile, FanDownView, 0, [16, 16, 14, 14, 12, 10, 8, 6, 4, 2, 1, 1],
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p p p p p p  f   >.',
  helpId: "simon",
};


const SpiderPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoUpNumberOrEmpty
};


const BlackWidowPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeDescendingRun,
  mayAddCard: mayAddOntoUpNumberOrEmpty,
  getHintSources: function() {
    const sources = [];
    const cs = this.cards;
    for(var j = cs.length; j;) {
      var card = cs[--j];
      if(!card.faceUp) break;
      var prv = this.getCard(j - 1);
      if(prv && prv.faceUp && prv.number === card.upNumber && prv.suit === card.suit) continue;
      sources.push(card);
      if(prv.number !== card.upNumber) break;
    }
    // longer-run hints are probably better, so show those first
    return sources.reverse();
  }
};

const SpiderFoundation = {
  __proto__: NoWorryingBackFoundation,

  // This is typically only used for drag+drop (not autoplay), so needn't be optimal.
  // (For classic Spider it duplicates much of the work of card.mayTake.)
  mayAddCard: function(card) {
    const cs = card.pile.cards, len = cs.length, suit = card.suit;
    if(card.index !== len - 13) return false;
    for(var i = card.index, j = i + 1; j !== len; ++i, ++j)
      if(cs[i].suit !== cs[j].suit || cs[i].number !== cs[j].upNumber) return false;
    return true;
  }
};
