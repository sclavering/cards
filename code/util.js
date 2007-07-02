// useful because you can for..in it, whereas on an array that gives string indexes
function irange(N) {
  for(var i = 0; i < N; ++i) yield i;
}

function range(end) {
  return [i for(i in irange(end))];
}

function range2(start, end) {
  return [start + i for(i in irange(end - start))];
}

function repeat(item, number) {
  return [item for(i in irange(number))];
}

// Make a linked-list of the array items, using the given link field names
function linkList(items, prevPropName, nextPropName, loop) {
  for(var i = 0; i != items.length; ++i) {
    items[i][prevPropName] = items[i - 1] || null;
    items[i][nextPropName] = items[i + 1] || null;
  }
  if(!loop) return items;
  const first = items[0], last = items[items.length - 1];
  first[prevPropName] = last;
  last[nextPropName] = first;
  return items;
}
