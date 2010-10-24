Games.penguin = {
  __proto__: BaseCardGame,

  pileDetails: [
    "p", 7, PenguinPile, FanDownView, 0, 0,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 7, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<   c c c c c c c  [f_f_f_f]   ><   p p p p p p p>.',

  allcards: [1, , , true],

  init: function() {
    this.pilesAndCells = this.piles.concat(this.cells);
  },

  deal: function(cards) {
    // "Aces" are cards with the first's number.  Other "aces" start on foundations
    const beak = cards[51];
    this.foundationBaseIndexes = [this.allcards.indexOf(beak)];
    for each(var c in cards) c.renumber(beak.displayNum);
    const aces = [c for each(c in cards) if(c.isAce)];
    aces.pop(); // remove the beak, which would otherwise be dealt to a foundation
    for(var i = 0; i != 3; ++i) this._dealSomeCards(this.foundations[i], aces, 0, 1);
    const others = [c for each(c in cards) if(!c.isAce)];
    others.push(beak);
    for(i = 0; i != 7; i++) this._dealSomeCards(this.piles[i], others, 0, 7);
  },

  getBestDestinationFor: "towers/penguin",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
