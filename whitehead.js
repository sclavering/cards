Games.whitehead = true;

AllGames.whitehead = {
  __proto__: BaseCardGame,

  id: "whitehead",
  layout: "klondike",
  dealFromStock: "to waste",
  canMoveCard: "descending, in suit",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cs = this.cards = makeDecks(1);

    const off = [39, 13, -13, -39]; // offsets to other suit of same colour
    for(var i = 0, k = 0; i != 4; i++) {
      for(var j = 0; j != 13; j++, k++) {
        var c = cs[k];
        c.on = j==12 ? null : cs[k+off[i]+1];
        if(j < 2) continue; // Aces and twos may always be autoplayed
        // Autoplay 6C after 5S (i.e. one less and of same colour, but different suit).
        c.autoplayAfter = cs[k+off[i]-1];
        c.__defineGetter__("mayAutoplay", function() { return this.autoplayAfter.parentNode.isFoundation; });
      }
    }

    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 7; i++) dealToPile(cards, this.piles[i], 0, i+1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveToPile: function(card, pile) {
    var lst = pile.lastChild;
    return !lst || lst==card.up || lst==card.on;
  },

  getHints: function() {
    this.addHintsFor(this.waste.lastChild);
    for(var i = 0; i != 7; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var up = card.up, on = card.on;
    if(up) {
      var p = up.parentNode;
      if(p.isNormalPile && !up.nextSibling) return p;
    }
    if(on) {
      p = on.parentNode;
      if(p.isNormalPile && !on.nextSibling) return p;
    }
    return this.firstEmptyPile;
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
