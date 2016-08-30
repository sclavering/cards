// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: Game,

  layoutTemplate: '#<   p p p p p p p p p p  [fs]   >.',

  best_destination_for: function(cseq) {
    const card = cseq.first;
    const ps = cseq.source.surrounding();
    return find_pile_by_top_card(ps, top => is_next_in_suit(card, top)) || find_pile_by_top_card(ps, top => is_next(card, top)) || findEmpty(ps);
  },

  autoplay: function() {
    const f = this.foundation;
    for(let p of this.piles) {
      let n = p.cards.length - 13;
      if(n < 0) continue;
      let c = p.cards[n];
      if(c.pile.may_take_card(c) && f.may_add_card(c)) return new Move(c, f);
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
  init_cards: () => make_cards(8, "S"),
};

gGameClasses.spider2 = {
  __proto__: Spider,
  init_cards: () => make_cards(4, "SH"),
};

gGameClasses.spider4 = {
  __proto__: Spider,
  init_cards: () => make_cards(2),
};



gGameClasses.blackwidow = {
  __proto__: Spider,
  helpId: null,
  pileDetails: () => [
    "s", 1, StockDealToPilesIfNoneAreEmpty, StockView, 0, 0,
    "p", 10, BlackWidowPile, FanDownView, [5,5,5,5,4,4,4,4,4,4], 1,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  init_cards: () => make_cards(2),
};



gGameClasses.divorce = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "s", 1, StockDealToNonemptyPiles, StockView, 0, 0,
    "p", 10, DivorcePile, FanDownView, 0, 5,
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],

  init_cards: () => make_cards(2),

  // Can't re-use the standard Spider version because it doesn't do ace->king wraparound.
  best_destination_for: function(cseq) {
    const card = cseq.first;
    const ps = cseq.source.surrounding();
    return find_pile_by_top_card(ps, top => is_next_in_suit_mod13(card, top)) || find_pile_by_top_card(ps, top => is_next_mod13(card, top)) || findEmpty(ps);
  },
};



gGameClasses.wasp = {
  __proto__: SpiderBase,
  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 7, WaspPile, FanDownView, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7],
    "f", 1, SpiderFoundation, Spider4FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p  [fs]   >.',
  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,
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
  init_cards: () => make_cards(4, "S"),
};

gGameClasses.simon2 = {
  __proto__: SimonBase,
  init_cards: () => make_cards(2, "SH"),
};

gGameClasses.simon4 = {
  __proto__: SimonBase
};

gGameClasses.doublesimon = {
  __proto__: SimonBase,
  init_cards: () => make_cards(2),
  pileDetails: () => [
    "p", 12, SpiderPile, FanDownView, 0, [16, 16, 14, 14, 12, 10, 8, 6, 4, 2, 1, 1],
    "f", 1, SpiderFoundation, Spider8FoundationView, 0, 0,
  ],
  layoutTemplate: '#<   p p p p p p p p p p p p  f   >.',
  helpId: "simon",
};


const SpiderPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeRunningFlush,
  may_add_card: mayAddOntoUpNumberOrEmpty
};


const DivorcePile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: function(card) {
    return card.faceUp && check_consecutive_cards(card, is_next_in_suit_mod13);
  },
  may_add_card: function(card) {
    return !this.hasCards || is_next_mod13(card, this.lastCard);
  },
};


const BlackWidowPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeDescendingRun,
  may_add_card: mayAddOntoUpNumberOrEmpty,
  hint_sources: function() {
    const sources = [];
    const cs = this.cards;
    for(var j = cs.length; j;) {
      var card = cs[--j];
      if(!card.faceUp) break;
      let prv = j >= 1 ? this.cards[j - 1] : null;
      if(prv && prv.faceUp && prv.number === card.number + 1 && prv.suit === card.suit) continue;
      sources.push(card);
      if(prv.number !== card.number + 1) break;
    }
    // longer-run hints are probably better, so show those first
    return sources.reverse();
  }
};


const SpiderFoundation = {
  __proto__: Pile,
  is_foundation: true,
  may_take_card: _ => false,
  may_add_card: function(card) {
    return card.number === 13 && check_count_and_consecutive_cards(card, 13, is_next_in_suit);
  },
};
