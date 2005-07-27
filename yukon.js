const YukonBase = {
  __proto__: BaseCardGame,

  pileType: KlondikePile,

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

  getBestDestinationFor: "legal nonempty, or empty",

  isWon: "13 cards on each foundation"
};


Games.yukon = {
  __proto__: YukonBase,

  foundationType: KlondikeFoundation,

  layoutTemplate: "h1p1p1p1p1p1p1p1[f f f f]1",

  dealTemplate: { piles: [[0,1],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5]] },

  init: function() {
    const cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each pile for targets, then find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i != 7; i++) this.getHintsForCard(this.piles[i].lastChild);
  },

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike"
};


Games.sanibel = {
  __proto__: YukonBase,

  stockType: StockDealToWaste,
  foundationType: KlondikeFoundation,

  layoutTemplate: "v[1s1w3f1f1f1f1f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",

  dealTemplate: { piles: [3,7] },

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

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

  autoplay: "commonish 2deck",

  getAutoplayableNumbers: "gypsy"
};
