class BasePyramidGame extends Game {
  init_pyramid_links(left_child_indexes: number[]) {
    const ps = this.piles as BasePyramidPile[];
    left_child_indexes.forEach((lk, i) => {
      const p = ps[i], l = ps[lk], r = ps[lk + 1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
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
    return !this.piles[0].hasCards;
  }
};
gGameClasses["pyramid"] = PyramidGame;


class TriPeaksGame extends BasePyramidGame {
  static create_layout() {
    return new Layout("[{class=pyramidlayout}#<     -  =  p  =  =  p  =  =  p  =  -     >.#<      =  p  p  =  p  p  =  p  p  =      >.#<     -  p  p  p  p  p  p  p  p  p  -     >.#<      p  p  p  p  p  p  p  p  p  p      >.]____#<   s  f   >.", { p: TriPeaksView });
  }

  constructor() {
    super();
    this.pile_details = {
      stocks: [1, StockDealToFoundation, 0, 0],
      piles: [28, BasePyramidPile, 0, 0],
      foundations: [1, UpDownMod13Foundation, 0, 0],
    };
    this.hasScoring = true;
  }

  protected init() {
    this.init_pyramid_links([3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26]);
    const ps = this.piles as BasePyramidPile[];
    for(let i = 0; i !== 28; ++i) ps[i].isPeak = i < 3;
  }

  protected deal(cards: Card[]): void {
    let ix = 0;
    for(let p of this.piles) ix = this.deal_cards(cards, ix, p, 0, 1);
    ix = this.deal_cards(cards, ix, this.foundation, 0, 1);
    ix = this.deal_cards(cards, ix, this.stock, 52, 0);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.foundation.may_add(cseq) ? this.foundation : null;
  }

  is_won(): boolean {
    // won when the the peaks are empty
    for(var i = 0; i !== 3; i++) if(this.piles[i].hasCards) return false;
    return true;
  }

  protected getScoreFor(action: Action): number {
    if(action instanceof DealToPile) {
      (action as Action).streakLength = 0;
      return -5;
    }

    const acts = this.actionList, ptr = this.actionPtr;
    const prev = ptr > 1 ? acts[ptr - 2] : null;

    // it's a Move
    let score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // Bonuses for removing a peak card
    if(((action as Move).cseq.source as BasePyramidPile).isPeak) {
      const ps = this.piles;
      const num_on_peaks = ps[0].cards.length + ps[1].cards.length + ps[2].cards.length;
      score += num_on_peaks === 1 ? 30 : 15;
    }

    return score;
  }
};
gGameClasses["tripeaks"] = TriPeaksGame;


class BasePyramidPile extends Pile {
  public isPeak: boolean;
  public leftParent: BasePyramidPile;
  public rightParent: BasePyramidPile;
  public leftChild: BasePyramidPile;
  public rightChild: BasePyramidPile;
  constructor() {
    super();
    // set in games' init()s
    this.leftParent = null;
    this.rightParent = null;
    this.leftChild = null;
    this.rightChild = null;
  }
  may_take(cseq: CardSequence): boolean {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasCards && !rc.hasCards);
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
    if(!this.leftChild) return true; // Cards on the bottom row is always free.
    return (!this.leftChild.hasCards || this.leftChild === cseq.source)
        && (!this.rightChild.hasCards || this.rightChild === cseq.source);
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
