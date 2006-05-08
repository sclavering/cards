Games.fan = {
  __proto__: BaseCardGame,

  layout: FanLayout,
  pileType: FanPile,
  foundationType: FanFoundation,
  dealTemplate: "P 0,3", // actually deals 1 card to the final pile

  init: function() {
    var cs = this.cards = makeDecks(1);
    this.foundationBases = [cs[0], cs[13], cs[26], cs[39]];
    this.kings = [cs[12], cs[25], cs[38], cs[51]];
  },

  shuffleImpossible: function(cards) {
    for(var p = 49; p != 1; p -= 3) {
      // these will form a pile c,d,e with c at the bottom
      var c = cards[p+2], d = cards[p+1], e = cards[p];
      // games with piles such as 7,2,6H or 4,9,8C are impossible
      if(c.suit==d.suit && ((c==e.up && d.number<e.number) || (d==e.up && c.number<e.number)))
        return true;
      // games with a pile such as J,9,10 are impossible
      if(c.suit==d.suit && c.down==e && d.number<e.number) return true;
    }
    return false;
  },

  getHints: function() {
    const ps = this.piles, len = ps.length;

    for(var i = 0; i != this.piles.length; i++) {
      var card = this.piles[i].lastCard;
      if(!card) continue;
      var up = card.up;
      if(up) { // not a King
        if(up.isLast) this.addHint(card, up.pile);
      } else if(!card.isFirst) { // is a King, not in a space already
        this.addHintToFirstEmpty(card);
      }
    }
  },

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
