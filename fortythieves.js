Games.fortythieves = {
  __proto__: FreeCellGame,

  stockType: StockDealToWaste,
  wasteLayout: FanRightLayout,
  pileType: FortyThievesPile,
  pileLayout: FanDownLayout,

  layoutTemplate: "v[2f1f1f1f1f1f1f1f2] [  s w  ] [2p1p1p1p1p1p1p1p1p1p2]",

  init: function() {
    var cs = this.cards = makeDecks(2);
    var as = this.foundationBases = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];

    function mayAutoplay() {
      return this.down.parentNode.isFoundation && this.twin.down.parentNode.isFoundation;
    }

    for(var i = 0; i != 104; i++) cs[i].__defineGetter__("mayAutoplay", mayAutoplay);
    for(i = 0; i != 8; i++) {
      var c = as[i];
      delete c.mayAutoplay;
      c.mayAutoplay = true;
    }
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) this.piles[i].dealTo(cards, 0, 4);
    this.waste.dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
    this.addHintsFor(this.waste.lastChild);
  },

  getLowestMovableCard: "descending, in suit",

  getBestDestinationFor: "legal nonempty, or empty",

  autoplay: "commonish 2deck",

  isWon: "13 cards on each foundation"
};
