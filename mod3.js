// Scoring constants:
const MOD3_CARD_IN_PLACE = 10, MOD3_EMPTY_PILE = 5;
const MOD3_MAX_SCORE = 1000; // (96*MOD3_CARD_IN_PLACE + 8*MOD3_EMPTY_PILE);

Games.mod3 = true;

AllGames.mod3 = {
  __proto__: BaseCardGame,

  id: "mod3",
  cards: null,
  dealFromStock: "to piles",

  init: function() {
    var css = [[2,5,8,11], [3,6,9,12], [4,7,10,13]];

    function inPlace() { return this.parentNode.isFoundation && !!this.previousSibling; };
    function inPlace2() { return this.parentNode.row == this.row; }
    function baseInPlace() { return this.hasChildNodes() && this.firstChild.number==this.baseNumber; }

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
    for(i = 0; i != 24; i++) fs[i].__defineGetter__("baseCardInPlace", baseInPlace);
    for(i = 0; i != 8; i++) ps[i].baseCardInPlace = false;
    this.stock.baseCardInPlace = false;

    var rs = this.rows = [fs.slice(0,8), fs.slice(8,16), fs.slice(16), ps];
    for(i = 0; i != 4; i++)
      for(j = 0; j != 8; j++)
        rs[i][j].row = i;
    this.stock.row = 4; // just so long as it's not 0, 1, or 2

    for(i = 0; i != i; i++)
      for(j = 0; j != 8; j++)
        this.rows[i][j].baseNumber = i + 2;
  },

  deal: function(cards) {
    for(var i = 0; i != 24; i++) this.foundations[i].dealTo(cards, 0, 1);
    for(i = 0; i != 8; i++) this.piles[i].dealTo(cards, 0, 1);
    this.stock.dealTo(cards, cards.length, 0);
  },

  get initialScore() {
    var score = 0;
    const fs = this.foundations;
    for(var i = 0; i != 24; i++) if(fs[i].lastChild.inPlace) score += MOD3_CARD_IN_PLACE;
    return score;
  },

  // games that start with no cards in the correct place on the foundations are impossible
  shuffleImpossible: function(cards) {
    for(var i = 95; i != 87; i--)
      if(cards[i].number==2 || cards[i-8].number==3 || cards[i-16].number==4)
        return false;
    return true;
  },

  mayTakeCardFromPile: "single card",

  mayAddCardToFoundation: function(card) {
    if(card.parentNode == this) return false;
    var last = this.lastChild;
    return last ? last.inPlace && (card.down==last || card.twin.down==last) : !card.down && card.row==this.row;
  },

  mayAddCardToPile: "if empty",

  getHints: function() {
    for(var i = 0; i != this.allpiles.length; i++) {
      var source = this.allpiles[i];
      if(source.isStock || !source.hasChildNodes()) continue;
      var card = source.lastChild;

      var row = this.rows[card.row];
      for(var j = 0; j != 8; j++) {
        var target = row[j];
        if(!target.mayAddCard(card)) continue;
        // hints are useful if:
        // - |target| is empty and in a different row (so we don't suggest moving a 2/3/4 along a row)
        // - |target| is nonempty, and |card| is the only card in |source|
        if(source.isFoundation && (target.hasChildNodes() ? card.previousSibling : source.row==target.row)) continue;
        this.addHint(card, target);
      }
    }
  },

  getBestMoveForCard: function(card) {
    if(card.down) {
      var d1 = card.down, d2 = card.twin.down;
      if(d1.inPlace && !d1.nextSibling) return d1.parentNode;
      if(d2.inPlace && !d2.nextSibling) return d2.parentNode;
    } else {
      var p = findEmpty(this.rows[card.row]);
      if(p) return p;
    }
    var parent = card.parentNode;
    return findEmpty(parent.isNormalPile ? parent.surrounding : this.piles);
  },

  autoplayMove: function() {
    var rs = this.rows;
    for(var r = 0; r != 3; r++) {
      var shouldFillEmpty = true; // don't do so if any foudations have "junk" in them
      var empty = null; // an empty <foundation>, if we find one
      for(var c = 0; c != 8; c++) {
        var pile = rs[r][c], last = pile.lastChild;
        // we choose not to autoplay onto a card whose twin isn't in place
        if(last) {
          if(!last.inPlace) { shouldFillEmpty = false; continue; }
          if(!last.twin.inPlace) continue;
          var up1 = last.up, up2 = last.twin.up;
          if(up1 && !up1.inPlace && !up1.nextSibling && !up1.parentNode.isStock) return this.moveTo(up1, pile);
          if(up2 && !up2.inPlace && !up2.nextSibling && !up2.parentNode.isStock) return this.moveTo(up2, pile);
        } else if(shouldFillEmpty && !empty) {
          empty = pile;
        }
      }
      // we've reached the end of the row, but might have found an empty pile we could fill
      if(!shouldFillEmpty || !empty) continue;
      var bs = this.bases[r];
      for(var i = 0; i != 8; i++) {
        var card = bs[i];
        if(!card.parentNode.isStock && !card.nextSibling && !card.inPlace) return this.moveTo(card, empty);
      }
    }
    return false;
  },

  hasBeenWon: function() {
    if(this.stock.hasChildNodes()) return false;
    const ps = this.piles;
    for(var i = 0; i != 8; i++)
      if(ps[i].hasChildNodes()) return false
    return true;
  },

  getScoreFor: function(action) {
    var score = 0;

    if(action.action=="dealt-from-stock") {
      // how many empty piles are we going to fill?
      for(var j = 0; j != 8; j++)
        if(!this.piles[j].hasChildNodes()) score -= MOD3_EMPTY_PILE;
      return score;
    }

    // it's a MoveAction
    var card = action.card, source = action.source, destination = action.destination;
    // if the user dragged+dropped the card then the source isn't the card's parent node, but if they
    // right-clicked it then it will be.
    var notInSource = card.parentNode!=source;

    if(source.isFoundation) {
      if(notInSource ? source.mayAddCard(card) : source.baseCardInPlace) score -= MOD3_CARD_IN_PLACE;
    } else {
      if(notInSource ? !source.hasChildNodes() : !card.previousSibling) score += MOD3_EMPTY_PILE;
    }
    if(destination.isFoundation) score += MOD3_CARD_IN_PLACE;
    else if(!destination.hasChildNodes()) score -= MOD3_EMPTY_PILE;

    return score;
  }
}
