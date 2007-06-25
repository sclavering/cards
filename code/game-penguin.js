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
    // "Aces" are cards with the first's number.  Other "aces" start on foundations
    const beak = cards[51];
    this.foundationBaseIndexes = [this.cards.indexOf(beak)];
    renumberCards(this.cards, beak.displayNum);
    const aces = [c for each(c in cards) if(c.isAce)];
    for(var i = 0; i != 3; ++i) this._dealSomeCards(this.foundations[i], aces, [0, 1]);
    const others = [c for each(c in cards) if(!c.isAce)];
    others.push(beak);
    for(i = 0; i != 7; i++) this._dealSomeCards(this.piles[i], others, [0, 7]);
  },

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
