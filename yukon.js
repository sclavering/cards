// ids: yukon, sanibel

var YukonBase = {
  __proto__: BaseCardGame,

  mayAddCardToPile: "down, opposite colour",

  // take a card a find another card on a different pile of opposite colour and one less in rank
  getHintsForCard: function(card) {
    if(!card) return;
    const ps = this.piles, len = ps.length;
    for(var i = 0; i != len; i++) {
      var pile = ps[i];
      if(pile==card.parentNode) continue;
      var current = pile.lastChild;
      while(current && current.faceUp) {
        if(card.number==current.upNumber && card.colour!=current.colour) {
          // |current| could be moved onto |card|.  test if it's not already
          // on a card consecutive and of opposite colour
          var prev = current.previousSibling;
          if(!prev || prev.number!=current.upNumber || prev.colour==current.colour)
            this.addHint(current,card.parentNode);
        }
        current = current.previousSibling;
      }
    }
  },

  getBestMoveForCard: "legal nonempty, or empty",

  isWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "card-revealed": 5,
    "foundation->": -15
  }
};


Games.yukon = {
  __proto__: YukonBase,

  id: "yukon",

  layoutTemplate: "h1p1p1p1p1p1p1p1[f f f f]1",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];

    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0, n = 0; i != 4; i++) {
      n++;
      for(var j = 1; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfterA = cs[n+off[i]-1];
        c.autoplayAfterB = cs[n+off[i+4]-1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }
  },

  deal: function(cards) {
    this.piles[0].dealTo(cards, 0, 1);
    for(var i = 1; i != 7; i++) this.piles[i].dealTo(cards, i, 5);
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each pile for targets, then find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i != 7; i++) this.getHintsForCard(this.piles[i].lastChild);
  },

  autoplay: "commonish"
};


Games.sanibel = {
  __proto__: YukonBase,

  id: "sanibel",

  layoutTemplate: "v[1s1w3f1f1f1f1f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",

  //cards: 2,

  init: function() {
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

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  deal: function(cards) {
    this.stock.dealTo(cards, 3, 0);
    this.waste.dealTo(cards, 0, 1);
    for(var i = 0; i != 10; i++) this.piles[i].dealTo(cards, 3, 7);
  },

  dealFromStock: "to waste",

  getHints: function() {
    const ps = this.piles;
    var card = this.waste.lastChild;
    if(card) {
      // xxx would getHintsForCard work?
      for(var i = 0; i != 10; i++)
        if(ps[i].mayAddCard(card)) this.addHint(card, ps[i]);
    }
    for(i = 0; i != 10; i++) this.getHintsForCard(ps[i].lastChild);
  },

  autoplay: "commonish 2deck"
};
