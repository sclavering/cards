// useful functions for individual games to use

// generally used in games' deal() method
function dealToPile(cards, pile, numDown, numUp) {
  for(var i = 0; i != numDown+numUp; i++) {
    var card = cards.pop();
    if(!card) continue;
    pile.addCard(card);
    if(i>=numDown) card.setFaceUp();
  }
}

function searchPiles(piles, test) {
  for(var i = 0; i != piles.length; i++) if(test(piles[i])) return piles[i];
  return null;
}

function findEmpty(piles) {
  const num = piles.length;
  for(var i = 0; i != num; i++) {
    var p = piles[i];
    if(!p.hasChildNodes()) return p;
  }
  return null;
}

function getPilesRound(pile) {
  if("surroundingPiles" in pile) return pile.surroundingPiles;

  var ps = pile.surroundingPiles = [];
  var prev = pile.prev, next = pile.next;
  while(prev && next) {
    ps.push(next); ps.push(prev);
    next = next.next; prev = prev.prev;
  }
  while(next) { ps.push(next); next = next.next; }
  while(prev) { ps.push(prev); prev = prev.prev; }
  return ps;
}


// Some functions (and functions to get functions) to pass to searchPiles
function testCanMoveToEmptyPile(card) {
  return function(pile) {
    return !pile.hasChildNodes() && Game.canMoveTo(card,pile);
  };
}



// these are to be used as mayAutoplay getter functions on cards
function mayAutoplayAfterTwoOthers() {
  return this.autoplayAfterA.parentNode.isFoundation && this.autoplayAfterB.parentNode.isFoundation;
}

function mayAutoplayAfterFourOthers() {
  var a = this.autoplayAfterA, b = this.autoplayAfterB;
  return a.parentNode.isFoundation && a.twin.parentNode.isFoundation
      && b.parentNode.isFoundation && b.twin.parentNode.isFoundation;
}
