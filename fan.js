GamesMenu.fan =
Games.fan = {
  __proto__: BaseCardGame,

  id: "fan",
  canMoveCard: "last on pile",
  canMoveToPile: "descending, in suit, kings in spaces",

  init: function() {
    var cards = this.cards = getDecks(1);

    // add pointers to next card up and down in same suit
    for(var i = 0; i != 51; i++) cards[i].up = cards[i+1];
    for(i = 1; i != 52; i++) cards[i].down = cards[i-1];

    cards[12].up = cards[25].up = cards[38].up = cards[51].up = null;
    cards[0].down = cards[13].down = cards[26].down = cards[39].down = null;
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
      if(c.isSameSuit(d) && ((c==e.up && d.number<e.number) || (d==e.up && c.number<e.number)))
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

  autoplayMove: function() {
    for(var i = 0; i != this.piles.length; i++) {
      var card = this.piles[i].lastChild;
      if(!card) continue;
      if(!card.down) return this.moveTo(card, searchPiles(this.foundations, testPileIsEmpty));
      var pile = card.down.parentNode;
      if(pile.isFoundation) return this.moveTo(card, pile);
    }
    return false;
  },

  hasBeenWon: "13 cards on each foundation"
}
