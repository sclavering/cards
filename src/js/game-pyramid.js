class PyramidGame extends Game {
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

  init() {
    const leftkid = [1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26], lknum = 21;
    const ps = this.piles;

    for(let i = 0; i !== lknum; ++i) {
      let lk = leftkid[i];
      let p = ps[i], l = ps[lk], r = ps[lk + 1];
      p.leftChild = l; l.rightParent = p;
      p.rightChild = r; r.leftParent = p;
    }
  }

  best_action_for(cseq) {
    const card = cseq.first;
    return card.number === 13 && card.pile.may_take_card(card) ? new RemovePair(card, null) : null;
  }

  // This game has no autoplay

  is_won() {
    // Won once the tip of the pyramid has been removed.
    return !this.piles[0].hasCards;
  }
};
gGameClasses.pyramid = PyramidGame;


class TriPeaksGame extends Game {
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

  init() {
    const ps = this.piles;
    // indices of the leftChild's of piles 0-17 (piles 18+ have no children)
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];
    for(let i = 0; i !== 18; i++) {
      let p = ps[i], n = lefts[i], l = ps[n], r = ps[n + 1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }

    for(let i = 0; i !== 28; ++i) ps[i].isPeak = i < 3;
  }

  deal(cards) {
    let ix = 0;
    for(let p of this.piles) ix = this._deal_cards(cards, ix, p, 0, 1);
    ix = this._deal_cards(cards, ix, this.foundation, 0, 1);
    ix = this._deal_cards(cards, ix, this.stock, 52, 0);
  }

  best_destination_for(cseq) {
    return this.foundation.may_add_card(cseq.first) ? this.foundation : null;
  }

  is_won() {
    // won when the the peaks are empty
    for(var i = 0; i !== 3; i++) if(this.piles[i].hasCards) return false;
    return true;
  }

  getScoreFor(action) {
    if(action instanceof DealToPile) {
      action.streakLength = 0;
      return -5;
    }

    const acts = this.actionList, ptr = this.actionPtr;
    const prev = ptr > 1 ? acts[ptr - 2] : null;

    // it's a Move
    var score = action.streakLength = prev ? prev.streakLength + 1 : 1;

    // bonuses for removing a peak card
    var pile = action.source, ps = this.piles;
    if(pile.isPeak)
      score += (ps[0].hasCards + ps[1].hasCards + ps[2].hasCards === 1) ? 30 : 15;

    return score;
  }
};
gGameClasses.tripeaks = TriPeaksGame;


class BasePyramidPile extends _Pile {
  constructor() {
    super();
    // set in games' init()s
    this.leftParent = null;
    this.rightParent = null;
    this.leftChild = null;
    this.rightChild = null;
  }
  may_take_card(card) {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasCards && !rc.hasCards);
  }
  may_add_card(card) {
    return false;
  }
};

class PyramidPile extends BasePyramidPile {
  action_for_drop(cseq) {
    const card = cseq.first;
    const c = this.firstCard;
    if(!c || card.number + c.number !== 13) return null;
    const l = this.leftChild, lc = l && l.firstCard;
    const r = this.rightChild, rc = r && r.firstCard;
    // can move if the only card covering this is the card being dragged
    // (which remains part of its source pile during dragging)
    return !l || ((!lc || lc === card) && (!rc || rc === card)) ? new RemovePair(card, c) : null;
  }
};

class PyramidFoundation extends _Foundation {
  may_take_card(card) {
    return false;
  }
  may_add_card(card) {
    return false;
  }
  action_for_drop(cseq) {
    const card = cseq.first;
    return card.number === 13 ? new RemovePair(card, null) : null;
  }
};

class PyramidWaste extends Waste {
  constructor() {
    super();
    this.is_drop_target = true;
  }
  action_for_drop(cseq) {
    const card = cseq.first;
    const c = this.lastCard;
    return c && card.number + c.number === 13 ? new RemovePair(card, c) : null;
  }
};
