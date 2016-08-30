gGameClasses.whitehead = {
  __proto__: Game,

  pile_details: () => ({
    stocks: [1, StockDealToWaste, 0, 0],
    wastes: [1, Waste, 0, 0],
    piles: [7, WhiteheadPile, 0, [1, 2, 3, 4, 5, 6, 7]],
    foundations: [4, KlondikeFoundation, 0, 0],
  }),

  static_create_layout() {
    return new Layout("#<    s w  f f f f    >.#<   p p p p p p p   >.");
  },

  best_destination_for: function(cseq) {
    return find_pile_by_top_card(this.piles, top => is_next_in_suit(cseq.first, top))
        || find_pile_by_top_card(this.piles, top => is_next_and_same_colour(cseq.first, top))
        || findEmpty(this.piles);
  },

  autoplay: function() {
    const nums = { S: 2, H: 2, D: 2, C: 2 }; // can always play an Ace or two
    const suitmap = { S: 'C', H: 'D', D: 'H', C: 'S' }; // other suit of same colour
    for(let f of this.foundations) {
      let c = f.lastCard;
      if(c) nums[suitmap[c.suit]] = c.number + 1;
    }
    return this.autoplay_using_predicate(card => card.number <= nums[card.suit]);
  },
};


class WhiteheadPile extends _Pile {
  may_take_card(card) {
    return may_take_running_flush(card);
  }
  may_add_card(card) {
    const last = this.lastCard;
    return last ? is_next_and_same_colour(card, last) : true;
  }
};
