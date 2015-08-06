gGameClasses.pyramid = {
  __proto__: Game,

  pileDetails: function() [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, PyramidWaste, CountedView, 0, 0,
    "p", 28, PyramidPile, PyramidView, 0, 1,
    "f", 1, PyramidFoundation, CountedView, 0, 0,
  ],

  layoutTemplate: '#<   [sw] [{class=pyramidlayout}#< p >.#< p_p >.#< p_p_p >.#< p_p_p_p >.#< p_p_p_p_p >.#< p_p_p_p_p_p >.#<p_p_p_p_p_p_p>.] f   >.',

  init: function() {
    const leftkid = [1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26], lknum = 21;
    const ps = this.piles;

    for(var i = 0; i != lknum; ++i) {
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


const PyramidPile = {
  __proto__: _PyramidPile,
  mayTakeCard: function(card) {
    const lc = this.leftChild, rc = this.rightChild;
    return !lc || (!lc.hasCards && !rc.hasCards);
  },
  getActionForDrop: function(card) {
    const c = this.firstCard;
    if(!c || card.number + c.number != 13) return null;
    const l = this.leftChild, lc = l && l.firstCard;
    const r = this.rightChild, rc = r && r.firstCard;
    // can move if the only card covering this is the card being dragged
    // (which remains part of its source pile during dragging)
    return !l || ((!lc || lc == card) && (!rc || rc == card)) ? new RemovePair(card, c) : null;
  }
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
    return c && card.number + c.number == 13 ? new RemovePair(card, c) : null;
  }
};
