Games.whitehead = true;

AllGames.whitehead = {
  __proto__: BaseCardGame,

  id: "whitehead",
  layout: "klondike",
  dealFromStock: "to waste",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, same colour",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cards = this.cards = makeDecks(1);

    // offsets to reach to other suit of same colour
    var off = [39, 13, -13, -39];

    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var card = cards[k];
        card.goesOn = j==12 ? [] : [cards[k+1], cards[k+off[i]+1]];
        if(j < 2) continue;
        // black sixes may be autoplayed after both *black* fives are on foundations, etc.
        // Aces and twos may always be autoplayed
        card.autoplayAfter = cards[k+off[i]-1];
        card.__defineGetter__("mayAutoplay", function() { return this.autoplayAfter.parentNode.isFoundation; });
      }
    }

    this.foundationBases = [cards[0], cards[13], cards[26], cards[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, i+1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var ons = card.goesOn;
    for(var i = 0; i != ons.length; i++) {
      var on = ons[i], onp = on.parentNode;
      if(onp.isNormalPile && !on.nextSibling) return onp;
    }
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testPileIsEmpty)
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation",

  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
};
