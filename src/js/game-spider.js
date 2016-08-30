// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

const SpiderBase = {
  __proto__: Game,

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
  static_create_layout() {
    return new Layout("#<   p p p p p p p p p p  [fs]   >.", { f: Spider8FoundationView });
  },
};

const StandardSpider = {
  __proto__: Spider,
  pile_details: () => ({
    stocks: [1, StockDealToPilesIfNoneAreEmpty, 0, 0],
    piles: [10, SpiderPile, [5,5,5,5,4,4,4,4,4,4], 1],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
  helpId: "spider",
};

gGameClasses.spider1 = {
  __proto__: StandardSpider,
  init_cards: () => make_cards(8, "S"),
};

gGameClasses.spider2 = {
  __proto__: StandardSpider,
  init_cards: () => make_cards(4, "SH"),
};

gGameClasses.spider4 = {
  __proto__: StandardSpider,
  init_cards: () => make_cards(2),
};

gGameClasses.blackwidow = {
  __proto__: Spider,
  helpId: null,
  pile_details: () => ({
    stocks: [1, StockDealToPilesIfNoneAreEmpty, 0, 0],
    piles: [10, BlackWidowPile, [5,5,5,5,4,4,4,4,4,4], 1],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
  init_cards: () => make_cards(2),
};

gGameClasses.divorce = {
  __proto__: Spider,
  pile_details: () => ({
    stocks: [1, StockDealToNonemptyPiles, 0, 0],
    piles: [10, DivorcePile, 0, 5],
    foundations: [1, SpiderFoundation, 0, 0],
  }),

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
  pile_details: () => ({
    stocks: [1, StockDealToPiles, 0, 0],
    piles: [7, WaspPile, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7]],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<   p p p p p p p  [fs]   >.", { f: Spider4FoundationView });
  },
  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,
};



const SimonBase = {
  __proto__: SpiderBase,
  pile_details: () => ({
    piles: [10, SpiderPile, 0, [8,8,8,7,6,5,4,3,2,1]],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<   p p p p p p p p p p  f   >.", { f: Spider4FoundationView });
  },
  helpId: "simon",
};

gGameClasses.simplersimon = {
  __proto__: SimonBase,
  pile_details: () => ({
    piles: [10, BlackWidowPile, 0, [8,8,8,7,6,5,4,3,2,1]],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
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
  pile_details: () => ({
    piles: [12, SpiderPile, 0, [16, 16, 14, 14, 12, 10, 8, 6, 4, 2, 1, 1]],
    foundations: [1, SpiderFoundation, 0, 0],
  }),
  static_create_layout() {
    return new Layout("#<   p p p p p p p p p p p p  f   >.", { f: Spider8FoundationView });
  },
  helpId: "simon",
};


class SpiderPile extends _Pile {
  may_take_card(card) {
    return may_take_running_flush(card);
  }
  may_add_card(card) {
    return !this.hasCards || this.lastCard.number === card.number + 1;
  }
};


class DivorcePile extends _Pile {
  may_take_card(card) {
    return card.faceUp && check_consecutive_cards(card, is_next_in_suit_mod13);
  }
  may_add_card(card) {
    return !this.hasCards || is_next_mod13(card, this.lastCard);
  }
};


class BlackWidowPile extends SpiderPile {
  may_take_card(card) {
    return may_take_descending_run(card);
  }
  hint_sources() {
    const sources = [];
    const cs = this.cards;
    for(var j = cs.length; j;) {
      let card = cs[--j];
      if(!card.faceUp) break;
      let prv = j >= 1 ? this.cards[j - 1] : null;
      if(prv && prv.faceUp && prv.number === card.number + 1 && prv.suit === card.suit) continue;
      sources.push(card);
      if(!prv || prv.number !== card.number + 1) break;
    }
    // longer-run hints are probably better, so show those first
    return sources.reverse();
  }
};


class SpiderFoundation extends _Foundation {
  may_take_card() {
    return false;
  }
  may_add_card(card) {
    return card.number === 13 && check_count_and_consecutive_cards(card, 13, is_next_in_suit);
  }
};
