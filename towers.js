Games.towers = true;

AllGames.towers = {
  __proto__: FreeCellGame,

  id: "towers",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, in suit, kings in spaces",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], 0, 5);
    for(i = 1; i != 3; i++) dealToPile(cards, this.cells[i], 0, 1);
  },

  // this checks if there are enough spaces/cells to perform a move, not just is it is allowed.
  movePossible: function(card, target) {
    if(!card.nextSibling) return true;
    var numToMove = 0;
    for(var next = card; next; next = next.nextSibling) numToMove++;
    return numToMove <= 1 + this.numEmptyCells;
  },

  getHints: function() {
    for(var i = 0; i != 4; i++) this.addHintsFor(this.cells[i].firstChild);
    for(i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
  },

  getBestMoveForCard: function(card) {
    var up = card.up;
    if(up) {
      var upp = up.parentNode;
      if(upp.isNormalPile && !up.nextSibling && this.movePossible(card, upp)) return upp;
    } else {
      var pile = this.emptyPile;
      if(pile) return pile;
    }
    return card.nextSibling ? null :
           (this.emptyCell || searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
};
