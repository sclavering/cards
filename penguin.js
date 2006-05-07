Games.penguin = {
  __proto__: BaseCardGame,

  layout: PenguinLayout,
  pileType: PenguinPile,

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
      c.faceUp = true;
      this.foundations[f].addCardsFromArray([c]);
      f++;
    }

    for(i = 0; i != 7; i++) this._dealSomeCards(this.piles[i], cards, [0, 7]);
  },

  getHints: function() {
    const ps = this.pilesAndCells;
    const cs = new Array(7);
    for(var i = 0; i != 14; i++) {
      var c = this.getLowestMovableCard(ps[i]);
      if(!c) continue;
      // suggest moving to a pile
      if(c.isAce) {
        this.addHintToFirstEmpty(c);
      } else {
        var up = c.up, upp = up.pile;
        if(up.isLast && upp.isPile) this.addHint(c, upp);
      }
      // remember cards
      if(i < 7) cs[i] = c.isLast ? c : null;
    }
    // suggest moving things to cells
    p = this.emptyCell;
    if(!p) return;
    // cards that aren't in a seq.
    for(i = 0; i != 7; i++) {
      c = cs[i];
      this.addHint(c, p);
    }
    // cards which are
    for(i = 0; i != 7; i++) {
      if(cs[i]) continue;
      this.addHint(ps[i].lastCard, p);
    }
  },

  getLowestMovableCard_helper: "descending, in suit",

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
