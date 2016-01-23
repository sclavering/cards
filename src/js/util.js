function* irange(N) {
  for(var i = 0; i < N; ++i) yield i;
}

function repeat(item, number) {
  return [for(_ of irange(number)) item];
}

// Make a linked-list of the array items, using the given link field names
function linkList(items, prevPropName, nextPropName, loop) {
  for(var i = 0; i !== items.length; ++i) {
    items[i][prevPropName] = items[i - 1] || null;
    items[i][nextPropName] = items[i + 1] || null;
  }
  if(!loop) return items;
  const first = items[0], last = items[items.length - 1];
  first[prevPropName] = last;
  last[nextPropName] = first;
  return items;
}

function flatten_array(xss) {
  return [].concat.apply([], xss);
}

function findEmpty(piles) {
  for(let p of piles) if(!p.hasCards) return p;
  return null;
}

function find_pile_by_top_card(piles, predicate) {
  for(let p of piles) if(p.hasCards && predicate(p.lastCard)) return p;
  return null;
}

function for_each_top_card(piles, func) {
  for(let p of piles) if(p.hasCards) func(p.lastCard);
}

function includes_pile_starting_with_suit(ps, suit) {
  for(let p of ps) if(p.hasCards && p.cards[0].suit === suit) return true;
  return false;
}
