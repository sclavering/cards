Games.fortythieves = {
  __proto__: FreeCellGame,

  id: "fortythieves",

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

  dealFromStock: "to waste",

  mayTakeCardFromPile: "run down, same suit",

  mayAddCardToPile: function(card) {
    var last = this.lastChild;
    if(last && (card.suit!=last.suit || card.upNumber!=last.number)) return false;

    // check there are enough spaces to perform the move

    if(!card.nextSibling) return true;

    var canMove = Game.countEmptyPiles(this, card.parentNode.source);
    if(canMove) canMove = canMove * (canMove + 1) / 2;
    canMove++;

    var toMove = 0;
    for(var next = card; next; next = next.nextSibling) toMove++;

    return (toMove <= canMove) ? true : 0;
  },

  getHints: function() {
    for(var i = 0; i != 10; i++) this.addHintsFor(this.getLowestMovableCard(this.piles[i]));
    this.addHintsFor(this.waste.lastChild);
  },

  getLowestMovableCard: "descending, in suit",

  getBestMoveForCard: "legal nonempty, or empty",

  autoplay: "commonish 2deck",

  isWon: "13 cards on each foundation"
};
