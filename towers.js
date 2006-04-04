Games.towers = {
  __proto__: FreeCellGame,

  pileType: TowersPile,

  layoutTemplate: "v[1c1c1c1c5f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",

  dealTemplate: "P 0,5; c 0 0,1 0,1 0",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 10; i++) this.addHintsForLowestMovable(this.piles[i]);
  },

  getLowestMovableCard_helper: "descending, in suit",

  getBestDestinationFor: function(card) {
    var up = card.up;
    if(up) {
      var upp = up.pile;
      if(upp.isPile && up.isLast && upp.mayAddCard(card)) return upp;
    } else {
      var p = card.pile, pile = p.isPile ? findEmpty(p.surrounding) : this.firstEmptyPile;
      if(pile && pile.mayAddCard(card)) return pile;
    }
    return card.isLast ? this.emptyCell : null;
  },

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
};
