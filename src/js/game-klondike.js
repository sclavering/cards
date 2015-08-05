const KlondikeBase = {
  __proto__: Game,

  pileDetails: function() [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 7, KlondikePile, FanDownView, [0,1,2,3,4,5,6], 1,
    "f", 4, KlondikeFoundation, View, 0, 0,
  ],

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: find_destination__nearest_legal_pile,

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,

  hasScoring: true,

  getScoreFor: function(act) {
    if(act instanceof RefillStock) return -100;
    if(!(act instanceof Move)) return 0;
    const c = act.card, s = act.source, d = act.destination, ps = this.piles;
    // If a card on the waste *could* be moved down to the playing piles (for 5 points)
    // then award those points event when moving it directly to the foundations.
    if(s.isWaste && d.isFoundation) {
      for(var i = 0; i != ps.length; ++i)
        if(ps[i].mayAddCard(c)) 
          return 15;
      return 10;
    }
    if(d.isFoundation) return s.isFoundation ? 0 : 10;
    if(s.isFoundation) return -15;
    return s.isWaste ? 5 : 0;
  },

  scoreForRevealing: 5
};

gGameClasses.klondike1 = {
  __proto__: KlondikeBase,
  helpId: "klondike",
  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',
};


gGameClasses.klondike3 = {
  __proto__: KlondikeBase,
  pileDetails: function() {
    const rv = KlondikeBase.pileDetails();
    rv[2] = Deal3OrRefillStock; // Stock pile
    rv[9] = Deal3HWasteView; // Waste view
    return rv;
  },
  layoutTemplate: '#<    s w  f f f f    >.#<   p p p p p p p   >.',
};


gGameClasses.doubleklondike = {
  __proto__: KlondikeBase,
  pileDetails: function() [
    "s", 1, StockDealToWasteOrRefill, StockView, 0, 0,
    "w", 1, Waste, CountedView, 0, 0,
    "p", 10, KlondikePile, FanDownView, range(10), 1,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],
  layoutTemplate: '#<   s w   f f f f f f f f   >.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],
  allcards: [2],
  numPreferredFoundationsPerSuit: 2, // == num foundations of a given suit

  // With eight foundations it can make sense to keep a 2 down and put its twin up instead.
  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations,
};
