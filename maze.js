Games.maze = true;

AllGames.maze = {
  __proto__: BaseCardGame,

  id: "maze",

  init: function() {
    // one deck with 6 nulls instead of the 4 kings. nulls lead to empty spaces
    var cs = this.cards = makeCardRuns(1, 12);
    cs[53] = cs[52] = cs[51] = cs[50] = cs[49] = cs[48] = null;

    var ps = this.piles;
    for(i = 0; i != 53; i++) ps[i].next = ps[i+1], ps[i+1].prev = ps[i];
    ps[53].next = ps[0]; ps[0].prev = ps[53];

    this.canMoveToPile = this.canMoveTo;
    this.aces = [cs[0], cs[12], cs[24], cs[36]];
    this.queens = [cs[11], cs[23], cs[35], cs[47]];
  },

  deal: function(cards) {
    for(var i in this.piles) dealToPile(cards, this.piles[i], 0, 1);
  },

  canMoveTo: function(card, pile) {
    if(pile.hasChildNodes()) return false;

    var prev = pile.prev.lastChild, next = pile.next.lastChild;
    return (card.isQueen && next && next.isAce)
        || (card.isAce && prev && prev.isQueen)
        || (prev && prev==card.down)
        || (next && next==card.up);
  },

  getHints: function() {
    for(var i = 0; i != 54; i++) {
      var card = this.piles[i].firstChild;
      if(!card) continue;

      var piles = filter(this.piles, testCanMoveToPile(card));
      if(piles.length) this.addHints(card, piles);
    }
  },

  getBestMoveForCard: function(card) {
    if(card.isAce) {
      var start = card.parentNode, pile = start.next;
      while(pile!=start && (pile.hasChildNodes() || !(pile.next.lastChild==card.up
          || (pile.prev.hasChildNodes() && pile.prev.lastChild.isQueen)))) pile = pile.next;
      return !pile.hasChildNodes() ? pile : null;
    }
    if(card.isQueen) {
      start = card.parentNode, pile = start.next;
      while(pile!=start && (pile.hasChildNodes() || !(pile.prev.lastChild==card.down
          || (pile.next.hasChildNodes() && pile.next.lastChild.isAce)))) pile = pile.next;
      return !pile.hasChildNodes() ? pile : null;
    }
    var down = card.down.parentNode.next, up = card.up.parentNode.prev;
    return (!down.hasChildNodes() && down) || (!up.hasChildNodes() && up);
  },

  // Autoplay not used

  hasBeenWon: function() {
    var pile = this.piles[0], first = pile;
    do {
      var next = pile.next, c1 = pile.lastChild, c2 = next.lastChild;
      if(!c1) {
        if(c2 && !c2.isAce) return false;
      } else if(!c2) {
        if(!c1.isQueen) return false;
      } else {
        if(!(c1.up==c2 || (c1.isQueen && c2.isAce))) return false;
      }
      pile = next;
    } while(pile!=first);
    return true;
  }
}
