const PileOnBase = {
  __proto__: BaseCardGame,

  getBestDestinationFor: "legal nonempty, or empty",

  // Won when each pile is either empty or holds four cards of the same rank.
  isWon: function() {
    for each(let p in this.piles) {
      let cs = p.cards;
      if(!cs.length) continue;
      if(cs.length != this._pileon_depth) return false;
      var num = cs[0].number;
      if(cs[1].number != num || cs[2].number != num || cs[3].number != num) return false;
    }
    return true;
  },
};


Games.pileon = {
  __proto__: PileOnBase,
  _pileon_depth: 4,
  pileDetails: [
    "p", 15, PileOnPile4, PileOnView4, 0, 4, // last two actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p>.',
};


Games.doublepileon = {
  __proto__: PileOnBase,
  allcards: [2],
  _pileon_depth: 8,
  pileDetails: [
    "p", 15, PileOnPile8, PileOnView8, 0, 8, // last three actually empty
  ],
  layoutTemplate: '#<   p p p p   ><   p p p p><   p p p p><   p p p p>.',
};
