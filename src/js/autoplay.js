function autoplay_default() {
    const cs = this.allcards;
    // Try to put Aces (or whatever) on empty foundations.
    const empty = findEmpty(this.foundations); // used to check move legality
    if(empty) {
      for(let ix of this.foundationBaseIndexes) {
        let c = cs[ix];
        if(!c.pile.isFoundation && c.mayTake && empty.mayAddCard(c)) return new Move(c, this.foundation_for_ace(c));
      }
    }
    const maxNums = this.getAutoplayableNumbers();
    // Now try non-empty foundations
    for(let f of this.foundations) {
      if(!f.hasCards) continue;
      let c = f.lastCard.up;
      if(!c || c.number > maxNums[c.suit]) continue;
      if(!c.pile.isFoundation && c.mayTake && f.mayAddCard(c)) return new Move(c, f);
      // for two-deck games
      c = c.twin;
      if(c && !c.pile.isFoundation && c.mayTake && f.mayAddCard(c)) return new Move(c, f);
    }
    return null;
};
