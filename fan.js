Games["fan"] = {
  __proto__: BaseCardGame,

  id: "fan",
  canMoveCard: "last on pile",
  canMoveToPile: "descending, in suit, kings in spaces",

  deal: function(cards) {
    for(var i = 0; i != 17; i++) dealToPile(cards, this.piles[i], 0, 3);
    dealToPile(cards, this.piles[17], 0, 1);
  },

  // games with piles such as 7,2,6H or 4,9,8C are impossible
  shuffleImpossible: function(cards) {
    for(var p = 49; p != 1; p -= 3) {
      // these will form a pile c,d,e with c at the bottom
      var c = cards[p+2], d = cards[p+1], e = cards[p];
      if(c.isSameSuit(d) && c.isSameSuit(e)
          && ((c.isConsecutiveTo(e) && d.number<e.number)
            ||(d.isConsecutiveTo(e) && c.number<e.number)))
        return true;
    }
    return false;
  },

  getHints: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var card = this.piles[i].lastChild;
      // don't suggest moving kings that are not on top of anything
      if(!card || (card.isKing && !card.previousSibling)) continue;
      var pile = searchPiles(this.piles, testCanMoveToPile(card));
      if(pile) this.addHint(card, pile);
    }
  },

  getBestMoveForCard: function(card) {
    return searchPiles(this.piles, testCanMoveToPile(card));
  },

  autoplayMove: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var last = this.piles[i].lastChild;
      if(last && this.sendToFoundations(last)) return true;
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation"
}
