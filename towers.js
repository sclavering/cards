Games.towers = true;

AllGames.towers = {
  __proto__: FreeCellGame,

  id: "towers",
  canMoveCard: "descending, in suit",
  canMoveToPile: "descending, in suit, kings in spaces",
  getLowestMovableCard: "descending, in suit",

  init: function() {
    var cards = this.cards = getDecks(1);

    // add pointers to next card up and down in same suit
    for(var i = 0; i != 51; i++) cards[i].up = cards[i+1];
    cards[12].up = cards[25].up = cards[38].up = cards[51].up = null;

    this.aces = [cards[0], cards[13], cards[26], cards[39]];
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

  autoplayMove: function() {
    var lookedForAces = false;
    for(var i = 0; i != 4; i++) {
      var f = this.foundations[i];
      if(f.hasChildNodes()) {
        var c = f.lastChild.up;
        if(c && this.canMoveCard(c)) return this.moveTo(c, f);
      } else if(!lookedForAces) {
        lookedForAces = true;
        for(var j = 0; j != 4; j++) {
          var a = this.aces[j];
          if(!a.parentNode.isFoundation && !a.nextSibling) return this.moveTo(a, f);
        }
      }
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation"
};
