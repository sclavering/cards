Games.towers = {
  __proto__: FreeCellGame,

  pileType: TowersPile,

  layoutTemplate: "v[1c1c1c1c5f1f1f1f1] [2p1p1p1p1p1p1p1p1p1p2]",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) this.piles[i].dealTo(cards, 0, 5);
    for(i = 1; i != 3; i++) this.cells[i].dealTo(cards, 0, 1);
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getLowestMovableCard: "descending, in suit",

  getBestDestinationFor: function(card) {
    var up = card.up;
    if(up) {
      var upp = up.parentNode;
      if(upp.isPile && !up.nextSibling && upp.mayAddCard(card)) return upp;
    } else {
      var p = card.parentNode, pile = p.isPile ? findEmpty(p.surrounding) : this.firstEmptyPile;
      if(pile && pile.mayAddCard(card)) return pile;
    }
    return card.nextSibling ? null : this.emptyCell;
  },

  autoplay: "commonish",

  isWon: "13 cards on each foundation"
};
