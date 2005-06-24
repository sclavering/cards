Games.maze = {
  __proto__: BaseCardGame,

  id: "maze",

  init: function() {
    // one deck with 6 nulls instead of the 4 kings. nulls lead to empty spaces
    var cs = this.cards = makeCardRuns(1, 12);
    cs[53] = cs[52] = cs[51] = cs[50] = cs[49] = cs[48] = null;

    var ps = this.piles;
    ps[53].next = ps[0]; ps[0].prev = ps[53]; // prev/next are not usually circular

    this.aces = [cs[0], cs[12], cs[24], cs[36]];
    this.queens = [cs[11], cs[23], cs[35], cs[47]];
  },

  deal: function(cards) {
    const ps = this.piles, num = ps.length;
    for(var i = 0; i != num; i++) ps[i].dealTo(cards, 0, 1);
  },

  mayAddCardToPile: function(card) {
    if(this.hasChildNodes()) return false;

    var prev = this.prev.lastChild, next = this.next.lastChild;
    return (card.isQueen && next && next.isAce)
        || (card.isAce && prev && prev.isQueen)
        || (prev && prev==card.down)
        || (next && next==card.up);
  },

  getHints: function() {
    for(var i = 0; i != 54; i++) {
      var p = this.piles[i];
      if(p.hasChildNodes()) continue;
      var c1 = null, p2, c2;
      if(p.prev.hasChildNodes()) {
        p2 = p.prev; c1 = p2.lastChild.up;
        if(c1) this.addHint(c1, p);
        else this.addHints2(this.aces, p);
      }
      if(p.next.hasChildNodes()) {
        p2 = p.next; c2 = p2.lastChild.down;
        if(c2) { if(c2!=c1) this.addHint(c2, p); }
        else this.addHints2(this.queens, p);
      }
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

  isWon: function() {
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
