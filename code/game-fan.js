Games.fan = {
  __proto__: BaseCardGame,

  layout: FanLayout,
  pilesToBuild: "4f 18p",
  pileTypes: { p: FanPile, f: FanFoundation },
  dealMapStr: "P 0 3", // actually deals 1 card to the final pile
  foundationBaseIndexes: [0, 13, 26, 39],
  cards: 1,

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

  getBestDestinationFor: "to up or nearest space",

  autoplay: "commonish",

  getAutoplayableNumbers: "any",

  isWon: "13 cards on each foundation"
}
