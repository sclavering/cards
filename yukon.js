const YukonBase = {
  __proto__: BaseCardGame,

  pileType: CanfieldPile,

  // take a card a find another card on a different pile of opposite colour and one less in rank
  getHintsForCard: function(card) {
    if(!card) return;
    const ps = this.piles, len = ps.length;
    const num = card.number, colour = card.colour;
    for(var i = 0; i != len; i++) {
      var pile = ps[i];
      if(pile == card.pile) continue;
      var cs = pile.cards;
      for(var j = cs.length - 1; j >= 0; --j) {
        var c = cs[j];
        if(!c.faceUp) break;
        if(num != c.upNumber || colour == c.colour) continue; // couldn't go on card
        var d = j > 0 ? cs[j - 1] : null;
        if(d && d.number == c.upNumber && d.colour != c.colour) continue; // not worth moving
        this.addHint(c, card.pile);
      }
    }
  },

  getBestDestinationFor: "legal nonempty, or empty",

  isWon: "13 cards on each foundation"
};


Games.yukon = {
  __proto__: YukonBase,

  layout: YukonLayout,
  dealTemplate: "p 0,1 1,5 2,5 3,5 4,5 5,5 6,5",

  init: function() {
    const cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    // hints in Yukon are weird.  we look at the last card on each pile for targets, then find
    // cards which could be moved there. (this is because any faceUp card can be moved in Yukon)
    for(var i = 0; i != 7; i++) this.getHintsForCard(this.piles[i].lastCard);
  },

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike"
};


Games.sanibel = {
  __proto__: YukonBase,

  layout: SanibelLayout,
  stockType: StockDealToWaste,
  dealTemplate: "P 3,7",

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  getHints: function() {
    const ps = this.piles;
    var card = this.waste.lastCard;
    if(card) {
      // xxx would getHintsForCard work?
      for(var i = 0; i != 10; i++)
        if(ps[i].mayAddCard(card)) this.addHint(card, ps[i]);
    }
    for(i = 0; i != 10; i++) this.getHintsForCard(ps[i].lastCard);
  },

  autoplay: "commonish 2deck",

  getAutoplayableNumbers: "gypsy"
};
