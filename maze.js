Games.maze = true;

AllGames.maze = {
  __proto__: BaseCardGame,

  id: "maze",

  init: function() {
    // one deck with 6 nulls instead of the 4 kings. nulls lead to empty spaces
    var cs = this.cards = getDecks(1);
    for(var i = 0; i != 51; i++) cs[i].up = cs[i+1], cs[i+1].down = cs[i];
    cs[12] = cs[25] = cs[38] = cs[51] = cs[52] = cs[53] = null;
    cs[0].down = cs[13].down = cs[26].down = cs[39].down = null;
    cs[11].up = cs[24].up = cs[37].up = cs[50].up = null;

    var ps = this.piles;
    for(i = 0; i != 53; i++) ps[i].next = ps[i+1], ps[i+1].prev = ps[i];
    ps[53].next = ps[0]; ps[0].prev = ps[53];

    this.canMoveToPile = this.canMoveTo;
    this.aces = [cs[0], cs[13], cs[26], cs[39]];
    this.queens = [cs[11], cs[24], cs[37], cs[50]];
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
      dump("getBestMoveFor an Ace : "+card+"\n");
      var start = card.parentNode, pile = start.next;
      while(pile!=start && (pile.hasChildNodes() || !(pile.next.lastChild==card.up
          || (pile.prev.hasChildNodes() && pile.prev.lastChild.isQueen)))) pile = pile.next;
      dump("reached pile "+pile.id+" holding card "+pile.lastChild+"\n");
      return !pile.hasChildNodes() ? pile : null;
    }
    if(card.isQueen) {
      dump("getBestMoveFor a Queen : "+card+"\n");
      start = card.parentNode, pile = start.next;
      while(pile!=start && (pile.hasChildNodes() || !(pile.prev.lastChild==card.down
          || (pile.next.hasChildNodes() && pile.next.lastChild.isAce)))) pile = pile.next;
      dump("reached pile "+pile.id+" holding card "+pile.lastChild+"\n");
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
