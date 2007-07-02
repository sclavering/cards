Games.fan = {
  __proto__: BaseCardGame,

  pileDetails: [
    "p", 18, FanPile, FanRightView, 0, 3, // last pile gets just 1
    "f", 4, FanFoundation, View, 0, 0,
  ],

  xulTemplate: "v[3f1f1f1f3] [ [[p p p p p] [p p p p p] [p p p p p] [p p p]]]",

  layout: {
    __proto__: Layout,
    // No other layout has a grid of flexible views
    setFlexibleViewSizes: function(views, width, height) {
      // 4 is the num <spacer>s.  16 is 3 per pile view, and a space to the left
      const unitwidth = Math.floor((width - 4 * gSpacerSize) / 16);
      views[0].element.parentNode.parentNode.previousSibling.width = unitwidth;
      for each(var v in views) v.widthToUse = unitwidth * 3;
    }
  },

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
