Games.fan = true;

AllGames.fan = {
  __proto__: BaseCardGame,

  id: "fan",
  canMoveCard: "last on pile",
  canMoveToPile: "descending, in suit, kings in spaces",

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
  },

  deal: function(cards) {
    for(var i = 0; i != 17; i++) dealToPile(cards, this.piles[i], 0, 3);
    dealToPile(cards, this.piles[17], 0, 1);
  },

  shuffleImpossible: function(cards) {
    for(var p = 49; p != 1; p -= 3) {
      // these will form a pile c,d,e with c at the bottom
      var c = cards[p+2], d = cards[p+1], e = cards[p];
      // games with piles such as 7,2,6H or 4,9,8C are impossible
      if(c.suit==d.suit && ((c==e.up && d.number<e.number) || (d==e.up && c.number<e.number)))
        return true;
    }
    return false;
  },

  getHints: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var card = this.piles[i].lastChild;
      if(!card) continue;
      var up = card.up;
      if(up) { // not a King
        if(!up.nextSibling) this.addHint(card, up.parentNode);
      } else if(card.previousSibling) { // is a King, not in a space already
        var pile = searchPiles(this.piles, testPileIsEmpty);
        if(pile) this.addHint(card, pile);
      }
    }
  },

  getBestMoveForCard: function(card) {
    var up = card.up;
    if(!up) return searchPiles(this.piles, testPileIsEmpty);
    return up.nextSibling ? null : up.parentNode;
  },

  autoplayMove: "commonish",

  hasBeenWon: "13 cards on each foundation"
}
