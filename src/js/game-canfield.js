const CanfieldBase = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 4, CanfieldPile, FanDownView, 0, 0,
    "f", 4, CanfieldFoundation, CountedView, 0, 0,
    "r", 1, Reserve, CountedView, 0, 0,
  ],
  _reserveFaceDown: 12,
  _reserveFaceUp: 1,

  layoutTemplate: '#<   s  f f f f  [r]   ><   w  p p p p>.',

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

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_predicate: function() {
    const base_num = this.foundations[0].canfield_foundation_base_num;
    // Remap numbers so that we can just use less-than on them.
    const _effective_num = num => num >= base_num ? num : num + 13;
    const max_nums = { S: base_num, H: base_num, D: base_num, C: base_num };
    for(let f of this.foundations) if(f.hasCards) max_nums[f.firstCard.suit] = _effective_num(f.lastCard.number);
    // As in Klondike, if all the black "threes" are up, you can autoplay red "fours", and you can always autoplay "twos".  It's just that the "aces" is instead base_num, etc.
    const autoplayable = { R: Math.min(max_nums.S, max_nums.C) + 1, B: Math.min(max_nums.H, max_nums.D) + 1 };
    return function(card) _effective_num(card.number) <= autoplayable[card.colour];
  },
};

gGameClasses.canfield = {
  __proto__: CanfieldBase,
};

gGameClasses.canfield3 = {
  __proto__: CanfieldBase,
  pileDetails: function() {
    const rv = CanfieldBase.pileDetails();
    rv[2] = Deal3OrRefillStock; // Stock pile
    rv[9] = Deal3VWasteView; // Waste view
    return rv;
  },
};

gGameClasses.demon = {
  __proto__: CanfieldBase,
  pileDetails: function() {
    const rv = CanfieldBase.pileDetails();
    rv[27] = FanDownView; // Reserve view
    return rv;
  },
  _reserveFaceDown: 0,
  _reserveFaceUp: 13
};


const CanfieldPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeIfFaceUp,
  mayAddCard: function(card) {
    return !this.hasCards || is_next_and_alt_colour_mod13(card, this.lastCard);
  },
};


const CanfieldFoundation = {
  __proto__: Pile,
  isFoundation: true,
  mayTakeCard: ifLast,
  mayAddCard: function(card) {
    return this.hasCards ? is_next_in_suit_mod13(this.lastCard, card) : card.number === this.canfield_foundation_base_num;
  },
};
