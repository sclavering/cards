const PyramidBase = {
  __proto__: BaseCardGame,

  getEventTarget: function(e) {
    var t0 = e.target, t = t0, x = e.pageX, y = e.pageY;

    if(t.isCard || (t.isAnyPile && !t.isPile)) return t;

    // get from a <flex/> or spacer to the pile it covers
    if(!t.isAnyPile) {
      // if t is a spacer between two piles we change t to the pile on the row above
      t = t.previousSibling;
      if(!t || !t.isAnyPile) return null; // spacer is left of the pyramid
      var rpp = t.rightParent;
      // spacer on right of pyramid, or click was not in region overlapping row above
      if(!rpp || rpp.boxObject.y + rpp.boxObject.height < y) return null;
      t = rpp;
    }

    // The target pile is empty.  This usually means that an empty pile is overlapping a card
    // which the user is trying to click on.

    while(!t.hasChildNodes()) {
      var lp = t.leftParent, rp = t.rightParent;
      if(rp && x > rp.boxObject.x) t = rp;
      else if(lp && lp.boxObject.x+lp.boxObject.width > x) t = lp;
      // is it the pile directly above?
      else if(lp && lp.rightParent) t = lp.rightParent;
      // user is probably being stupid
      else return null;
      // are we too low down anyway?
      if(t.boxObject.y+t.boxObject.height < y) return null;
    }
    // we're interested in cards, not piles
    t = t.firstChild;
    return t;
  }
};


const PyramidPile = {
  __proto__: PyramidPileBase,
  isPile: true,
  mayTakeCard: function(card) {
    return this.free;
  }
};


const PyramidFoundation = {
  __proto__: NoWorryingBackFoundation,
  free: true,
  getActionForDrop: function(card) {
    return card.isKing ? new RemovePair(card, null) : null;
  },
  // needed when someone right-clicks a card
  mayAddCard: no
};


Games.pyramid = {
  __proto__: PyramidBase,

  stockType: StockDealToWasteOrRefill,
  wasteType: { __proto__: Waste, free: true },
  foundationType: PyramidFoundation,
  pileType: PyramidPile,

  layoutTemplate: "h1[s w]1({flex=5}<1p1><4-++p1p++-4><3++p1p1p++3>"
    +"<3-+p1p1p1p+-3><2+p1p1p1p1p+2><2-p1p1p1p1p1p-2><1p1p1p1p1p1p1p1>)1f1",
  dealTemplate: "P 0,1",

  init: function() {
    const leftkid = [1,3,4,6,7,8,10,11,12,13,15,16,17,18,19,21,22,23,24,25,26], lknum = 21;
    const ps = this.piles;

    for(var i = 0; i != lknum; ++i) {
      var lk = leftkid[i];
      var p = ps[i], l = ps[lk], r = ps[lk+1];
      p.leftChild = l; l.rightParent = p;
      p.rightChild = r; r.leftParent = p;
    }
  },

  // only used for waste and .piles
  getActionForDrop: function(card) {
    const c = this.lastChild;
    return c && card.number + c.number == 13 && this.free ? new RemovePair(card, c) : null;
  },

  getBestActionFor: function(card) {
    return card.isKing && card.parentNode.free ? new RemovePair(card, null) : null;
  },

  // xxx write getHints()

  // this game has no autoplay

  isWon: function() {
    // won when the tip of the pyramid has been removed
    return !this.piles[0].hasChildNodes();
  }
};
