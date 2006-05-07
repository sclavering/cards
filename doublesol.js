// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

Games.doublesol = {
  __proto__: BaseCardGame,

  layout: DoubleSolLayout,
  stockType: StockDealToWasteOrRefill,
  foundationType: DoubleSolFoundation,
  pileType: KlondikePile,
  dealTemplate: "p 0,1 1,1 2,1 3,1 4,1 5,1 6,1 7,1 8,1 9,1",

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.aces = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastCard);
    for(var i = 0; i != 10; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.pile.isWaste) this.addHintToFirstEmpty(card);
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getLowestMovableCard_helper: "face up",

  getBestDestinationFor: "legal",

  autoplay: function() {
    var searchedForAces = false;
    const fs = this.foundations, as = this.aces;
    const nums = this.getAutoplayableNumbers();

    for(var i = 0; i != 4; i++) {
      var f = fs[i];
      if(f.hasCards) {
        var last = f.lastCard, prv = last.previousSibling;
        var c1 = null, c2 = null;
        if(prv==last.twin) c1 = last.up, c2 = prv.up;
        else c1 = last.twin;
        if(!c1 || c1.number > nums[c1.suit]) continue;
        if(c1.faceUp && c1.isLast) return new Move(c1, f);
        if(c2 && c2.faceUp && c2.isLast) return new Move(c2, f);
      } else if(!searchedForAces) {
        searchedForAces = true;
        for(var j = 0; j != 8; j++) {
          var a = as[j];
          if(a.faceUp && !a.pile.isFoundation && !a.twin.pile.isFoundation && a.isLast)
            return new Move(a, f);
        }
      }
    }
    return null;
  },

  getAutoplayableNumbers: "klondike",

  isWon: "26 cards on each foundation"
};
