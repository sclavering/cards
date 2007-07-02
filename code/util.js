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
