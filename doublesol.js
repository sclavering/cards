/* this is a rather weird variant of Double Klondike, where foundations
   are built: A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K in
   strict suits, and one set of aces is missing
   */

Games.doublesol = true;

AllGames.doublesol = {
  __proto__: BaseCardGame,

  id: "doublesol",
  getLowestMovableCard: "face up",

  init: function() {
    var cs = this.cards = makeDecks(2);

    // e.g. we want one of the 3D and one of the 3H to be on the foundations before autoplaying a 4S or 4C
    function mayAutoplay() {
      return (this.autoplayAfterA.parentNode.isFoundation || this.twin.autoplayAfterA.parentNode.isFoundation)
          && (this.autoplayAfterB.parentNode.isFoundation || this.twin.autoplayAfterB.parentNode.isFoundation);
    }

    const off1 = [13, 26, 13, 26, 13, 26, 13, -78];
    const off2 = [26, 39, 26, 39, 26, -65, -78, -65];
    for(var i = 0, n = 0; i != 8; i++) {
      n+=2;
      var o1 = off1[i], o2 = off2[i];
      for(var j = 2; j != 13; j++, n++) {
        var c = cs[n];
        c.autoplayAfterA = cs[n+o1-1];
        c.autoplayAfterB = cs[n+o2-1];
        c.__defineGetter__("mayAutoplay", mayAutoplay);
      }
    }

    this.aces = [cs[0], cs[13], cs[26], cs[39], cs[52], cs[65], cs[78], cs[91]];
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) this.piles[i].dealTo(cards, i, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  dealFromStock: "to waste",

  turnStockOver: "yes",

  mayAddCardToFoundation: function(card) {
    if(card.nextSibling) return false;
    // foundations are built A,A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
    if(!this.hasChildNodes()) return card.isAce && !card.twin.parentNode.isFoundation;
    var last = this.lastChild, prv = last.previousSibling;
    return prv==last.twin ? card.down==last || card.down==prv : card.twin==last;
  },

  mayAddCardToPile: "down and different colour, king in space",

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

  getBestMoveForCard: "legal",

  autoplayMove: function() {
    var searchedForAces = false;
    const fs = this.foundations, as = this.aces;
    for(var i = 0; i != 4; i++) {
      var f = fs[i];
      if(f.hasChildNodes()) {
        var last = f.lastChild, prv = last.previousSibling;
        var c1 = null, c2 = null;
        if(prv==last.twin) c1 = last.up, c2 = prv.up;
        else c1 = last.twin;
        if(c1 && c1.faceUp && !c1.nextSibling && c1.mayAutoplay) return this.moveTo(c1, f);
        if(c2 && c2.faceUp && !c2.nextSibling && c2.mayAutoplay) return this.moveTo(c2, f);
      } else if(!searchedForAces) {
        searchedForAces = true;
        for(var j = 0; j != 8; j++) {
          var a = as[j];
          if(a.faceUp && !a.parentNode.isFoundation && !a.twin.parentNode.isFoundation && !a.nextSibling)
            return this.moveTo(a, f);
        }
      }
    }
    return false;
  },

  hasBeenWon: "26 cards on each foundation",

  scores: {
    "->foundation": 10,
    "waste->pile": 5,
    "card-revealed": 5,
    "foundation->": -15,
    "stock-turned-over": -100
  }
}
