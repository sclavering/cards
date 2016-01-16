gGameClasses.fortythieves = {
  __proto__: FreeCellGame,

  pileDetails: () => [
    "s", 1, StockDealToWaste, StockView, 0, 0,
    "w", 1, Waste, FanRightView, 0, 1,
    "p", 10, FortyThievesPile, FanDownView, 0, 4,
    "f", 8, KlondikeFoundation, View, 0, 0,
  ],

  layoutTemplate: '#<   f f f f f f f f   ><   s [w]{colspan=13}>.#<   p p p p p p p p p p   >.',

  foundationBaseIndexes: [0, 13, 26, 39, 52, 65, 78, 91],

  required_cards: [2],

  best_destination_for: find_destination__nearest_legal_pile_preferring_nonempty,

  autoplay: autoplay_default,

  autoplayable_numbers: autoplay_any_where_all_lower_of_same_suit_are_on_foundations,
};


const FortyThievesPile = {
  __proto__: Pile,
  isPile: true,

  mayTakeCard: mayTakeRunningFlush,

  mayAddCard: function(card) {
    var last = this.lastCard;
    if(last && (card.suit !== last.suit || card.upNumber !== last.number)) return false;

    // check there are enough spaces to perform the move

    if(card.isLast) return true;

    var canMove = gCurrentGame.countEmptyPiles(this, card.pile);
    if(canMove) canMove = canMove * (canMove + 1) / 2;
    canMove++;

    const toMove = card.pile.cards.length - card.index;
    return toMove <= canMove ? true : 0;
  }
};
