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

function filter(list, test) {
  var result = [];
  for(var i = 0; i != list.length; i++) if(test(list[i])) result.push(list[i]);
  return result;
}

// requires the row of piles to be sibling DOM nodes
function getPilesRound(pile) {
  if("surroundingPiles" in pile) return pile.surroundingPiles;

  var piles = [];
  var left = pile, right = pile;
  while(true) {
    left = nextPileLeft(left);
    right = nextPileRight(right);
    if(!left && !right) break;
    if(right) piles.push(right);
    if(left) piles.push(left);
  }
  pile.surroundingPiles = piles;
  return piles;
}
function nextPileLeft(pile) {
  if(!pile) return null;
  for(var n = pile.previousSibling; n; n = n.previousSibling)
    if(("isPile" in n) && n.isPile) return n;
  return null;
}
function nextPileRight(pile) {
  if(!pile) return null;
  for(var n = pile.nextSibling; n; n = n.nextSibling)
    if(("isPile" in n) && n.isPile) return n;
  return null;
}

// Some functions (and functions to get functions) to pass to searchPiles
function testLastIsConsecutiveAndSameSuit(card) {
  return function(pile) {
    var last = pile.lastChild;
    return last && last.suit==card.suit && last.number==card.upNumber;
  };
}
function testLastIsConsecutive(card) {
  return function(pile) {
    var last = pile.lastChild;
    return last && last.number==card.upNumber;
  };
}
function testLastIsSuit(suit) {
  return function(pile) {
    var last = pile.lastChild;
    return last && last.suit==suit;
  };
}
function testCanMoveToNonEmptyPile(card) {
  return function(pile) {
    return pile.hasChildNodes() && Game.canMoveTo(card,pile);
  };
}
function testCanMoveToEmptyPile(card) {
  return function(pile) {
    return !pile.hasChildNodes() && Game.canMoveTo(card,pile);
  };
}
function testCanMoveToFoundation(card) {
  return function(pile) {
    return Game.canMoveToFoundation(card,pile);
  };
}
function testCanMoveToPile(card) {
  return function(pile) {
    return Game.canMoveToPile(card,pile);
  };
}
function testPileIsEmpty(pile) {
  return !pile.hasChildNodes();
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
