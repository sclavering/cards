class _Klondike extends Game {
  constructor() {
    super();
    this.hasScoring = true;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(this.foundations));
  }

  getScoreFor(act: Action) {
    if(act instanceof RefillStock) return -100;
    if(act instanceof Move) return this._get_score(act) + (act.revealed_card ? 5 : 0);
    return 0;
  }

  _get_score(act: Move): number {
    const c = act.card, s = act.source, d = act.destination;
    // If a card on the waste *could* be moved down to the playing piles (for 5 points)
    // then award those points event when moving it directly to the foundations.
    if(s.is_waste && d.is_foundation) {
      for(let p of this.piles)
        if(p.may_add_card(c))
          return 15;
      return 10;
    }
    if(d.is_foundation) return s.is_foundation ? 0 : 10;
    if(s.is_foundation) return -15;
    return s.is_waste ? 5 : 0;
  }
};


class KlondikeGame extends _Klondike {
  static create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.");
  }
  constructor() {
    super();
    this.helpId = "klondike";
    this.pile_details = {
      stocks: [1, StockDealToWasteOrRefill, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }
};
gGameClasses["klondike1"] = KlondikeGame;


class KlondikeDrawThreeGame extends _Klondike {
  static create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.", { w: Deal3HWasteView });
  }
  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDeal3OrRefill, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [7, KlondikePile, [0,1,2,3,4,5,6], 1],
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }
};
gGameClasses["klondike3"] = KlondikeDrawThreeGame;


class DoubleKlondikeGame extends _Klondike {
  static create_layout() {
    return new Layout("#<   s w   f f f f f f f f   >.#<   p p p p p p p p p p   >.");
  }
  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      stocks: [1, StockDealToWasteOrRefill, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [10, KlondikePile, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
    this.foundation_cluster_count = 4;
  }
  autoplay() {
    // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_other_colour_are_on_foundations(this.foundations));
  }
};
gGameClasses["doubleklondike"] = DoubleKlondikeGame;
