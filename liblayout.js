// xxx these just need to die (and be done in CSS)
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide

function getCardImageClass(card) {
  return "card " + (card.faceUp ? card.displayStr : "facedown");
}
function cardView_update(card) {
  this.className = card ? getCardImageClass(card) : "card hidden";
  // so the drag-drop code can work out what you're starting to drag
  this.cardModel = card;
}
function createCardView(card, x, y) {
  const v = document.createElement("image");
  v.isCard = true; // drag-drop depends on this
  v.isAnyPile = false;
  v.top = v._top = y;
  v.left = v._left = x;
  v.update = cardView_update;
  v.update(card);
  return v;
}
function appendNewCardView(pile, card, x, y) {
  pile.appendChild(createCardView(card, x, y));
}

const _Layout = {
  // these are used in the drag+drop code and similar places, to see what an element is
  isCard: false,
  isAnyPile: true,

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  getNextCardX: function(pile) { return 0; },
  getNextCardY: function(pile) { return 0; },

  // Called when the contents of a pile have changed and thus the view needs fixing.
  // An index of i means that cards 0->i are unchanged, but from i upward cards may have
  // been added or removed.
  update: function(pile, index) {
    throw "_Layout.update not overridden!";
  },

  // replace with a function if needed
  initLayout: null,

  // should return the coords of the top-left corner of the card relative to the css-box for this view
  getCardX: function(card) { return 0; },
  getCardY: function(card) { return 0; }
};

// A _Layout where only the top card is ever visible
const Layout = {
  __proto__: _Layout,
  initLayout: function() {
    this._cardview = this.appendChild(createCardView(null, 0, 0));
  },
  
  update: function(pile, ix) {
    this._cardview.update(pile.lastCard);
  }
};


const FanDownLayout = {
  __proto__: _Layout,

  getNextCardY: function(pile) {
    return pile.cards.length * (this.offset || gVFanOffset);
  },

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    const oldoffset = this.offset || gVFanOffset;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) this.appendChild(createCardView(cs[i], 0, i * oldoffset));
    for(; i < kids.length; ++i) kids[i].update(null);
  
    // the fixLayout of old
    if(num == 0) { this.offset = 0; return; }
    const firstbox = this.firstChild.boxObject;
    const space = window.innerHeight - firstbox.y - firstbox.height;
    const offset = this.offset = Math.min(space / kids.length, gVFanOffset);
    for(var v = 0, top = 0; v != kids.length; ++v, top += offset) kids[v].top = kids[v]._top = top;
  },

  getCardY: function(card) { return card.index * (this.offset || gVFanOffset); }
};


const FanRightLayout = {
  __proto__: _Layout,

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    for(var i = index; i < kids.length && i < num; ++i) kids[i].update(cs[i]);
    for(; i < num; ++i) this.appendChild(createCardView(cs[i], i * gHFanOffset, 0));
    for(; i < kids.length; ++i) kids[i].update(null);
  },

  getNextCardX: function(pile) {
    return pile.cards.length * gHFanOffset;
  },

  getCardX: function(card) { return card.index * gHFanOffset; }
};


// this really needs modifying to allow for more than 6 cards!
const SlideLayout = {
  __proto__: _Layout,

  className: "slide",
  
  initLayout: function() {
    for(var i = 0; i != 6; ++i) appendNewCardView(this, null, i * gSlideOffset, i * gSlideOffset);
  },

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes;
    for(var i = index; i < 5 && i < num; ++i) kids[i].update(cs[i]);
    for(; i < 5; ++i) kids[i].update(null);
    kids[5].update(index >= 5 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    const n = pile.cards.length;
    return (n > 6 ? 6 : n) * gSlideOffset;
  },
  getNextCardY: function(pile) {
    const n = pile.cards.length;
    return (n > 6 ? 6 : n) * gSlideOffset;
  }
};


const Deal3WasteLayout = Layout;
/*
{
  __proto__: _Layout,
  nextOffsetMultiplier: 0,
  oldChildCount: 0,
  // only ever has to handle one card
  _addCards: function(card) {
    this._addCard(card);
    card.top = card.left = card._top = card._left = 0;
    const mul = Math.max(this.nextOffsetMultiplier++, 0);
    card[this.prop] = card[this.prop2] = mul * this.offset;
    this.oldChildCount++;
  },
  packCards: function() {
    const cs = this.childNodes, num = cs.length, prop = this.prop, prop2 = this.prop2;
    const numToPack = Math.max(this.nextOffsetMultiplier, 0);
    for(var i = num - numToPack; i != num; ++i) cs[i][prop] = cs[i][prop2] = 0;
    this.nextOffsetMultiplier = 0;
    return numToPack;
  },
  unpackCards: function(numToUnpack) {
    const cs = this.childNodes, num = cs.length, prop = this.prop, prop2 = this.prop2;
    const offset = this.offset, ixOffset = num - numToUnpack;
    for(var i = 0; i != numToUnpack; ++i) {
      const c = cs[ixOffset + i];
      c[prop] = c[prop2] = i * offset;
    }
    this.nextOffsetMultiplier = numToUnpack;
  },
  // called after a card is removed, and also at start of game (hence the oldChildCount)
  fixLayout: function() {
    this.nextOffsetMultiplier -= this.oldChildCount - this.childNodes.length;
    this.oldChildCount = this.childNodes.length;
  }
};
*/

const Deal3HWasteLayout = {
  __proto__: Deal3WasteLayout,
  className: "draw3h-waste",
  prop: "left",
  prop2: "_left",
  offset: gHFanOffset
};

const Deal3VWasteLayout = {
  __proto__: Deal3WasteLayout,
  prop: "top",
  prop2: "_top",
  offset: gVFanOffset
};


const _TwoFanLayout = {
  __proto__: _Layout,
  _c0: null,
  _c1: null,
  initLayout: function() {
    this._c0 = this.appendChild(createCardView(null, 0, 0));
    this._c1 = this.appendChild(createCardView(null, gHFanOffset, 0));
  }
};

// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationLayout = {
  __proto__: _TwoFanLayout,

  className: "doublesol-foundation",

  update: function(pile, ix) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(num > 1 ? cs[num - 2] : (num ? cs[num - 1] : null));
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.hasCards ? gVFanOffset : 0;
  }
};


const _SpiderFoundationLayout = {
  __proto__: _Layout,

  // only one A->K run will be added, but many may be removed (e.g. when clearing a game)
  update: function(pile, index) {
    const cs = pile.cards, num = cs.length, kids = this.childNodes, vindex = index / 13;
    if(index == num) { // an A->K run has been 
      for(var j = vindex; j != kids.length; ++j) kids[j].update(null);
    } else if(vindex < kids.length) { // an A->K run has been added
      dump("vindex: "+vindex+"\n");
      kids[vindex].update(cs[index]);
    } else { // an A->K run has been added, and we need a new view
      appendNewCardView(this, cs[index], 0, vindex * gVFanOffset);
    }
  },

  getNextCardY: function(pile) {
    return pile.cards.length / 13 * gVFanOffset;
  }
};

const Spider4FoundationLayout = {
  __proto__: _SpiderFoundationLayout,
  className: "foundation4"
};

const Spider8FoundationLayout = {
  __proto__: _SpiderFoundationLayout,
  className: "foundation8"
};


// bottom + top cards visible, so you can tell whether pile is being built up or down
// xxx this contains bits of the model
const UnionSquarePileLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare",

  update: function(pile, index) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(num ? cs[0] : null);
    this._c1.update(num > 1 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.hasCards ? gHFanOffset : 0;
  }
};


// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundationLayout = {
  __proto__: _TwoFanLayout,

  className: "unionsquare-f",

  update: function(pile, ix) {
    const cs = pile.cards, num = cs.length;
    this._c0.update(cs.length > 13 ? cs[12] : (cs.length ? cs[0] : null));
    this._c1.update(cs.length > 13 ? cs[num - 1] : null);
  },

  getNextCardX: function(pile) {
    return pile.cards.length >= 13 ? gHFanOffset : 0;
  }
};

