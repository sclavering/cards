gGameClasses.towers = {
  __proto__: FreeCellGame,

  pileDetails: () => [
    "p", 10, TowersPile, FanDownView, 0, 5,
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, [0, 1, 1, 0],
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: find_destination__nearest_legal_pile_or_cell,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_card,
};


const TowersPile = {
  __proto__: _FreeCellPile,
  isPile: true,
  mayTakeCard: mayTakeRunningFlush,
  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last ? last !== card.up : !card.isKing) return false;
    const toMove = card.pile.cards.length - card.index;
    return toMove <= 1 + gCurrentGame.numEmptyCells ? true : 0;
  }
};
