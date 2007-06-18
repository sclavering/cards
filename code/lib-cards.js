// constants for colours and suits
// May also be seen without quotes, since they're used as object field-names.
const RED = "R", BLACK = "B";
const SPADE = "S", HEART = "H", DIAMOND = "D", CLUB = "C";
const SUITS = [SPADE, HEART, DIAMOND, CLUB];


// takes an array of cards, returns a *new* shuffled array
function shuffle(cards) {
  cards = cards.slice(0); // copy

  // shuffle several times, because Math.random() appears to be rather bad.
  for(var i = 0; i != 5; i++) {
    // invariant: cards[0..n) unshuffled, cards[n..N) shuffled
    var n = cards.length;
    while(n != 0) {
      // get num from range [0..n)
      var num = Math.random();
      while(num==1.0) num = Math.random();
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

function makeDecks(num) {
  return makeCardRuns(1, 13, null, num);
}

function makeDecksMod13(num) {
  var cs = makeDecks(num);
  for(var i = 0; i != cs.length; i+=13) {
    var a = cs[i], k = cs[i+12];
    a.down = k; k.up = a; k.upNumber = 1;
  }
  return cs;
}

function makeCardSuits(suits, repeat) {
  return makeCardRuns(1, 13, suits, repeat);
}

function makeCardRuns(start, finish, suits, repeat) {
  finish++; // so we make a run [start..finish], not [start..finish)
  var nums = new Array(finish - start);
  for(var i = 0; i != nums.length; i++) nums[i] = start+i;
  return makeCards(nums, suits, repeat);
}

function makeCards(numbers, suits, repeat) {
  if(!suits) suits = [SPADE, HEART, DIAMOND, CLUB];
  if(!repeat) repeat = 1;
  var cards = [], cs, numNums = numbers.length, numSuits = suits.length;
  // make cards and init |up| and |down| fields
  for(var r = 0; r != repeat; r++) {
    for(var s = 0; s != numSuits; s++) {
      cards.push(cs = new Array(numNums));
      for(var i = 0; i != numNums; i++) {
        cs[i] = new Card(numbers[i], suits[s]);
        if(i != 0) cs[i-1].up = cs[i], cs[i].down = cs[i-1];
      }
    }
  }
  // init |twin| fields
  if(repeat!=1) {
    const numSets = cards.length;
    for(s = 0; s != numSets; s++) {
      var set = cards[s], twins = cards[(s+numSuits) % numSets];
      for(i = 0; i != numNums; i++) set[i].twin = twins[i];
    }
  }
  return flattenOnce(cards);
}

// Used for Penguin, Canfield, Demon
// |cards| should be concatenated series of A-K runs within suit
// |num| is the number (as displayed) of the cards which should be made to behave like Aces (1's)
function renumberCards(cards, num) {
  var neg = 1 - num, pos = 14 - num;
  for(var i = 0; i != cards.length; ++i) {
    var c = cards[i], n = c.displayNum, m = n >= num ? neg : pos;
//    dump("renumbering "+c.displayStr+" to "+(n+m)+"\n");
    c.renumber(n + m);
  }
}

// pass number==14 for a "high" Ace
function Card(number, suit) {
  this.colour = { S: BLACK, H: RED, D: RED, C: BLACK }[suit];
  this.suit = suit;
  this.displayNum = number == 14 ? 1 : number
  this.displayStr = suit + this.displayNum;
  this.renumber(number);
}
Card.prototype = {
  // Pointers to next card up and down in the same suit. For Mod3 3C.up==6C etc.
  up: null,
  down: null,
  // null, or a link to the next member of a ring of cards with the same suit+number
  twin: null,

  faceUp: false,

  pile: null, // the pile the card is in
  index: -1,  // the position within the pile

  get isLast() { return this.index == this.pile.cards.length - 1; },
  get isFirst() { return this.index == 0; },

  isA: function(suit, number) {
    return this.suit == suit && this.number == number;
  },

  // this is necessary so that somePile.build[card] works correctly
  toString: function() { return this.str; },
  // used by pile views
  get image() { return images[this.faceUp ? this : "facedowncard"]; },

  renumber: function(number) {
    this.number = number;
    this.upNumber = number + 1; // this.number==other.number+1 used to be very common
    this.isAce = number == 1 || number == 14;
    this.isKing = number == 13;
    this.isQueen = number == 12;
    this.str = this.suit + number;
  },

  // pass a boolean
  setFaceUp: function(val) {
    this.faceUp = val;
    const p = this.pile;
    if(p) p.view.update();
  },

  get mayTake() { return this.pile.mayTakeCard(this); }
};
