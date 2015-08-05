Games.fan = {
  __proto__: BaseCardGame,

  pileDetails: [
    "p", 18, FanPile, FanRightView, 0, 3, // last pile gets just 1
    "f", 4, FanFoundation, View, 0, 0,
  ],

  // We disable width:100% on the main grid because we're manually sizing everything, and don't want the browser to distribute any extra width proportionately.
  layoutTemplate: "#<  f f f f  >.#{style=width:auto}<_p_p_p_p_p_>< p_p_p_p_p>< p_p_p_p_p>< p_p_p>.",

  layout: {
    __proto__: Layout,
    // No other layout has a grid of flexible views
    setFlexibleViewSizes: function(views, width, height) {
      const kSpaceBetweenPiles = 4 * gSpacerSize;
      // 5 units per each of the 5 piles, plus 2 to the left of everything, and 3 to the right.
      const unitwidth = (width - kSpaceBetweenPiles) / (5 * 5 + 2 + 2);
      // div.thinspacer in the previous <td>
      views[0]._canvas.parentNode.previousSibling.firstChild.style.width = (2 * unitwidth) + 'px';
      for each(var v in views) v.widthToUse = unitwidth * 5;
    }
  },

  foundationBaseIndexes: [0, 13, 26, 39],

  shuffleImpossible: function(cards) {
    for(let i = 0; i < 51; i += 3) {
      // these will form a pile c,d,e with c at the bottom
      let c = cards[i], d = cards[i + 1], e = cards[i + 2];
      // games with piles such as 7,2,6H or 4,9,8C are impossible
      if(c.suit == d.suit && ((c == e.up && d.number < e.number) || (d == e.up && c.number < e.number))) return true;
      // games with a pile such as J,9,10 are impossible
      if(c.suit == d.suit && c.down == e && d.number < e.number) return true;
    }
    return false;
  },

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_card,
};
