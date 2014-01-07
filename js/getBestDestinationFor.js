const getBestDestinationFor = {
  "to up or nearest space":
  function(card) {
    const up = card.up, upp = up && up.pile;
    if(upp && upp.mayAddCard(card)) return upp;
    const e = findEmpty(card.pile.surrounding);
    return e && e.mayAddCard(card) ? e : null;
  },

  "down and same suit, or down, or empty":
  function(card) {
    const ps = card.pile.surrounding, num = ps.length;
    var maybe = null, empty = null;
    for(var i = 0; i != num; i++) {
      var p = ps[i], last = p.lastCard;
      if(!last) {
        if(!empty) empty = p;
        continue;
      }
      if(card.upNumber != last.number) continue;
      if(card.suit == last.suit) return p;
      if(!maybe) maybe = p;
    }
    return maybe || empty;
  },

  "legal nonempty, or empty":
  function(card) {
    var p = card.pile, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; i++) {
      p = ps[i];
      if(p.hasCards) {
        if(p.mayAddCard(card)) return p;
      } else if(!empty) {
        empty = p;
      }
    }
    // the check is essential in Forty Thieves, and won't matter much elsewhere
    return empty && empty.mayAddCard(card) ? empty : null;
  },

  "legal":
  function(card) {
    var p = card.pile, ps = p.isPile ? p.surrounding : this.piles, num = ps.length;
    var empty = null;
    for(var i = 0; i != num; i++) {
      p = ps[i];
      if(p.mayAddCard(card)) return p;
    }
    return null;
  },

  "towers/penguin":
  function(card) {
    if(card.isKing) {
      const p = card.pile, pile = p.isPile ? findEmpty(p.surrounding) : this.firstEmptyPile;
      if(pile && pile.mayAddCard(card)) return pile;
    } else {
      const up = card.up, upp = up.pile;
      if(upp.isPile && up.isLast && upp.mayAddCard(card)) return upp;
    }
    return card.isLast ? this.emptyCell : null;
  }
};
