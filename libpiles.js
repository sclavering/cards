// xxx these need to become cardset dependent
var gVFanOffset = 22; // num pixels between top edges of two cards in a vertical fan
var gHFanOffset = 12; // num pixels between left edges of two cards in a horizontal fan
var gSlideOffset = 2; // num pixels between top+left edges of two cards in a slide


function initPileFromId(id, property, mayTakeCard, mayAddCard) {
  var elt = document.getElementById(id);
  if(!elt) return null;
  initPile(elt);
  elt[property] = true;
  elt.mayTakeCard = mayTakeCard;
  elt.mayAddCard = mayAddCard;
  return elt;
}


function initPile(elt) {
  elt.offset = 0;
  // for the floating pile |source| is set to the pile the cards originally came from.
  elt.source = elt;

  // get properties and methods based on *the first value* in the class attribute
  var classv = elt.className, pos = classv.indexOf(" ");
  if(pos != -1) classv = classv.substring(0, pos);

  var ms = PileTypes[classv] || basicPileProperties;
  // make pile type inherit from basic pile
  if(ms!=basicPileProperties && ms.__proto__==Object.prototype)
    ms.__proto__ = basicPileProperties;

  for(var m in ms) {
    var getter = ms.__lookupGetter__(m);
    if(getter) elt.__defineGetter__(m, getter);
    else elt[m] = ms[m];
  }

  return elt;
}


// all piles get these
var basicPileProperties = {
  isCard: false,
  isAnyPile: true,
  // one of these will be set to true by initPile(..)
  isFoundation: false,
  isCell: false,
  isReserve: false,
  isStock: false,
  isWaste: false,
  isPile: false,

  // previous and next pile of the same type
  // BaseCardGame.initPiles() forms these into doubly-linked non-circular lists
  prev: null,
  next: null,

  // pixel offset from top-left corner of pile at which a card being added to the pile should be placed
  nextCardLeft: 0,
  nextCardTop: 0,

  // these are replaced in BaseCardGame.initPiles, based on the game's mayTakeCardFrom* and mayAddCardTo* methods
  mayTakeCard: function(card) { throw "mayTakeCard not implemented!"; },
  mayAddCard: function(card) { throw "mayAddCard not implemented!"; },

  // xxx this should be made a "private" function, implemented only by piles not overriding addCards
  addCard: function(card) {
    this.appendChild(card);
    card.top = card.left = card._top = card._left = 0;
  },

  fixLayout: function() {},

  // transfers the card and all those that follow it
  // Any replacement implementation *must* call first.parentNode's fixLayout() method
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
  },

  dealTo: function(cards, down, up) {
    const num = down + up;
    for(var i = 0; i != num; i++) {
      var card = cards.pop();
      if(!card) continue;
      this.addCard(card);
      if(i>=down) card.setFaceUp();
    }
  },

  // the sourrounding piles
  get surrounding() {
    delete this.surrounding; // so we can replace the getter with an ordinary property
    var ps = this.surrounding = [];
    var prev = this.prev, next = this.next;
    while(prev && next) {
      ps.push(next); ps.push(prev);
      next = next.next; prev = prev.prev;
    }
    while(next) { ps.push(next); next = next.next; }
    while(prev) { ps.push(prev); prev = prev.prev; }
    return ps;
  }
};


var PileTypes = {
  "fan-down": {
    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.top = card._top = prev ? prev._top + (this.offset || gVFanOffset) : 0;
      card.left = card._left = 0;
    },

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
      var offset = Math.min(Math.floor(space / this.childNodes.length), gVFanOffset);
      var old = this.offset || gVFanOffset;
      this.offset = offset;
      if(offset == old) return;
      var top = 0;
      var card = this.firstChild;
      while(card) {
        card.top = card._top = top;
        top += offset;
        card = card.nextSibling;
      }
    }
  },


  "fan-right": {
    addCard: function(card) {
      this.appendChild(card);
      var prev = card.previousSibling;
      card.left = card._left = prev ? prev._left + gHFanOffset : 0;
      card.top = card._top = 0;
    },

    get nextCardLeft() {
      return this.hasChildNodes() ? this.lastChild._left + gHFanOffset : 0;
    }
  },


  "slide": {
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
  },


  // and "foundation8".  Used for Spider, Simon, and Wasp's foundations
  "foundation4": {
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
  },


  // makes the top *two* cards visible, so you can tell if they have the same number
  "doublesol-foundation": {
    addCards: function(card) {
      var l = this.lastChild;
      if(l) l.left = l._left = 0;
      while(card) {
        var nxt = card.nextSibling;
        this.appendChild(card);
        card.top = card.left = card._top = card._left = 0;
        card = nxt;
      }
      var n = this.lastChild;
      n.left = n._left = l ? gVFanOffset : 0;
      n.top = n._top = 0;
    },

    get nextCardLeft() {
      return this.hasChildNodes() ? gVFanOffset : 0;
    },

    fixLayout: function() {
      var l = this.lastChild;
      if(l) l.left = l._left = gVFanOffset;
    }
  }
};

PileTypes.foundation8 = PileTypes.foundation4;
