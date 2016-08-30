const canfield_layout = "#<   s  f f f f  [r]   ><   w  p p p p>.";

const CanfieldBase = {
  __proto__: Game,

  // Note: subclasses wrap this
  pile_details: () => ({
    stocks: [1, StockDealToWasteOrRefill, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [4, CanfieldPile, 0, 0],
    foundations: [4, CanfieldFoundation, 0, 0],
    reserves: [1, Reserve, 0, 0],
  }),
  _reserveFaceDown: 12,
  _reserveFaceUp: 1,

  static_create_layout() {
    return new Layout(canfield_layout, { f: CountedView, r: CountedView });
  },

  helpId: "canfield",

  deal: function(cards) {
    const num = cards[0].number;
    for(let f of this.foundations) f.canfield_foundation_base_num = num;

    let ix = 0;
    ix = this._deal_cards(cards, ix, this.foundations[0], 0, 1);
    ix = this._deal_cards(cards, ix, this.reserve, this._reserveFaceDown, this._reserveFaceUp);
    for(let p of this.piles) ix = this._deal_cards(cards, ix, p, 0, 1);
    this._deal_cards(cards, ix, this.stock, 52, 0);
  },

  best_destination_for: best_destination_for__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate: function() {
    const base_num = this.foundations[0].canfield_foundation_base_num;
    // Remap numbers so that we can just use less-than on them.
    const _effective_num = num => num >= base_num ? num : num + 13;
    const max_nums = { S: base_num, H: base_num, D: base_num, C: base_num };
    for(let f of this.foundations) if(f.hasCards) max_nums[f.firstCard.suit] = _effective_num(f.lastCard.number);
    // As in Klondike, if all the black "threes" are up, you can autoplay red "fours", and you can always autoplay "twos".  It's just that the "aces" is instead base_num, etc.
    const autoplayable = { R: Math.min(max_nums.S, max_nums.C) + 1, B: Math.min(max_nums.H, max_nums.D) + 1 };
    return card => _effective_num(card.number) <= autoplayable[card.colour];
  },
};

gGameClasses.canfield = {
  __proto__: CanfieldBase,
};

gGameClasses.canfield3 = {
  __proto__: CanfieldBase,
  pile_details: function() {
    const rv = CanfieldBase.pile_details();
    rv.stocks[1] = StockDeal3OrRefill;
    return rv;
  },
  static_create_layout() {
    // Waste view is different
    return new Layout(canfield_layout, { f: CountedView, r: CountedView, w: Deal3VWasteView });
  },
};

gGameClasses.demon = {
  __proto__: CanfieldBase,
  _reserveFaceDown: 0,
  _reserveFaceUp: 13,
  static_create_layout() {
    // Reserve view is different
    return new Layout(canfield_layout, { f: CountedView, r: FanDownView });
  },
};


class CanfieldPile extends _Pile {
  may_take_card(card) {
    return card.faceUp;
  }
  may_add_card(card) {
    return !this.hasCards || is_next_and_alt_colour_mod13(card, this.lastCard);
  }
};


class CanfieldFoundation extends _Foundation {
  may_take_card(card) {
    return card.isLast;
  }
  may_add_card(card) {
    return this.hasCards ? is_next_in_suit_mod13(this.lastCard, card) : card.number === this.canfield_foundation_base_num;
  }
};
