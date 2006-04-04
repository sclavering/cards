// constants for colours and suits
const RED = 0, BLACK = 1;
const SPADE = 1, HEART = 2, DIAMOND = 3, CLUB = 4;


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
        cs[i] = makeCard(numbers[i], suits[s]);
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
function makeCard(number, suit) {
  const card = document.createElement("image");
  for(var i in cardProto) card[i] = cardProto[i];
  card.colour = [,BLACK, RED, RED, BLACK][suit];
  card.altcolour = card.colour==RED ? BLACK : RED;
  card.suit = suit;
  card.suitstr = [,"S", "H", "D", "C"][suit];
  card.displayNum = number==14 ? 1 : number
  card.displayStr = card.suitstr + card.displayNum;
  card.renumber(number);
  return card;
}
const cardProto = {
  isCard: true,
  isAnyPile: false,

  // Pointers to next card up and down in the same suit. For Mod3 3C.up==6C etc.
  up: null,
  down: null,
  // null, or a link to the next member of a ring of cards with the same suit+number
  twin: null,

  faceUp: false,

  pile: null, // the pile the card is in
  index: -1,  // the position within the pile

  // to be replaced by a non-DOM version during model/view split
  get isLast() { return !this.nextSibling; },

  toString: function() { return this.displayStr; },

  renumber: function(number) {
    this.number = number;
    this.upNumber = number + 1; // this.number==other.number+1 used to be very common
    this.isAce = number == 1 || number == 14;
    this.isKing = number == 13;
    this.isQueen = number == 12;
  },

  updateView: function cardView_update() {
    this.className = "card " + (this.faceUp ? this.displayStr : "facedown");
  }
}
