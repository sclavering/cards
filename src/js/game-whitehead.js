gGameClasses.whitehead = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, WhiteheadPile, FanDownView, 0, [1, 2, 3, 4, 5, 6, 7],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',

  best_destination_for: function(card) {
    return find_pile_by_top_card(this.piles, top => is_next_in_suit(card, top))
        || find_pile_by_top_card(this.piles, top => is_next_and_same_colour(card, top))
        || findEmpty(this.piles);
  },

  autoplay: autoplay_default,

  autoplayable_numbers: function() {
    const nums = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap = { S: 'C', H: 'D', D: 'H', C: 'S' }; // other suit of same colour
    for(let f of this.foundations) {
      let c = f.lastCard;
      if(c) nums[suitmap[c.suit]] = c.number + 1;
    }
    return nums;
  },
};


const WhiteheadPile = {
  __proto__: Pile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    const last = this.lastCard;
    return last ? is_next_and_same_colour(card, last) : true;
  },
};
