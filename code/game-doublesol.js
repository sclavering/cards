// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

Games.doublesol = {
  __proto__: BaseCardGame,

  layout: DoubleSolLayout,
  pilesToBuild: "s w 4f 10p",
  pileTypes: { s: StockDealToWasteOrRefill, f: DoubleSolFoundation, p: KlondikePile },
  dealTemplate: "p 0,1 1,1 2,1 3,1 4,1 5,1 6,1 7,1 8,1 9,1",
  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  cards: 2,

  getBestDestinationFor: "legal",

  autoplay: function() {
    var triedToFillEmpty = false;
    const fs = this.foundations, cs = this.cards;
    const ixs = this.foundationBaseIndexes;
    const nums = this.getAutoplayableNumbers();

    for(var i = 0; i != 4; i++) {
      var f = fs[i];
      if(f.hasCards) {
        var last = f.getCard(-1), prv = f.getCard(-2);
        var c1 = null, c2 = null;
        if(prv==last.twin) c1 = last.up, c2 = prv.up;
        else c1 = last.twin;
        if(!c1 || c1.number > nums[c1.suit]) continue;
        if(c1.faceUp && c1.isLast) return new Move(c1, f);
        if(c2 && c2.faceUp && c2.isLast) return new Move(c2, f);
      } else if(!triedToFillEmpty) {
        triedToFillEmpty = true;
        for(var j = 0; j != 8; j++) {
          var a = cs[ixs[j]];
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
