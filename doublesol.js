// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

Games.doublesol = {
  __proto__: BaseCardGame,

  stockType: StockDealToWasteOrRefill,
  foundationType: DoubleSolFoundation,
  pileType: KlondikePile,

  layoutTemplate: "v[1[sl]1w4f1f1f1f1] [1p1p1p1p1p1p1p1p1p1p1]",

  dealTemplate: { piles: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1]] },

  init: function() {
    var cs = this.cards = makeDecks(2);
    this.aces = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  getHints: function() {
    this.getHintsFor(this.waste.lastChild);
    for(var i = 0; i != 10; i++) this.getHintsFor(this.getLowestMovableCard(this.piles[i]));
  },
  getHintsFor: function(card) {
    if(!card) return;
    if(card.isKing) {
      // suggest just one move to an empty pile, and only if the king is on something else
      if(card.previousSibling || card.parentNode.isWaste) {
        var pile = this.firstEmptyPile;
        if(pile) this.addHint(card, pile);
      }
      this.addFoundationHintsFor(card);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getLowestMovableCard: "face up",

  getBestDestinationFor: "legal",

  autoplay: function() {
    var searchedForAces = false;
    const fs = this.foundations, as = this.aces;
    const nums = this.getAutoplayableNumbers();

    for(var i = 0; i != 4; i++) {
      var f = fs[i];
      if(f.hasChildNodes()) {
        var last = f.lastChild, prv = last.previousSibling;
        var c1 = null, c2 = null;
        if(prv==last.twin) c1 = last.up, c2 = prv.up;
        else c1 = last.twin;
        if(!c1 || c1.number > nums[c1.suit]) continue;
        if(c1.faceUp && !c1.nextSibling) return new Move(c1, f);
        if(c2 && c2.faceUp && !c2.nextSibling) return new Move(c2, f);
      } else if(!searchedForAces) {
        searchedForAces = true;
        for(var j = 0; j != 8; j++) {
          var a = as[j];
          if(a.faceUp && !a.parentNode.isFoundation && !a.twin.parentNode.isFoundation
              && !a.nextSibling)
            return new Move(a, f);
        }
      }
    }
    return null;
  },

  getAutoplayableNumbers: "klondike",

  isWon: "26 cards on each foundation"
};
