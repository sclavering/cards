gGameClasses.pyramid = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, PyramidWaste, CountedView, 0, 0,
    "p", 28, PyramidPile, PyramidView, 0, 1,
    "f", 1, PyramidFoundation, CountedView, 0, 0,
  ],

  layoutTemplate: '#<   [sw] [{class=pyramidlayout}#< p >.#< p_p >.#< p_p_p >.#< p_p_p_p >.#< p_p_p_p_p >.#< p_p_p_p_p_p >.#<p_p_p_p_p_p_p>.] f   >.',

  init: function() {
    const leftkid = [1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26], lknum = 21;
    const ps = this.piles;

    for(var i = 0; i !== lknum; ++i) {
      var lk = leftkid[i];
      let p = ps[i], l = ps[lk], r = ps[lk + 1];
      p.leftChild = l; l.rightParent = p;
      p.rightChild = r; r.leftParent = p;
    }
  },

  getBestActionFor: function(card) {
    return card.isKing && card.mayTake ? new RemovePair(card, null) : null;
  },

  // this game has no autoplay

  is_won: function() {
    // won when the tip of the pyramid has been removed
    return !this.piles[0].hasCards;
  }
};


gGameClasses.tripeaks = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToFoundation, StockView, 0, 0,
    "p", 28, TriPeaksPile, PyramidView, 0, 0,
    "f", 1, GolfFoundation, View, 0, 0,
  ],

  layoutTemplate: '[{class=pyramidlayout}#<     -  =  p  =  =  p  =  =  p  =  -     >.#<      =  p  p  =  p  p  =  p  p  =      >.#<     -  p  p  p  p  p  p  p  p  p  -     >.#<      p  p  p  p  p  p  p  p  p  p      >.]____#<   s  f   >.',

  required_cards: [1, , , true],

  init: function() {
    const ps = this.piles;
    // indices of the leftChild's of piles 0-17 (piles 18+ have no children)
    const lefts = [3,5,7,9,10,12,13,15,16,18,19,20,21,22,23,24,25,26];
    for(var i = 0; i !== 18; i++) {
      var p = ps[i], n = lefts[i], l = ps[n], r = ps[n + 1];
      p.leftChild = l;
      l.rightParent = p;
      p.rightChild = r;
      r.leftParent = p;
    }

    for(i = 0; i !== 28; ++i) ps[i].isPeak = i < 3;
  },

  deal: function(cards) {
    let ix = 0;
    for(let i = 0; i !== 18; i++) ix = this._deal_cards(cards, ix, this.piles[i], 1, 0);
    for(let i = 18; i !== 28; i++) ix = this._deal_cards(cards, ix, this.piles[i], 0, 1);
    ix = this._deal_cards(cards, ix, this.foundation, 0, 1);
    ix = this._deal_cards(cards, ix, this.stock, 52, 0);
  },

  getBestActionFor: function(card) {
    const f = gCurrentGame.foundation, c = f.lastCard;
    return card.faceUp && (c.number === card.upNumber || c.upNumber === card.number) && new Move(card, f);
  },

  getCardsToReveal: function(pileWhichHasHadCardsRemoved) {
    const res = [];
    const lp = pileWhichHasHadCardsRemoved.leftParent, rp = pileWhichHasHadCardsRemoved.rightParent;
    if(lp && !lp.leftChild.hasCards) res.push(lp.firstCard);
    if(rp && !rp.rightChild.hasCards) res.push(rp.firstCard);
    return res;
  },

  is_won: function() {
    // won when the the peaks are empty
    for(var i = 0; i !== 3; i++) if(this.piles[i].hasCards) return false;
    return true;
  },

  hasScoring: true,

  getScoreFor: function(action) {
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
  },
};


const _PyramidPile = {
  __proto__: Pile,
  isPile: true,

  // set in games' init()s
  leftParent: null,
  rightParent: null,
  leftChild: null,
  rightChild: null,

  mayAddCard: no
};

const PyramidPile = {
  __proto__: _PyramidPile,
  mayTakeCard: function(card) {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasCards && !rc.hasCards);
  },
  getActionForDrop: function(card) {
    const c = this.firstCard;
    if(!c || card.number + c.number !== 13) return null;
    const l = this.leftChild, lc = l && l.firstCard;
    const r = this.rightChild, rc = r && r.firstCard;
    // can move if the only card covering this is the card being dragged
    // (which remains part of its source pile during dragging)
    return !l || ((!lc || lc === card) && (!rc || rc === card)) ? new RemovePair(card, c) : null;
  }
};

const TriPeaksPile = {
  __proto__: _PyramidPile,
  mayTakeCard: no
};

const PyramidFoundation = {
  __proto__: NoWorryingBackFoundation,
  getActionForDrop: function(card) {
    return card.isKing ? new RemovePair(card, null) : null;
  },
  mayAddCard: no
};

const PyramidWaste = {
  __proto__: Waste,
  canDrop: true,
  getActionForDrop: function(card) {
    const c = this.lastCard;
    return c && card.number + c.number === 13 ? new RemovePair(card, c) : null;
  }
};
