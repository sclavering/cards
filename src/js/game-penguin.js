gGameClasses.penguin = {
  __proto__: Game,

  pileDetails: () => [
    "p", 7, PenguinPile, FanDownView, 0, 0,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 7, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<   c c c c c c c  [ffff]   ><   p p p p p p p>.',

  deal: function(cards) {
    const aces = cards.filter(c => c.number === 1);
    const others = cards.filter(c => c.number !== 1);
    this._deal_cards(aces, 0, this.piles[0], 0, 1);
    for(let i = 0; i < 3; ++i) this._deal_cards(aces, i + 1, this.foundations[i], 0, 1);
    let ix = 0;
    for(let i = 0; i < 7; ++i) ix = this._deal_cards(others, ix, this.piles[i], 0, i ? 7 : 6);
  },

  best_destination_for: find_destination__nearest_legal_pile_or_cell,

  autoplay: autoplay_default,

  autoplayable_predicate() { return _ => true; },
};


const PenguinPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeRunningFlush,
  may_add_card: function(card) {
    return this.hasCards ? is_next_in_suit(card, this.lastCard) : card.number === 13;
  },
};
