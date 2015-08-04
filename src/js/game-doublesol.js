// An interesting variant of (Double) Klondike where foundations are built A,A,2,2,3,...,Q,Q,K,K

Games.doublesol = {
  __proto__: BaseCardGame,

  pileDetails: [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, KlondikePile, FanDownView, range(10), repeat(1, 10),
    "f", 4, DoubleSolFoundation, DoubleSolFoundationView, 0, 0,
  ],

  layoutTemplate: '#<   s w   f f f f   >.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  allcards: [2],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: function() {
    var triedToFillEmpty = false;
    const fs = this.foundations, cs = this.allcards;
    const ixs = this.foundationBaseIndexes;
    const nums = this.getAutoplayableNumbers();

    for(var i = 0; i != 4; i++) {
      var f = fs[i];
      if(f.hasCards) {
        var last = f.getCard(-1), prv = f.getCard(-2);
        var c1 = null, c2 = null;
        if(prv == last.twin) c1 = last.up, c2 = prv.up;
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

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};
