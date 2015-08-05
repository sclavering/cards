Games.mod3 = {
  __proto__: Game,

  pileDetails: [
    "s", 1, { __proto__: StockDealToPiles, isGood: false }, StockView, 0, 0,
    "p", 8, { __proto__: AcesUpPile, isGood: false }, FanDownView, 0, 1,
    "f", 8, { __proto__: _Mod3Foundation, _baseNum: 2 }, Mod3SlideView, 0, 1,
    "g", 8, { __proto__: _Mod3Foundation, _baseNum: 3 }, Mod3SlideView, 0, 1,
    "h", 8, { __proto__: _Mod3Foundation, _baseNum: 4 }, Mod3SlideView, 0, 1,
  ],

  layoutTemplate: '#<   f f f f f f f f     ><   g g g g g g g g><   h h h h h h h h><   p p p p p p p p s>.',

  get hintOriginPileCollections() {
    return [this.foundations, this.piles];
  },

  allcards: null,
  init: function() {
    const css = [[2,5,8,11], [3,6,9,12], [4,7,10,13]];
    const cards = [makeCards(2, null, css[i]) for(i in css)];
    this.allcards = flatten(cards, 1);
    const baseIxs =[0, 4, 8, 12, 16, 20, 24, 28]
    this.bases = [[cards[i][ix] for each(ix in baseIxs)] for(i in cards)];
    const fs = this.foundations;
    this.rows = [fs.slice(0,8), fs.slice(8,16), fs.slice(16)];
  },

  // games that start with no cards in the correct place on the foundations are impossible
  shuffleImpossible: function(cards) {
    for(let i = 0; i < 8; ++i)
      if(cards[i].number == 2 || cards[i + 8].number == 3 || cards[i + 16].number == 4)
        return false;
    return true;
  },

  best_destination_for: function(card) {
    if(card.down) {
      var d1p = card.down.pile, d2p = card.twin.down.pile;
      // won't return non-foundations, because you can only add there if empty
      if(d1p.mayAddCard(card)) return d1p;
      if(d2p.mayAddCard(card)) return d2p;
    } else {
      var p = findEmpty(this.rows[card.number - 2]);
      if(p) return p;
    }
    var parent = card.pile;
    return findEmpty(parent.isPile ? parent.surrounding : this.piles);
  },

  autoplay: function() {
    const rs = this.rows;
    for(var r = 0; r != 3; r++) {
      var shouldFillEmpty = true; // don't do so if any foudations have "junk" in them
      var empty = null; // an empty foundation, if we find one
      for(var c = 0; c != 8; c++) {
        var pile = rs[r][c], last = pile.lastCard;
        // we choose not to autoplay onto a card whose twin isn't in place
        if(last) {
          if(!last.pile.isGood) { shouldFillEmpty = false; continue; }
          if(!last.twin.pile.isGood || !last.up) continue;
          var up1 = last.up, up2 = last.twin.up;
          if(!up1.pile.isGood && up1.mayTake) return new Move(up1, pile);
          if(!up2.pile.isGood && up2.mayTake) return new Move(up2, pile);
        } else if(shouldFillEmpty && !empty) {
          empty = pile;
        }
      }
      // we've reached the end of the row, but might have found an empty pile we could fill
      if(!shouldFillEmpty || !empty) continue;
      var bs = this.bases[r];
      for(var i = 0; i != 8; i++) {
        var card = bs[i];
        if(!card.pile.isGood && card.mayTake) return new Move(card, empty);
      }
    }
    return null;
  },

  is_won: function() {
    if(this.stock.hasCards) return false;
    for each(let p in this.piles) if(p.cards.length) return false;
    return true;
  },
};
