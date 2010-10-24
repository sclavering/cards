const CanfieldBase = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 4, CanfieldPile, FanDownView, 0, 0,
    "f", 4, KlondikeFoundation, CountedView, 0, 0,
    "r", 1, Reserve, View, 0, 0,
  ],
  _reserveFaceDown: 12,
  _reserveFaceUp: 1,

  layoutTemplate: '#<   s  f f f f  [r]   ><   w  p p p p>.',

  helpId: "canfield",

  allcards: [1, , , true],

  deal: function(cards) {
    const num = cards[51].displayNum;
    for each(let c in cards) c.renumber(num);

    this._dealSomeCards(this.foundations[0], cards, 0, 1);
    this._dealSomeCards(this.reserve, cards, this._reserveFaceDown, this._reserveFaceUp);
    for(var i = 0; i != 4; i++) this._dealSomeCards(this.piles[i], cards, 0, 1);
    this._dealSomeCards(this.stock, cards, cards.length, 0);

    this.foundationBaseIndexes = [num - 1, num + 12, num + 25, num + 38];
  },

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish",

  getAutoplayableNumbers: "klondike",

  isWon: "13 cards on each foundation"
};

Games.canfield = {
  __proto__: CanfieldBase
};

const Canfield3 = Games.canfield3 = {
  __proto__: CanfieldBase,
  pileDetails: CanfieldBase.pileDetails.slice() // copy
};
Canfield3.pileDetails[2] = Deal3OrRefillStock; // Stock impl
Canfield3.pileDetails[9] = Deal3VWasteView;    // Waste view

Games.demon = {
  __proto__: CanfieldBase,
  pileDetails: CanfieldBase.pileDetails.slice(), // copy
  _reserveFaceDown: 0,
  _reserveFaceUp: 13
};
Games.demon.pileDetails[27] = FanDownView; // Reserve view
