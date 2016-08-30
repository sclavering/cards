gGameClasses.whitehead = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, WhiteheadPile, FanDownView, 0, [1, 2, 3, 4, 5, 6, 7],
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',

  best_destination_for: function(cseq) {
    return find_pile_by_top_card(this.piles, top => is_next_in_suit(cseq.first, top))
        || find_pile_by_top_card(this.piles, top => is_next_and_same_colour(cseq.first, top))
        || findEmpty(this.piles);
  },

  autoplay: autoplay_default,

  autoplayable_predicate: function() {
    const nums = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap = { S: 'C', H: 'D', D: 'H', C: 'S' }; // other suit of same colour
    for(let f of this.foundations) {
      let c = f.lastCard;
      if(c) nums[suitmap[c.suit]] = c.number + 1;
    }
    return card => card.number <= nums[card.suit];
  },
};


const WhiteheadPile = {
  __proto__: Pile,
  is_pile: true,
  may_take_card: mayTakeRunningFlush,
  may_add_card: function(card) {
    const last = this.lastCard;
    return last ? is_next_and_same_colour(card, last) : true;
  },
};
