const CanfieldBase = {
  __proto__: Game,

  pileDetails: function() [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 4, CanfieldPile, FanDownView, 0, 0,
    "f", 4, KlondikeFoundation, CountedView, 0, 0,
    "r", 1, Reserve, CountedView, 0, 0,
  ],
  _reserveFaceDown: 12,
  _reserveFaceUp: 1,

  layoutTemplate: '#<   s  f f f f  [r]   ><   w  p p p p>.',

  helpId: "canfield",

  allcards: [1, , , true],

  deal: function(cards) {
    const num = cards[0].displayNum;
    for(let c of cards) c.renumber(num);

    let ix = 0;
    ix = this._deal_cards(cards, ix, this.foundations[0], 0, 1);
    ix = this._deal_cards(cards, ix, this.reserve, this._reserveFaceDown, this._reserveFaceUp);
    for(let i = 0; i !== 4; i++) ix = this._deal_cards(cards, ix, this.piles[i], 0, 1);
    this._deal_cards(cards, ix, this.stock, 52, 0);

    this.foundationBaseIndexes = [num - 1, num + 12, num + 25, num + 38];
  },

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
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
