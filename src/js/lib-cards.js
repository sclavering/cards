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


function make_cards(repeat, suits, numbers) {
  if(!repeat) repeat = 1;
  if(!suits) suits = 'SHDC';
  if(!numbers) numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  return [for(suit of suits) for(_ of irange(repeat)) for(num of numbers) new Card(num, suit)];
}


function Card(number, suit) {
  this.colour = { S: 'B', H: 'R', D: 'R', C: 'B' }[suit];
  this.suit = suit;
  this.displayStr = suit + number;
  this.number = number;

  this.faceUp = false;
  this.pile = null; // the pile the card is in
  this.index = -1;  // the position within the pile
}
Card.prototype = {
  get isLast() { return this.index === this.pile.cards.length - 1; },

  // pass a boolean
  setFaceUp: function(val) {
    this.faceUp = val;
    const p = this.pile;
    if(p) p.view.update();
  },
};


function is_next(a, b) {
  return a.number + 1 === b.number;
};

function is_next_mod13(a, b) {
  return a.number === 13 ? b.number === 1 : a.number + 1 === b.number;
};

function is_next_in_suit(a, b) {
  return a.number + 1 === b.number && a.suit === b.suit;
};

function is_next_in_suit_mod13(a, b) {
  return a.suit === b.suit && is_next_mod13(a, b);
};

function is_next_and_same_colour(a, b) {
  return a.number + 1 === b.number && a.colour === b.colour;
};

function is_next_and_alt_colour(a, b) {
  return a.number + 1 === b.number && a.colour !== b.colour;
};

function is_next_and_alt_colour_mod13(a, b) {
  return a.colour !== b.colour && is_next_mod13(a, b);
};

function is_up_or_down_mod13(a, b) {
  return is_next_mod13(a, b) || is_next_mod13(b, a);
};
