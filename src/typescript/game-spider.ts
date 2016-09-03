// Spider, Black Widow, Grounds for Divorce, Wasp, and Simple Simon
// ids: blackwidow, divorce, wasp, spider-1suit, spider-2suits, spider, simon-1suit, simon-2suits, simon

class _SpiderRelatedGame extends Game {
  protected best_destination_for(cseq: CardSequence): AnyPile {
    const card = cseq.first;
    const ps = cseq.source.surrounding();
    return find_pile_by_top_card(ps, top => is_next_in_suit(card, top)) || find_pile_by_top_card(ps, top => is_next(card, top)) || findEmpty(ps);
  }

  autoplay() {
    const f = this.foundation;
    for(let p of this.piles) {
      let n = p.cards.length - 13;
      if(n < 0) continue;
      let c = p.cards[n];
      if(c.pile.may_take(CardSequence.from_card(c)) && f.may_add_card(c)) return new Move(c, f);
    }
    return null;
  }
};



class _SpiderLayoutGame extends _SpiderRelatedGame {
  static create_layout() {
    return new Layout("#<   p p p p p p p p p p  [fs]   >.", { f: Spider8FoundationView });
  }
};

class _StandardSpider extends _SpiderLayoutGame {
  constructor() {
    super();
    this.helpId = "spider";
    this.pile_details = {
      stocks: [1, StockDealToPilesIfNoneAreEmpty, 0, 0],
      piles: [10, SpiderPile, [5,5,5,5,4,4,4,4,4,4], 1],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
};

class Spider1Game extends _StandardSpider {
  constructor() {
    super();
    this.all_cards = make_cards(8, "S");
  }
};
gGameClasses["spider1"] = Spider1Game;

class Spider2Game extends _StandardSpider {
  constructor() {
    super();
    this.all_cards = make_cards(4, "SH");
  }
};
gGameClasses["spider2"] = Spider2Game;

class Spider4Game extends _StandardSpider {
  constructor() {
    super();
    this.all_cards = make_cards(2);
  }
};
gGameClasses["spider4"] = Spider4Game;

class BlackWidowGame extends _SpiderLayoutGame {
  constructor() {
    super();
    this.helpId = null;
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToPilesIfNoneAreEmpty, 0, 0],
      piles: [10, BlackWidowPile, [5,5,5,5,4,4,4,4,4,4], 1],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
};
gGameClasses["blackwidow"] = BlackWidowGame;

class DivorceGame extends _SpiderLayoutGame {
  constructor() {
    super();
    this.all_cards = make_cards(2),
    this.pile_details = {
      stocks: [1, StockDealToNonemptyPiles, 0, 0],
      piles: [10, DivorcePile, 0, 5],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }

  // Can't re-use the standard Spider version because it doesn't do ace->king wraparound.
  protected best_destination_for(cseq: CardSequence): AnyPile {
    const card = cseq.first;
    const ps = cseq.source.surrounding();
    return find_pile_by_top_card(ps, top => is_next_in_suit_mod13(card, top)) || find_pile_by_top_card(ps, top => is_next_mod13(card, top)) || findEmpty(ps);
  }
};
gGameClasses["divorce"] = DivorceGame;



class WaspGame extends _SpiderRelatedGame {
  static create_layout() {
    return new Layout("#<   p p p p p p p  [fs]   >.", { f: Spider4FoundationView });
  }
  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToPiles, 0, 0],
      piles: [7, WaspPile, [3,3,3,0,0,0,0], [4,4,4,7,7,7,7]],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }
};
gGameClasses["wasp"] = WaspGame;



class SimonGame extends _SpiderRelatedGame {
  static create_layout() {
    return new Layout("#<   p p p p p p p p p p  f   >.", { f: Spider4FoundationView });
  }
  constructor() {
    super();
    this.helpId = "simon";
    this.pile_details = {
      piles: [10, SpiderPile, 0, [8,8,8,7,6,5,4,3,2,1]],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
};
gGameClasses["simon4"] = SimonGame;

class SimplerSimonGame extends SimonGame {
  constructor() {
    super();
    this.pile_details = {
      piles: [10, BlackWidowPile, 0, [8,8,8,7,6,5,4,3,2,1]],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
};
gGameClasses["simplersimon"] = SimplerSimonGame;

class Simon1Game extends SimonGame {
  constructor() {
    super();
    this.all_cards = make_cards(4, "S");
  }
};
gGameClasses["simon1"] = Simon1Game;

class Simon2Game extends SimonGame {
  constructor() {
    super();
    this.all_cards = make_cards(2, "SH");
  }
};
gGameClasses["simon2"] = Simon2Game;

class DoubleSimonGame extends SimonGame {
  static create_layout() {
    return new Layout("#<   p p p p p p p p p p p p  f   >.", { f: Spider8FoundationView });
  }

  constructor() {
    super();
    this.helpId = "simon";
    this.all_cards = make_cards(2);
    this.pile_details = {
      piles: [12, SpiderPile, 0, [16, 16, 14, 14, 12, 10, 8, 6, 4, 2, 1, 1]],
      foundations: [1, SpiderFoundation, 0, 0],
    };
  }
};
gGameClasses["doublesimon"] = DoubleSimonGame;



class SpiderPile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return may_take_running_flush(cseq.first);
  }
  may_add_card(card: Card): boolean {
    return !this.hasCards || this.lastCard.number === card.number + 1;
  }
};


class DivorcePile extends _Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.first.faceUp && check_consecutive_cards(cseq.first, is_next_in_suit_mod13);
  }
  may_add_card(card: Card): boolean {
    return !this.hasCards || is_next_mod13(card, this.lastCard);
  }
};


class BlackWidowPile extends SpiderPile {
  may_take(cseq: CardSequence): boolean {
    return may_take_descending_run(cseq.first);
  }
  hint_sources() {
    const sources: Card[] = [];
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
  may_take(cseq: CardSequence) {
    return false;
  }
  may_add_card(card: Card): boolean {
    return card.number === 13 && check_count_and_consecutive_cards(card, 13, is_next_in_suit);
  }
};
