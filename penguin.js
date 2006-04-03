Games.penguin = {
  __proto__: BaseCardGame,

  foundationType: KlondikeFoundation,
  pileType: PenguinPile,

  layoutTemplate: "h2[c p]1[c p]1[c p]1[c p]1[c p]1[c p]1[c p]2[f f f f]2",

  init: function() {
    this.cards = makeDecksMod13(1);
    this.pilesAndCells = this.piles.concat(this.cells);
  },

  deal: function(cards) {
    // first card's number will be used as "aces"
    var beak = cards[51];
    this.foundationBases = [beak];
    renumberCards(this.cards, beak.displayNum);

    // put other "aces" up
    for(var i = 50, f = 0; f != 3; --i) {
      var c = cards[i];
      if(!c.isAce) continue;
      cards.splice(i, 1);
      this.foundations[f].addCard(c);
      c.faceUp = true;
      c.updateView();
      f++;
    }

    for(i = 0; i != 7; i++) this.piles[i].dealTo(cards, 0, 7);
  },

  getHints: function() {
    const ps = this.pilesAndCells;
    const cs = new Array(7);
    for(var i = 0; i != 14; i++) {
      var c = this.getLowestMovableCard(ps[i]);
      if(!c) continue;
      // suggest moving to a pile
      if(c.isAce) {
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

  getBestDestinationFor: function(card) {
    if(card.isKing) {
      var par = card.parentNode, p = par.isPile ? findEmpty(par.surrounding) : this.firstEmptyPile;
      if(p) return p;
    } else {
      var up = card.up, upp = up.parentNode;
      if(upp.isPile && !up.nextSibling) return upp;
    }
    return card.nextSibling ? null : this.emptyCell;
  },

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
