// xxx these just need to die (and be done in CSS)
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide

const Layout = {
  // these are used in the drag+drop code and similar places, to see what an element is
  isCard: false,
  isAnyPile: true,

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  nextCardLeft: 0,
  nextCardTop: 0,

  // xxx this should be made a "private" function, implemented only by piles not overriding addCards
  addCard: function(card) {
    this.appendChild(card);
    card.top = card.left = card._top = card._left = 0;
  },

  fixLayout: function() {},

  // transfers the card and all those that follow it
  // Any replacement implementation *must* call first.parentNode.source's fixLayout() method
  addCards: function(first) {
    var next, card = first, source = first.parentNode.source;
    if(!this.offset) this.offset = source.offset;
    while(card) {
      next = card.nextSibling;
      this.addCard(card);
      card = next;
    }
    this.fixLayout();
    source.fixLayout();
  }
};


function addCardsKeepingTheirLayout(card) {
  var src = card.parentNode.source;
  var left = card._left, top = card._top - this.nextCardTop;
  for(var next = card.nextSibling; card; card = next) {
    next = card.nextSibling;
    this.appendChild(card);
    card.top = card._top -= top;
    card.left = card._left -= left;
  }
  // For gFloatingPile - avoids not-repainting artifacts after cards are removed
  var last = this.lastChild;
  this.width = last._left + last.boxObject.width;
  this.height = last._top + last.boxObject.height;
  src.fixLayout();
  this.fixLayout();
}


const FanDownLayout = {
  __proto__: Layout,

  // doing this avoids the cards changing layout twice if they come from a packed fan and
  // this fan ends up packed (once to realyout using this.offset, then again with a new
  // offset once .fixLayout() is called)
  addCards: addCardsKeepingTheirLayout,

  get nextCardTop() {
    if(!this.hasChildNodes()) return 0;
    return this.lastChild._top + (this.offset || gVFanOffset);
  },

  fixLayout: function() {
    if(!this.hasChildNodes()) {
      this.offset = 0;
      return;
    }

    const firstbox = this.firstChild.boxObject;
    var space = window.innerHeight - firstbox.y - firstbox.height;
    const offset = Math.min(space / this.childNodes.length, gVFanOffset);
    var old = this.offset || gVFanOffset;
    this.offset = offset;
    var top = 0;
    var card = this.firstChild;
    while(card) {
      card.top = card._top = top;
      top += offset;
      card = card.nextSibling;
    }
  }
};


const FanRightLayout = {
  __proto__: Layout,

  addCard: function(card) {
    this.appendChild(card);
    var prev = card.previousSibling;
    card.left = card._left = prev ? prev._left + gHFanOffset : 0;
    card.top = card._top = 0;
  },

  get nextCardLeft() {
    return this.hasChildNodes() ? this.lastChild._left + gHFanOffset : 0;
  }
};


// this really needs modifying to allow for more than 6 cards!
const SlideLayout = {
  __proto__: Layout,

  className: "slide",

  addCard: function(card) {
    this.appendChild(card);
    var prev = card.previousSibling;
    if(!prev) {
      card.top = card.left = card._top = card._left = 0;
      return;
    }
    var offset = this.childNodes.length<6 ? gSlideOffset : 0;
    card.top = card._top = prev._top + offset
    card.left = card._left = prev._left + offset;
  },

  get nextCardLeft() {
    if(!this.hasChildNodes()) return 0;
    return this.lastChild._left + (this.childNodes.length<6 ? gSlideOffset : 0);
  },

  get nextCardTop() {
    if(!this.hasChildNodes()) return 0;
    return this.lastChild._top + (this.childNodes.length<6 ? gSlideOffset : 0);
  }
};


const Deal3WasteLayout = {
  __proto__: Layout,
  nextOffsetMultiplier: 0,
  oldChildCount: 0,
  // only ever has to handle one card
  addCards: function(card) {
    this.appendChild(card);
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


// top *two* cards visible, so you can tell if they have the same number
const DoubleSolFoundationLayout = {
  __proto__: Layout,

  className: "doublesol-foundation",

  addCards: function(card) {
    const l = this.lastChild;
    if(l) l.left = l._left = 0;
    while(card) {
      var nxt = card.nextSibling;
      this.appendChild(card);
      card.top = card.left = card._top = card._left = 0;
      card = nxt;
    }
    const n = this.lastChild;
    n.left = n._left = l ? gVFanOffset : 0;
    n.top = n._top = 0;
  },

  get nextCardLeft() {
    return this.hasChildNodes() ? gVFanOffset : 0;
  },

  fixLayout: function() {
    const l = this.lastChild;
    if(l) l.left = l._left = gVFanOffset;
  }
};


const SpiderFoundationLayoutBase = {
  __proto__: Layout,

  addCards: function(card) {
    var last = this.lastChild;
    var top = last ? last._top + gVFanOffset : 0;
    while(card) {
      var next = card.nextSibling;
      this.appendChild(card);
      card.top = card._top = top;
      card.left = card._left = 0;
      card = next;
    }
  },

  get nextCardTop() {
    return this.hasChildNodes() ? this.lastChild._top + gVFanOffset : 0;
  }
};

const Spider4FoundationLayout = {
  __proto__: SpiderFoundationLayoutBase,
  className: "foundation4"
};

const Spider8FoundationLayout = {
  __proto__: SpiderFoundationLayoutBase,
  className: "foundation8"
};


// bottom + top cards visible, so you can tell whether pile is being built up or down
// xxx this contains bits of the model
const UnionSquarePileLayout = {
  __proto__: Layout,

  className: "unionsquare",

  // A record of whether the pile is being built up (1) or down (-1), or neither (0).
  direction: 0,

  // First and last card of a pile are visible (so player can see which way it's being built).
  addCards: function(card) {
    var src = card.parentNode;
    this.appendChild(card);
    const prv = card.previousSibling;
    card.top = card._top = 0;
    card.left = card._left = prv ? gHFanOffset : 0;
    if(this.childNodes.length==2)
      this.direction = card.number==prv.upNumber ? 1 : -1;
    src.fixLayout();
  },

  fixLayout: function() {
    if(this.childNodes.length==1) this.direction = 0;
  },

  get nextCardLeft() {
    return this.hasChildNodes() ? gHFanOffset : 0;
  }
};


// built A,2,3..Q,K,K,Q,J..2,A in suit.  the k->a are offset to the right
// from the a->k, so that it's clear what card should be plauyed next
const UnionSquareFoundationLayout = {
  __proto__: Layout,

  className: "unionsquare-f",

  addCards: function(card) {
    const src = card.parentNode;
    this.appendChild(card);
    card.top = card._top = 0;
    card.left = card._left = this.childNodes.length>13 ? gHFanOffset : 0;
    src.fixLayout();
  },

  get nextCardLeft() {
    return this.childNodes.length>=13 ? gHFanOffset : 0;
  }
};

