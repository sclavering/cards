/* this is a rather weird variant of Double Klondike, where foundations
   are built: A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K in
   strict suits, and one set of aces is missing
   */

Games.doublesol = true;

AllGames.doublesol = {
  __proto__: BaseCardGame,

  id: "doublesol",
  dealFromStock: "to waste, can turn stock over",
  canMoveToPile: "descending, alt colours, kings in spaces",
  getLowestMovableCard: "face up",

  init: function() {
    // get two packs less one set of aces
    var cs = this.cards = getDecks(2);
    cs.splice(91,1); cs.splice(65,1); cs.splice(39,1); cs.splice(13,1);

    // e.g. we want one of the 3D and one of the 3H to be on the foundations before autoplaying a 4S or 4C
    function mayAutoplay() {
      return (this.autoplayAfterA.parentNode.isFoundation || this.twin.autoplayAfterA.parentNode.isFoundation)
          && (this.autoplayAfterB.parentNode.isFoundation || this.twin.autoplayAfterB.parentNode.isFoundation);
    }

    // 3S.down==2S, the other 2S is reachable via 3S.twin.down
    for(i = 0; i != 99; i++) cs[i].up = cs[i+1], cs[i+1].down = cs[i];

    var off = [25, -25, -50, -50, 50, 50, 25, -25];
    for(var i = 0, I = 0; i != 4; i++, I+=25) {
      var ace = cs[I], two = cs[I+1], two2 = cs[I+13];
      ace.down = ace.twin = cs[I+12].up = cs[I+24].up = null;
      two.twin = two2; two2.twin = two; two2.down = ace; ace.up2 = two2;
      ace.mayAutoplay = two.mayAutoplay = two2.mayAutoplay = true; // aces and twos may always be autoplayed

      for(var j = 2; j != 13; j++) {
        var n = I+j, n2 = n+12, c = cs[n], c2 = cs[n2];
        c.autoplayAfterA = cs[n+off[i]-1]; c.autoplayAfterB = cs[n+off[i+4]-1];
        c2.autoplayAfterA = cs[n2+off[i]-1]; c2.autoplayAfterB = cs[n2+off[i+4]-1];
        c.twin = c2; c2.twin = c;
        c.mayAutoplay getter= mayAutoplay;
        c2.mayAutoplay getter= mayAutoplay;
      }
    }

    this.aces = [cs[0], cs[25], cs[50], cs[75]];
  },

  deal: function(cards) {
    for(var i = 0; i != 10; i++) dealToPile(cards, this.piles[i], i, 1);
    dealToPile(cards, this.stock, cards.length, 0);
  },

  canMoveToFoundation: function(card, pile) {
    if(card.nextSibling) return false;
    // foundations are built A,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,J,J,Q,Q,K,K
    if(!pile.hasChildNodes()) return card.isAce;
    var last = pile.lastChild, prv = last.previousSibling;
    if(!prv) return card.down==last;  // must be a two going on an ace

    return prv==last.twin ? card.down==last || card.down==prv : card.twin==last;
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
        var pile = searchPiles(this.piles, testPileIsEmpty);
        if(pile) this.addHint(card, pile);
      }
      // to foundation
      pile = searchPiles(this.foundations, testCanMoveToFoundation(card));
      if(pile) this.addHint(card, pile);
    } else {
      // only looks at foundations and *nonempty* spaces
      this.addHintsFor(card);
    }
  },

  getBestMoveForCard: function(card) {
    var piles = card.parentNode.isNormalPile ? getPilesRound(card.parentNode) : this.piles;
    return searchPiles(piles, testCanMoveToPile(card))
        || (!card.nextSibling && searchPiles(this.foundations, testCanMoveToFoundation(card)));
  },

  autoplayMove: function() {
    var searchedForAces = false;
    for(var i = 0; i != 4; i++) {
      var f = this.foundations[i];
      if(f.hasChildNodes()) {
        var last = f.lastChild, prv = last.previousSibling;
        var c1 = null, c2 = null;
        if(last.isAce) c1 = last.up, c2 = last.up2;
        else if(prv==last.twin) c1 = last.up, c2 = prv.up;
        else c1 = last.twin;
        if(c1 && c1.faceUp && !c1.nextSibling && c1.mayAutoplay) return this.moveTo(c1, f);
        if(c2 && c2.faceUp && !c2.nextSibling && c2.mayAutoplay) return this.moveTo(c2, f);
      } else if(!searchedForAces) {
        searchedForAces = true;
        for(var j = 0; j != 4; j++) {
          var a = this.aces[j];
          if(a.faceUp && !a.parentNode.isFoundation && !a.nextSibling) return this.moveTo(a, f);
        }
      }
    }
    return false;
  },

  hasBeenWon: function() {
    // game won if all 4 Foundations have 25==13*2-1 cards
    for(var i = 0; i != 4; i++)
      if(this.foundations[i].childNodes.length!=25)
        return false;
    return true;
  },

  scores: {
    "move-to-foundation"  :   10,
    "move-from-waste"     :    5,
    "card-revealed"       :    5,
    "move-from-foundation":  -15,
    "stock-turned-over"   : -100
  }
}
