Games.fan = {
  __proto__: BaseCardGame,

  pileType: FanPile,
  foundationType: FanFoundation,

  // xxx this doesn't give the desired numbering of the piles
  layoutTemplate: "v[3f1f1f1f3] [ `{flex=1}{equalsize=always}[{flex=1}p p p p]"
    +"[{flex=1}p p p p][{flex=1}p p p p][{flex=1}p p p][{flex=1}p p p]' ]",
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
      var card = this.piles[i].lastChild;
      if(!card) continue;
      var up = card.up;
      if(up) { // not a King
        if(!up.nextSibling) this.addHint(card, up.parentNode);
      } else if(card.previousSibling) { // is a King, not in a space already
        var pile = this.firstEmptyPile;
        if(pile) this.addHint(card, pile);
      }
    }
  },

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
