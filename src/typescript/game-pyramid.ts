class BasePyramidGame extends Game {
  init_pyramid_links(left_child_indexes: number[]) {
    const ps = this.piles as BasePyramidPile[];
    left_child_indexes.forEach((lk, i) => {
      const p = ps[i], l = ps[lk], r = ps[lk + 1];
      p.left_child = l;
      l.right_parent = p;
      p.right_child = r;
      r.left_parent = p;
    });
  }
}

class PyramidGame extends BasePyramidGame {
  static create_layout() {
    return new Layout("#<   [sw] [{class=pyramidlayout}#< p >.#< p_p >.#< p_p_p >.#< p_p_p_p >.#< p_p_p_p_p >.#< p_p_p_p_p_p >.#<p_p_p_p_p_p_p>.] f   >.", { p: PyramidView, f: CountedView });
  }

  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToWasteOrRefill, 0, 0],
      wastes: [1, PyramidWaste, 0, 0],
      piles: [28, PyramidPile, 0, 1],
      foundations: [1, PyramidFoundation, 0, 0],
    };
  }

  protected init() {
    this.init_pyramid_links([1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26]);
  }

  best_action_for(cseq: CardSequence): Action {
    const card = cseq.first;
    return card.number === 13 && cseq.source.may_take(cseq) ? new RemovePair(cseq, null) : null;
  }

  // This game has no autoplay

  is_won(): boolean {
    // Won once the tip of the pyramid has been removed.
    return !this.piles[0].cards.length;
  }
};
g_game_classes["pyramid"] = PyramidGame;


class TriPeaksGame extends BasePyramidGame {
  static create_layout() {
    return new Layout("[{class=pyramidlayout}#<     -  =  p  =  =  p  =  =  p  =  -     >.#<      =  p  p  =  p  p  =  p  p  =      >.#<     -  p  p  p  p  p  p  p  p  p  -     >.#<      p  p  p  p  p  p  p  p  p  p      >.]____#<   s  f   >.", { p: TriPeaksView });
  }

  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToFoundation, 0, 0],
      piles: [28, BasePyramidPile, 0, 1],
      foundations: [1, UpDownMod13Foundation, 0, 1],
    };
    this.has_scoring = true;
  }

  protected init() {
    this.init_pyramid_links([3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26]);
    const ps = this.piles as BasePyramidPile[];
    for(let i = 0; i !== 28; ++i) ps[i].is_peak = i < 3;
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.foundation.may_add(cseq) ? this.foundation : null;
  }

  is_won(): boolean {
    // won when the the peaks are empty
    for(var i = 0; i !== 3; i++) if(this.piles[i].cards.length) return false;
    return true;
  }

  protected score_for(action: Action): number {
    if(action instanceof DealToPile) {
      (action as Action).streak_length = 0;
      return -5;
    }

    const acts = this.action_list, ptr = this.action_index;
    const prev = ptr > 1 ? acts[ptr - 2] : null;

    // it's a Move
    let score = action.streak_length = prev ? prev.streak_length + 1 : 1;

    // Bonuses for removing a peak card
    if(((action as Move).cseq.source as BasePyramidPile).is_peak) {
      const ps = this.piles;
      const num_on_peaks = ps[0].cards.length + ps[1].cards.length + ps[2].cards.length;
      score += num_on_peaks === 1 ? 30 : 15;
    }

    return score;
  }
};
g_game_classes["tripeaks"] = TriPeaksGame;


class BasePyramidPile extends Pile {
  public is_peak: boolean;
  public left_parent: BasePyramidPile;
  public right_parent: BasePyramidPile;
  public left_child: BasePyramidPile;
  public right_child: BasePyramidPile;
  constructor() {
    super();
    // set in games' init()s
    this.left_parent = null;
    this.right_parent = null;
    this.left_child = null;
    this.right_child = null;
  }
  may_take(cseq: CardSequence): boolean {
    const lc = this.left_child, rc = this.right_child;
    return !lc || (!lc.cards.length && !rc.cards.length);
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
};

class PyramidPile extends BasePyramidPile {
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    const our_card = this.cseq_at(0);
    return our_card && this._can_remove_pair(cseq, our_card) ? new RemovePair(cseq, our_card) : null;
  }
  private _can_remove_pair(cseq: CardSequence, our_card: CardSequence): boolean {
    if(cseq.first.number + our_card.first.number !== 13) return false;
    if(!this.left_child) return true; // Cards on the bottom row is always free.
    return (!this.left_child.cards.length || this.left_child === cseq.source)
        && (!this.right_child.cards.length || this.right_child === cseq.source);
  }
};

class PyramidFoundation extends Foundation {
  may_take(cseq: CardSequence): boolean {
    return false;
  }
  may_add(cseq: CardSequence): boolean {
    return false;
  }
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    return cseq.first.number === 13 ? new RemovePair(cseq, null) : null;
  }
};

class PyramidWaste extends Waste {
  action_for_drop(cseq: CardSequence): Action | ErrorMsg {
    const last = this.cseq_at_negative(-1);
    return last && cseq.first.number + last.first.number === 13 ? new RemovePair(cseq, last) : null;
  }
};
