Games.klondike = true;

AllGames.klondike = {
  __proto__: BaseCardGame,

  id: "klondike",
  dealFromStock: "to waste, can turn stock over",
  getLowestMovableCard: "face up",

  init: function() {
    var cs = this.cards = makeDecks(1);

    // black sixes may be autoplayed after both red fives are on foundations, etc.
    // Aces and twos may always be autoplayed
    const off = [13, -13, -26, -26, 26, 26, 13, -13];
    for(var i = 0; i != 4; i++) {
      for(var j = 2, k = 2 + i*13; j != 13; j++, k++) {
        var c = cs[k];
        c.autoplayAfterA = cs[k+off[i]-1];
        c.autoplayAfterB = cs[k+off[i+4]-1];
        //c.onA = cards[k+off[i]+1];
        //c.onB = cards[k+off[i+4]+1];
        c.__defineGetter__("mayAutoplay", mayAutoplayAfterTwoOthers);
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) this.piles[i].dealTo(cards, i, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  mayAddCardToPile: "down and different colour, king in space",

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = this.firstEmptyPile;
        if(pile) this.addHint(card, pile);
      }
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getBestMoveForCard: "legal",

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "card-revealed": 5,
    "foundation->": -15,
    "stock-turned-over": -100
  }
};
