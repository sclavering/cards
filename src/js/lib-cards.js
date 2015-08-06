// takes an array of cards, returns a *new* shuffled array
function shuffle(cards) {
  cards = cards.slice(0); // copy

  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i !== 5; i++) {
    // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
    var n = cards.length;
    while(n !== 0) {
      // get num from range [0..n)
      var num = Math.random();
      while(num === 1.0) num = Math.random();
      num = Math.floor(num * n);
      // swap
      n--;
      var temp = cards[n];
      cards[n] = cards[num];
      cards[num] = temp;
    }
  }

  return cards;
}


function makeCards(repeat, suits, numbers, mod13) {
  if(!repeat) repeat = 1;
  if(!suits) suits = 'SHDC';
  if(!numbers) numbers = range2(1, 14);
  if(!mod13) mod13 = false;
  const cardsss = [for(suit of suits) _makeCardSeqs(repeat, suit, numbers, mod13)];
  return flatten(cardsss, 3);
}

function _makeCardSeqs(repeat, suit, numbers, mod13) {
  const css = [_makeCardSeq(numbers, suit, mod13) for(i in irange(repeat))];
  // set twin fields
  if(repeat > 1)
    for(var r in irange(css.length)) // irange make r a number, rather than a string
      for(var i in css[r]) css[r][i].twin = css[(r + 1) % repeat][i];
  return css;
}

function _makeCardSeq(numbers, suit, mod13) {
  const cs = [for(num of numbers) new Card(num, suit)];
  if(mod13) cs[cs.length - 1].upNumber = 1; // copied from old code, may be unnecessary
  return linkList(cs, "down", "up", mod13);
}


// pass number === 14 for a "high" Ace
function Card(number, suit) {
  this.colour = { S: 'B', H: 'R', D: 'R', C: 'B' }[suit];
  this.suit = suit;
  this.displayNum = number === 14 ? 1 : number
  this.displayStr = suit + this.displayNum;
  this.setNumber(number);
}
Card.prototype = {
  // Pointers to next card up and down in the same suit. For Mod3 3C.up === 6C etc.
  up: null,
  down: null,
  // null, or a link to the next member of a ring of cards with the same suit+number
  twin: null,

  faceUp: false,

  pile: null, // the pile the card is in
  index: -1,  // the position within the pile

  get isLast() { return this.index === this.pile.cards.length - 1; },
  get isFirst() { return this.index === 0; },

  isA: function(suit, number) {
    return this.suit === suit && this.number === number;
  },

  // this is necessary so that somePile.build[card] works correctly
  toString: function() { return this.str; },

  setNumber: function(number) {
    this.number = number;
    this.upNumber = number + 1; // this.number === other.number+1 used to be very common
    this.isAce = number === 1 || number === 14;
    this.isKing = number === 13;
    this.isQueen = number === 12;
    this.str = this.suit + number;
  },

  // Change the logical number to fit with newAceNumber being number === 1.
  // Used in games where the starting card for foundations varies.
  renumber: function(newAceNumber) {
    // numbers being 1-based makes this messy
    const neg = 1 - newAceNumber, pos = 14 - newAceNumber, n = this.displayNum;
    this.setNumber(n + (n >= newAceNumber ? neg : pos));
  },

  // pass a boolean
  setFaceUp: function(val) {
    this.faceUp = val;
    const p = this.pile;
    if(p) p.view.update();
  },

  get mayTake() { return this.pile.mayTakeCard(this); }
};
