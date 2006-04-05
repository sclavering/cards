Games.mod3 = {
  __proto__: BaseCardGame,

  stockType: StockDealToPiles,
  foundationType: Mod3Foundation,
  foundationLayout: SlideLayout,
  pileType: AcesUpPile,

  layoutTemplate:
    "v[1f1f1f1f1f1f1f1f1#1] [1f1f1f1f1f1f1f1f1#1] [1f1f1f1f1f1f1f1f1#1] [1p 1p 1p 1p 1p 1p 1p 1p 1[sl]1]",
  dealTemplate: "F 0,1; P 0,1",

  cards: null,

  init: function() {
    var css = [[2,5,8,11], [3,6,9,12], [4,7,10,13]];

    function inPlace() { return this.pile.isFoundation && !!this.previousSibling; };
    function inPlace2() { return this.pile.row == this.row; }

    this.bases = new Array(3);

    for(var i = 0; i != 3; i++) {
      var cs = css[i] = makeCards(css[i], null, 2);

      for(var j = 0; j != 16; j++) {
        var c = cs[j], c2 = cs[j+16];
        c.row = c2.row = i;
        c.__defineGetter__("inPlace", inPlace);
        c2.__defineGetter__("inPlace", inPlace);
      }

      var bs = this.bases[i] = [cs[0], cs[4], cs[8], cs[12], cs[16], cs[20], cs[24], cs[28]];
      for(j = 0; j != 8; j++) bs[j].__defineGetter__("inPlace", inPlace2);
    }

    this.cards = flattenOnce(css);

    var fs = this.foundations, ps = this.piles;
    var rs = this.rows = [fs.slice(0,8), fs.slice(8,16), fs.slice(16), ps];
    for(i = 0; i != 4; i++)
      for(j = 0; j != 8; j++)
        rs[i][j].row = i;
    this.stock.row = 4; // just so long as it's not 0, 1, or 2
  },

  // games that start with no cards in the correct place on the foundations are impossible
  shuffleImpossible: function(cards) {
    for(var i = 95; i != 87; i--)
      if(cards[i].number==2 || cards[i-8].number==3 || cards[i-16].number==4)
        return false;
    return true;
  },

  getHints: function() {
    for(var i = 0; i != this.allpiles.length; i++) {
      var source = this.allpiles[i];
      if(source.isStock || !source.hasCards) continue;
      var card = source.lastCard;

      var row = this.rows[card.row];
      for(var j = 0; j != 8; j++) {
        var target = row[j];
        if(!target.mayAddCard(card)) continue;
        // hints are useful if:
        // - |target| is empty and in a different row (so we don't suggest moving a 2/3/4 along a row)
        // - |target| is nonempty, and |card| is the only card in |source|
        if(source.isFoundation && (target.hasCards ? card.previousSibling : source.row==target.row)) continue;
        this.addHint(card, target);
      }
    }
  },

  getBestDestinationFor: function(card) {
    if(card.down) {
      var d1 = card.down, d2 = card.twin.down;
      if(d1.inPlace && d1.isLast) return d1.pile;
      if(d2.inPlace && d2.isLast) return d2.pile;
    } else {
      var p = findEmpty(this.rows[card.row]);
      if(p) return p;
    }
    var parent = card.pile;
    return findEmpty(parent.isPile ? parent.surrounding : this.piles);
  },

  autoplay: function() {
    var rs = this.rows;
    for(var r = 0; r != 3; r++) {
      var shouldFillEmpty = true; // don't do so if any foudations have "junk" in them
      var empty = null; // an empty <foundation>, if we find one
      for(var c = 0; c != 8; c++) {
        var pile = rs[r][c], last = pile.lastCard;
        // we choose not to autoplay onto a card whose twin isn't in place
        if(last) {
          if(!last.inPlace) { shouldFillEmpty = false; continue; }
          if(!last.twin.inPlace) continue;
          var up1 = last.up, up2 = last.twin.up;
          if(up1 && !up1.inPlace && up1.isLast && !up1.pile.isStock)
            return new Move(up1, pile);
          if(up2 && !up2.inPlace && up2.isLast && !up2.pile.isStock)
            return new Move(up2, pile);
        } else if(shouldFillEmpty && !empty) {
          empty = pile;
        }
      }
      // we've reached the end of the row, but might have found an empty pile we could fill
      if(!shouldFillEmpty || !empty) continue;
      var bs = this.bases[r];
      for(var i = 0; i != 8; i++) {
        var card = bs[i];
        if(!card.pile.isStock && card.isLast && !card.inPlace)
          return new Move(card, empty);
      }
    }
    return null;
  },

  isWon: function() {
    if(this.stock.hasCards) return false;
    const ps = this.piles;
    for(var i = 0; i != 8; i++)
      if(ps[i].hasCards) return false
    return true;
  }
}

