gGameClasses.penguin = {
  __proto__: Game,

  pileDetails: () => [
    "p", 7, PenguinPile, FanDownView, 0, 0,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 7, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<   c c c c c c c  [ffff]   ><   p p p p p p p>.',

  foundationBaseIndexes: [0, 13, 26, 39],

  deal: function(cards) {
    const aces = cards.filter(c => c.isAce);
    const others = cards.filter(c => !c.isAce);
    this._deal_cards(aces, 0, this.piles[0], 0, 1);
    for(let i = 0; i < 3; ++i) this._deal_cards(aces, i + 1, this.foundations[i], 0, 1);
    let ix = 0;
    for(let i = 0; i < 7; ++i) ix = this._deal_cards(others, ix, this.piles[i], 0, i ? 7 : 6);
  },

  best_destination_for: find_destination__nearest_legal_pile_or_cell,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_card,
};


const PenguinPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: mayAddOntoDotUpOrPutKingInSpace
};
