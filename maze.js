Games.maze = {
  __proto__: BaseCardGame,

  pileType: MazePile,

  layoutTemplate:
    "v[1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1]"
    + " [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1] [1p1p1p1p1p1p1p1p1p1]",
  dealTemplate: "P 0,1",

  init: function() {
    // one deck with 6 nulls instead of the 4 kings. nulls lead to empty spaces
    var cs = this.cards = makeCardRuns(1, 12);
    cs[53] = cs[52] = cs[51] = cs[50] = cs[49] = cs[48] = null;

    var ps = this.piles;
    ps[53].next = ps[0]; ps[0].prev = ps[53]; // prev/next are not usually circular

    this.aces = [cs[0], cs[12], cs[24], cs[36]];
    this.queens = [cs[11], cs[23], cs[35], cs[47]];
  },

  getHints: function() {
    for(var i = 0; i != 54; i++) {
      var p = this.piles[i];
      if(p.hasCards) continue;
      var c1 = null, p2, c2;
      if(p.prev.hasCards) {
        p2 = p.prev; c1 = p2.lastCard.up;
        if(c1) this.addHint(c1, p);
        else this.addHints2(this.aces, p);
      }
      if(p.next.hasCards) {
        p2 = p.next; c2 = p2.lastCard.down;
        if(c2) { if(c2!=c1) this.addHint(c2, p); }
        else this.addHints2(this.queens, p);
      }
    }
  },

  getBestDestinationFor: function(card) {
    if(card.isAce) {
      var start = card.pile, pile = start.next;
      while(pile != start && (pile.hasCards || !(pile.next.lastCard == card.up
          || (pile.prev.hasCards && pile.prev.lastCard.isQueen)))) pile = pile.next;
      return !pile.hasCards ? pile : null;
    }
    if(card.isQueen) {
      start = card.pile, pile = start.next;
      while(pile != start && (pile.hasCards || !(pile.prev.lastCard == card.down
          || (pile.next.hasCards && pile.next.lastCard.isAce)))) pile = pile.next;
      return !pile.hasCards ? pile : null;
    }
    var down = card.down.pile.next, up = card.up.pile.prev;
    return (!down.hasCards && down) || (!up.hasCards && up);
  },

  // Autoplay not used

  isWon: function() {
    var pile = this.piles[0], first = pile;
    do {
      var next = pile.next, c1 = pile.lastCard, c2 = next.lastCard;
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
