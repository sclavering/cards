// provides: gypsy, gypsy-2suits

var GypsyBase = {
  __proto__: BaseCardGame,

  layout: "gypsy",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
  },

  deal: function(cards) {
    for(var i = 0; i != 8; i++) this.piles[i].dealTo(cards, 2, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  dealFromStock: "to piles",

  mayTakeCardFromPile: "run down, alt colours",

  mayAddCardToPile: "down, opposite colour",

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, alt colours",

  getBestMoveForCard: "legal nonempty, or empty",

  getFoundationMoveFor: function(card) {
    if(card.isAce) {
      var twinp = card.twin.parentNode;
      return twinp.isFoundation && !twinp.twin.hasChildNodes() ? twinp.twin : this.firstEmptyFoundation;
    }
    var down = card.down, c = down;
    do {
      var p = c.parentNode;
      if(p.isFoundation && !c.nextSibling) return p;
      c = c.twin;
    } while(c != down);
    return null;
  },

  autoplayMove: function() {
    const ps = this.piles;
    for(var i = 0; i != 8; i++) {
      var last = ps[i].lastChild;
      if(last && last.mayAutoplay && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "card-revealed": 5,
    "foundation->": -15
  }
};


Games["gypsy-2suits"] = {
  __proto__: GypsyBase,

  id: "gypsy-2suits",

  cards: [[SPADE, HEART], 4],

  init2: function() {
    const cs = this.cards;
    for(var i = 0, n = 0; i != 8; i++) {
      n++;
      for(var j = 1; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfter = cs[(n+12) % 104];
        c.__defineGetter__("mayAutoplay", function() {
          var c0 = this.autoplayAfter, c = c0;
          do {
            if(!c.parentNode.isFoundation) return false;
            c = c.twin;
          } while(c!=c0);
          return true;
        });
      }
    }
  }
};


Games["gypsy"] = {
  __proto__: GypsyBase,

  id: "gypsy",

  cards: 2,

  init2: function() {
    const cs = this.cards;

    const off1 = [13, 26, 13, 26, 13, 26, 13, -78];
    const off2 = [26, 39, 26, 39, 26, -65, -78, -65];
    for(var i = 0, n = 0; i != 8; i++) {
      n++;
      var o1 = off1[i], o2 = off2[i];
      for(var j = 1; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfterA = cs[n+o1-1];
        c.autoplayAfterB = cs[n+o2-1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterFourOthers);
      }
    }
  }
};
