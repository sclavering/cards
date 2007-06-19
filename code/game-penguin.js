Games.penguin = {
  __proto__: BaseCardGame,

  layout: PenguinLayout,
  pilesToBuild: "c p c p c p c p c p c p c p 4f",
  pileTypes: { p: PenguinPile },

  init: function() {
    this.cards = makeDecksMod13(1);
    this.pilesAndCells = this.piles.concat(this.cells);
  },

  deal: function(cards) {
    // first card's number will be used as "aces"
    var beak = cards[51];
    this.foundationBaseIndexes = [this.cards.indexOf(beak)];
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

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
