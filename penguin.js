Games.penguin = true;

AllGames.penguin = {
  __proto__: BaseCardGame,

  id: "penguin",

  init: function() {
    var cs = this.cards = makeDecksMod13(1);
  },

  deal: function(cards) {
    var fb = cards[51];
    this.foundationBases = [fb];
    var fnum = this.foundationStartNumber = fb.number;

    // put cards of the same number (as the one to appear in top=left corner) on the foundations
    var f = 0;
    for(var i = 50; f != 3 && i >= 0; i--) {
      var c = cards[i];
      if(c.number!=fnum) continue;
      cards.splice(i, 1);
      this.foundations[f].addCard(c);
      c.setFaceUp();
      f++;
    }

    for(i = 0; i != 7; i++) this.piles[i].dealTo(cards, 0, 7);
  },

  mayTakeCardFromFoundation: "no",

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToFoundation: "canfield/penguin",

  mayAddCardToPile: function(card) {
    var last = this.lastChild;
    return last ? card.up==last : card.upNumber==Game.foundationStartNumber;
  },

  getHints: function() {
  },

  getBestMoveForCard: function(card) {
    if(card.upNumber==Game.foundationStartNumber) {
      var par = card.parentNode, p = par.isNormalPile ? findEmpty(par.surrounding) : this.firstEmptyPile;
      if(p) return p;
    } else {
      var up = card.up, upp = up.parentNode;
      if(upp.isNormalPile && !up.nextSibling) return upp;
    }
    return card.nextSibling ? null : this.emptyCell;
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
}
