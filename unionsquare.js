Games.unionsquare = {
  __proto__: BaseCardGame,

  id: "unionsquare",

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];

    const ps = this.piles;
    for(var i = 0; i != 16; ++i) ps[i].following = ps.slice(i+1).concat(ps.slice(0, i));
  },

  deal: function(cards) {
    const ps = this.piles;
    for(var i = 0; i != 16; ++i) ps[i].dealTo(cards, 0, 1);
    this.waste.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  dealFromStock: "to waste",

  mayTakeCardFromPile: "single card",

  mayTakeCardFromFoundation: "no",

  // Piles built up or down in suit, but not both ways at once.
  mayAddCardToPile: function(card) {
    if(!this.hasChildNodes()) return true;
    var last = this.lastChild;
    if(last.suit != card.suit) return false;
    // |direction| is a special property of PileTypes["unionsquare"]
    if(this.direction==1) return last.upNumber==card.number;
    if(this.direction==-1) return last.number==card.upNumber;
    return last.number==card.upNumber || last.upNumber==card.number;
  },

  // Foundations built A,2,3..Q,K,K,Q,J..2,A in suit.
  mayAddCardToFoundation: function(card) {
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    const last = this.lastChild, pos = this.childNodes.length;
    if(last.suit != card.suit) return false;
    if(pos < 13) return last.upNumber==card.number;
    if(pos > 13) return last.number==card.upNumber;
    return card.isKing;
  },

  // xxx write getHints()

  getBestMoveForCard: function(card) {
    const p = card.parentNode, ps = p.isPile ? p.following : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; ++i) {
      var q = ps[i];
      if(q.hasChildNodes()) {
        if(q.mayAddCard(card)) return q;
      } else if(!empty) {
        empty = q;
      }
    }
    return empty;
  },

  getFoundationMoveFor: function(card) {
    const twin = card.twin, twinp = twin.parentNode;
    if(twinp.isFoundation) {
      if(card.isKing) return twinp;
      // >, not >=, or it'd allow Q,K,Q on foundations
      return twinp.childNodes.length>13 && twinp.lastChild.number==card.upNumber ? twinp : null;
    }
    // can now assume twin is not on foundation
    if(card.isAce) return this.firstEmptyFoundation;
    var down = card.down, downp = down.parentNode;
    if(downp.isFoundation && !down.nextSibling) return downp;
    down = down.twin, downp = down.parentNode;
    if(downp.isFoundation && !down.nextSibling) return downp;
    return null;
  },

  // Once a foundation has A,2,..,Q, should autoplay K,K,Q,J,..,A
  autoplayMove: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; ++i) {
      var f = fs[i], len = f.childNodes.length, last = f.lastChild;
      if(len<12 || len==26) continue;
      var c = len==12 ? last.up : (len==13 ? last.twin : last.down), cp = c.parentNode;
      if((cp.isPile || cp.isWaste) && !c.nextSibling) return this.moveTo(c, f);
      c = c.twin, cp = c.parentNode;
      if((cp.isPile || cp.isWaste) && !c.nextSibling) return this.moveTo(c, f);
    }
    return false;
  },

  hasBeenWon: "26 cards on each foundation"
};


PileTypes["unionsquare"] = {
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


PileTypes["unionsquare-f"] = {
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
