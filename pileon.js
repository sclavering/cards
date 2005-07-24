Games.pileon = {
  __proto__: BaseCardGame,

  pileType: PileOnPile,

  pilespacerClass: "pileon",

  layoutTemplate: "v[3p1p1p1p3] [3p1p1p1p3] [3p1p1p1p3] [3p1p1p1#3]",

  // last two piles should be empty, but this does work (because [].pop()==undefined)
  dealTemplate: { piles: [0, 4] },

  // xxx write getHints()

  getBestDestinationFor: "legal nonempty, or empty",

  // Won when each pile is either empty or holds four cards of the same rank.
  isWon: function() {
    const ps = this.piles;
    for(var i = 0; i != 15; ++i) {
      var p = ps[i], cs = p.childNodes;
      if(!cs.length) continue;
      if(cs.length!=4) return false;
      var num = cs[0].number;
      if(cs[1].number!=num || cs[2].number!=num || cs[3].number!=num) return false;
    }
    return true;
  }
}
