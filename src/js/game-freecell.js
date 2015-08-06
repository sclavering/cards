gGameClasses.freecell = {
  __proto__: FreeCellGame,

  pileDetails: function() [
    "p", 8, FreeCellPile, FanDownView, 0, [7, 7, 7, 7, 6, 6, 6, 6],
    "f", 4, KlondikeFoundation, View, 0, 0,
    "c", 4, Cell, View, 0, 0,
  ],

  layoutTemplate: '#<  c c c c    f f f f  >.#<  p p p p p p p p  >.',

  foundationBaseIndexes: [0, 13, 26, 39],

  best_destination_for: function(card) {
    const p = find_destination__nearest_legal_pile_preferring_nonempty.call(this, card);
    return p || (card.isLast ? findEmpty(this.cells) : null);
  },

  autoplay: autoplay_default,

  getAutoplayableNumbers: autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two,
};


const FreeCellPile = {
  __proto__: _FreeCellPile,
  isPile: true,

  mayTakeCard: mayTakeFromFreeCellPile,

  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last && (last.colour === card.colour || last.number !== card.upNumber)) return false;

    // check there are enough cells+spaces to perform the move

    if(card.isLast) return true;

    var spaces = gCurrentGame.countEmptyPiles(this, card.pile);
    if(spaces) spaces = spaces * (spaces + 1) / 2;
    var canMove = (gCurrentGame.numEmptyCells + 1) * (spaces + 1);
    const toMove = card.pile.cards.length - card.index;
    return toMove <= canMove ? true : 0;
  }
};
