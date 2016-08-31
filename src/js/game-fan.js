class FanLayout extends Layout {
  constructor(num_grid_columns, template, view_classes_by_letter) {
    super(template, view_classes_by_letter);
    this._num_grid_columns = num_grid_columns;
  }
  // No other layout has a grid of flexible views
  update_flexible_views_sizes(views, width, height) {
    const kSpaceBetweenPiles = 4 * gSpacerSize;
    // 5 units per each of the columns, plus 2 to the left of everything, and 3 to the right.
    const unitwidth = (width - kSpaceBetweenPiles) / (5 * this._num_grid_columns + 2 + 2);
    // div.thinspacer in the previous <td>
    views[0]._canvas.parentNode.previousSibling.firstChild.style.width = (2 * unitwidth) + 'px';
    for(let v of views) v.canvas_width = unitwidth * 5;
  }
};


class FanGame extends Game {
  static create_layout() {
    return new FanLayout(5, "#<  f f f f  >.#<_p_p_p_p_p_>< p_p_p_p_p>< p_p_p_p_p>< p_p_p>.", { p: FanRightView });
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [18, FanPile, 0, 3], // last pile gets just 1
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }

  is_shuffle_impossible(cards) {
    for(let i = 0; i < 51; i += 3) {
      // These will form a pile c,d,e with c at the bottom.
      let c = cards[i], d = cards[i + 1], e = cards[i + 2];
      // A pile such as 4C,9C,8C is impossible.
      if(c.suit === d.suit && is_next_in_suit(e, d) && c.number < e.number) return true;
      // A pile such as JH,5H,10H is impossible.
      if(c.suit === d.suit && is_next_in_suit(e, c) && d.number < e.number) return true;
    }
    return false;
  }

  best_destination_for(cseq) {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
gGameClasses.fan = FanGame;


class DoubleFanGame extends Game {
  static create_layout() {
    return new FanLayout(6, "#<  f f f f f f f f  >.#<_p_p_p_p_p_p_>< p_p_p_p_p_p>< p_p_p_p_p_p>< p_p_p_p_p_p>.", { p: FanRightView });
  }

  constructor() {
    super();
    this.all_cards = make_cards(2);
    this.pile_details = {
      piles: [24, FanPile, 0, 5],
      foundations: [8, KlondikeFoundation, 0, 0],
    };
    this.foundation_cluster_count = 4;
  }

  best_destination_for(cseq) {
    return this.best_destination_for__nearest_legal_pile(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_same_suit_are_on_foundations(this.foundations));
  }
};
gGameClasses.doublefan = DoubleFanGame;
