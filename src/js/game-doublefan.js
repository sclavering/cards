gGameClasses.doublefan = {
  __proto__: Game,

  allcards: [2],

  pileDetails: function() [
    "p", 24, FanPile, FanRightView, 0, 5,
    "f", 8, FanFoundation, View, 0, 0,
  ],

  // We disable width:100% on the main grid because we're manually sizing everything, and don't want the browser to distribute any extra width proportionately.
  layoutTemplate: "#<  f f f f f f f f  >.#{style=width:auto}<_p_p_p_p_p_p_>< p_p_p_p_p_p>< p_p_p_p_p_p>< p_p_p_p_p_p>.",

  layout: {
    __proto__: Layout,
    // No other layout has a grid of flexible views
    setFlexibleViewSizes: function(views, width, height) {
      const kSpaceBetweenPiles = 4 * gSpacerSize;
      // 5 units per each of the 5 piles, plus 2 to the left of everything, and 3 to the right.
      const unitwidth = (width - kSpaceBetweenPiles) / (5 * 6 + 2 + 2);
      // div.thinspacer in the previous <td>
      views[0]._canvas.parentNode.previousSibling.firstChild.style.width = (2 * unitwidth) + 'px';
      for each(var v in views) v.widthToUse = unitwidth * 5;
    }
  },

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};
