// some useful functions for implementing smartMove/getBestMoveForCard and getHints

function searchPiles(piles, test) {
  for(var i = 0; i != piles.length; i++) if(test(piles[i])) return piles[i];
  return null;
}

function filter(list, test) {
  var result = [];
  for(var i = 0; i != list.length; i++) if(test(list[i])) result.push(list[i]);
  return result;
}

function getPilesRound(pile) {
  if("surroundingPiles" in pile) return pile.surroundingPiles;

  var piles = [];
  var left = pile, right = pile;
  while(true) {
    left = nextStackLeft(left);
    right = nextStackRight(right);
    if(!left && !right) break;
    if(left) piles.push(left);
    if(right) piles.push(right);
  }
  pile.surroundingPiles = piles;
  return piles;
}
// these rely on a row of stacks being sibing nodes, so XUL should be set up appropriately
function nextStackLeft(stack) {
  if(!stack) return null;
  for(var n = stack.previousSibling; n; n = n.previousSibling)
    if(("isPile" in n) && n.isPile) return n;
  return null;
}
function nextStackRight(stack) {
  if(!stack) return null;
  for(var n = stack.nextSibling; n; n = n.nextSibling)
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
