Games.penguin = true;

AllGames.penguin = {
  __proto__: BaseCardGame,

  id: "penguin",

  init: function() {
    var cs = this.cards = makeDecksMod13(1);
    this.pilesAndCells = this.piles.concat(this.cells);
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
    const ps = this.pilesAndCells;
    const cs = new Array(7);
    for(var i = 0; i != 14; i++) {
      var c = this.getLowestMovableCard(ps[i]);
      if(!c) continue;
      // suggest moving to a pile
      if(c.number==this.foundationStartNumber) {
        var p = this.firstEmptyPile;
        if(p) this.addHint(c, p);
      } else {
        var up = c.up, upp = up.parentNode;
        if(!up.nextSibling && upp.isPile) this.addHint(c, upp);
      }
      // remember cards
      if(i<7) cs[i] = c.nextSibling ? null : c;
    }
    // suggest moving things to cells
    p = this.emptyCell;
    if(!p) return;
    // cards that aren't in a seq.
    for(i = 0; i != 7; i++) {
      c = cs[i];
      if(!c) continue;
      this.addHint(c, p);
    }
    // cards which are
    for(i = 0; i != 7; i++) {
      if(cs[i]) continue;
      this.addHint(ps[i].lastChild, p);
    }
  },

  getLowestMovableCard: "descending, in suit",

  getBestMoveForCard: function(card) {
    if(card.upNumber==Game.foundationStartNumber) {
      var par = card.parentNode, p = par.isPile ? findEmpty(par.surrounding) : this.firstEmptyPile;
      if(p) return p;
    } else {
      var up = card.up, upp = up.parentNode;
      if(upp.isPile && !up.nextSibling) return upp;
    }
    return card.nextSibling ? null : this.emptyCell;
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
}
