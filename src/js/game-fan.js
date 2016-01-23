const FanLayoutProto = {
  __proto__: Layout,
  // No other layout has a grid of flexible views
  update_flexible_views_sizes: function(views, width, height) {
    const kSpaceBetweenPiles = 4 * gSpacerSize;
    // 5 units per each of the columns, plus 2 to the left of everything, and 3 to the right.
    const unitwidth = (width - kSpaceBetweenPiles) / (5 * this._num_grid_columns + 2 + 2);
    // div.thinspacer in the previous <td>
    views[0]._canvas.parentNode.previousSibling.firstChild.style.width = (2 * unitwidth) + 'px';
    for(let v of views) v.canvas_width = unitwidth * 5;
  },
};


gGameClasses.fan = {
  __proto__: Game,

  pileDetails: () => [
    "p", 18, FanPile, FanRightView, 0, 3, // last pile gets just 1
    "f", 4, FanFoundation, View, 0, 0,
  ],

  layoutTemplate: "#<  f f f f  >.#<_p_p_p_p_p_>< p_p_p_p_p>< p_p_p_p_p>< p_p_p>.",

  layoutProto: {
    __proto__: FanLayoutProto,
    _num_grid_columns: 5,
  },

  foundationBaseIndexes: [0, 13, 26, 39],

  is_shuffle_impossible: function(cards) {
    for(let i = 0; i < 51; i += 3) {
      // These will form a pile c,d,e with c at the bottom.
      let c = cards[i], d = cards[i + 1], e = cards[i + 2];
      // A pile such as 4C,9C,8C is impossible.
      if(c.suit === d.suit && is_next_in_suit(e, d) && c.number < e.number) return true;
      // A pile such as JH,5H,10H is impossible.
      if(c.suit === d.suit && is_next_in_suit(e, c) && d.number < e.number) return true;
    }
    return false;
  },

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_card,
};


gGameClasses.doublefan = {
  __proto__: Game,

  init_cards: () => make_cards(2),

  foundation_cluster_count: 4,

  pileDetails: () => [
    "p", 24, FanPile, FanRightView, 0, 5,
    "f", 8, FanFoundation, View, 0, 0,
  ],

  layoutTemplate: "#<  f f f f f f f f  >.#<_p_p_p_p_p_p_>< p_p_p_p_p_p>< p_p_p_p_p_p>< p_p_p_p_p_p>.",

  layoutProto: {
    __proto__: FanLayoutProto,
    _num_grid_columns: 6,
  },

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};
