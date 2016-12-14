class FanLayout extends Layout {
  private _num_grid_columns: number;
  constructor(num_grid_columns: number, template: string) {
    super(template, { p: FanRightView });
    this._num_grid_columns = num_grid_columns;
  }
  // No other layout has a grid of flexible views
  update_flexible_views_sizes(views: View[], width: number, height: number): void {
    const space_between_piles = 4 * g_spacer_size;
    // 5 units per each of the columns, plus 2 to the left of everything, and 3 to the right.
    const unitwidth = (width - space_between_piles) / (5 * this._num_grid_columns + 2 + 2);
    // div.thinspacer in the previous <td>
    (views[0]._canvas.parentNode.previousSibling.firstChild as HTMLElement).style.width = (2 * unitwidth) + "px";
    for(let v of views) v.canvas_width = unitwidth * 5;
  }
};


class FanGame extends Game {
  static create_layout() {
    return new FanLayout(5, "#<  f f f f  >.#<_p_p_p_p_p_>< p_p_p_p_p>< p_p_p_p_p>< p_p_p>.");
  }

  constructor() {
    super();
    this.pile_details = {
      piles: [18, FanPile, 0, 3], // last pile gets just 1
      foundations: [4, KlondikeFoundation, 0, 0],
    };
  }

  protected is_shuffle_impossible(): boolean {
    for(let p of this.piles) {
      if(p.cards.length < 3) continue;
      // These will form a pile c,d,e with c at the bottom.
      let c = p.cards[0], d = p.cards[1], e = p.cards[2];
      // A pile such as 4C,9C,8C is impossible.
      if(card_suit(c) === card_suit(d) && is_next_in_suit(e, d) && card_number(c) < card_number(e)) return true;
      // A pile such as JH,5H,10H is impossible.
      if(card_suit(c) === card_suit(d) && is_next_in_suit(e, c) && card_number(d) < card_number(e)) return true;
    }
    return false;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(_ => true);
  }
};
g_game_classes["fan"] = FanGame;


class DoubleFanGame extends Game {
  static create_layout() {
    return new FanLayout(6, "#<  f f f f f f f f  >.#<_p_p_p_p_p_p_>< p_p_p_p_p_p>< p_p_p_p_p_p>< p_p_p_p_p_p>.");
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

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile(cseq);
  }

  autoplay() {
    return this.autoplay_using_predicate(autoplay_any_where_all_lower_of_same_suit_are_on_foundations(this.foundations));
  }
};
g_game_classes["doublefan"] = DoubleFanGame;
