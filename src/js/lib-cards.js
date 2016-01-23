// takes an array of cards, returns a *new* shuffled array
function shuffle(cards) {
  return shuffle_in_place(cards.slice());
}

function shuffle_in_place(cards) {
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


function make_cards(repeat, suits, numbers, mod13) {
  if(!repeat) repeat = 1;
  if(!suits) suits = 'SHDC';
  if(!numbers) numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  if(!mod13) mod13 = false;
  return flatten_array([for(suit of suits) _new_card_runs(repeat, suit, numbers, mod13)]);
}

function _new_card_runs(repeat, suit, numbers, mod13) {
  const runs = [for(_ of irange(repeat)) _new_card_run(numbers, suit, mod13)];
  return flatten_array(runs);
}

function _new_card_run(numbers, suit, mod13) {
  const cs = [for(num of numbers) new Card(num, suit)];
  if(mod13) cs[cs.length - 1].upNumber = 1; // copied from old code, may be unnecessary
  return cs;
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
  faceUp: false,

  pile: null, // the pile the card is in
  index: -1,  // the position within the pile

  get isLast() { return this.index === this.pile.cards.length - 1; },
  get isFirst() { return this.index === 0; },

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


function is_next(a, b) {
  return a.number + 1 === b.number;
};

function is_next_in_suit(a, b) {
  return a.number + 1 === b.number && a.suit === b.suit;
};

function is_next_in_suit_mod13(a, b) {
  return a.suit === b.suit && (a.number === 13 ? b.number === 1 : a.number + 1 === b.number);
}

function is_next_and_same_colour(a, b) {
  return a.number + 1 === b.number && a.colour === b.colour;
};

function is_next_and_alt_colour(a, b) {
  return a.number + 1 === b.number && a.colour !== b.colour;
};
