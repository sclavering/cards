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
    return (last && last.isSameSuit(card) && last.isConsecutiveTo(card));
  };
}
function testLastIsConsecutive(card) {
  return function(pile) {
    var last = pile.lastChild;
    return (last && last.isConsecutiveTo(card));
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

// This is useful when deciding whether a card can be autoplayed to the foundations. e.g.:
//   if(numCardsOnFoundations(RED,4)==2) ... can autoplay black fives ... (for Klondike)
// It assumes foundations are built in ascending order within a single colour, which is often true
function countCardsOnFoundations(colour, number) {
  var found = 0;
  for(var i in Game.foundations) {
    var top = Game.foundations[i].lastChild;
    if(top && top.number>=number && top.colour==colour) found++;
  }
  return found;
}
