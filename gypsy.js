Games.gypsy = {
  names: ["easy-2suits", "hard-4suits"],
  ids: ["gypsy-easy", "gypsy"]
};


var GypsyBase = {
  __proto__: BaseCardGame,

  layout: "gypsy",
  dealFromStock: "to piles",
  canMoveCard: "descending, alt colours",
  canMoveToPile: "descending, alt colours",
  getLowestMovableCard: "descending, alt colours",

  init: function() {
    const fs = this.foundations;
    for(var i = 0; i != 4; i++) fs[i].twin = fs[i+4], fs[i+4].twin = fs[i];
    this.init2();
  },

  deal: function(cards) {
    for(var i = 0; i != 8; i++) dealToPile(cards, this.piles[i], 2, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    for(var i = 0; i != 8; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: "legal nonempty, or empty",

  sendToFoundations: function(card) {
    if(!this.canMoveCard(card)) return false;
    if(card.isAce) return this.sendAceToFoundations(card);
    const fs = this.foundations;
    for(var i = 0; i != fs.length; i++)
      if(this.attemptMove(card, fs[i]))
        return true;
    return false;
  },
  sendAceToFoundations: function(ace) {
    var twinp = ace.twin.parentNode;
    var f = twinp.isFoundation && !twinp.twin.hasChildNodes() ? twinp.twin : this.firstEmptyFoundation;
    this.moveTo(ace, f);
    return true;
  },

  autoplayMove: function() {
    for(var i = 0; i != 8; i++) {
      var last = this.piles[i].lastChild;
      if(last && last.mayAutoplay && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :  10,
    "card-revealed"       :   5,
    "move-from-foundation": -15
  }
};


AllGames["gypsy-easy"] = {
  __proto__: GypsyBase,
  id: "gypsy-easy",
//  cards: [[SPADE, HEART], 4]

  init2: function() {
    var cs = this.cards = makeCardSuits([SPADE, HEART], 4);
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


AllGames["gypsy"] = {
  __proto__: GypsyBase,
  id: "gypsy",
//  cards: 2

  init2: function() {
    var cs = this.cards = makeDecks(2);

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
