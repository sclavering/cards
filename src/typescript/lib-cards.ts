enum Suit {
  S = 1,
  H = 2,
  D = 3,
  C = 4,
};

enum Colour {
  R = 5,
  B = 6,
};

// xxx Is there a better way of doing these?
interface LookupBySuit<SomeType> {
  // tsc 2.0 doesn't allow using :Suit here.
  [suit: number]: SomeType;
};
interface LookupByColour<SomeType> {
  // tsc 2.0 doesn't allow using :Colour here.
  [colour: number]: SomeType;
};


// takes an array of cards, returns a *new* shuffled array
function shuffle(cards: Card[]) {
  return shuffle_in_place(cards.slice());
}

function shuffle_in_place(cards: Card[]) {
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


function make_cards(repeat: number, suits?: Suit[] | null, numbers?: number[]): Card[] {
  if(!repeat) repeat = 1;
  if(!suits) suits = [Suit.S, Suit.H, Suit.D, Suit.C];
  if(!numbers) numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const rv = new Array();
  for(let suit of suits)
    for(let i = 0; i < repeat; ++i)
      for(let num of numbers)
        rv.push(Cards.get(num + Suit[suit]));
  return rv;
}

class Cards {
  private static _cache: { [name: string]: Card };

  static init(): void {
    this._cache = {};
    for(let suit of [Suit.S, Suit.H, Suit.D, Suit.C]) {
      for(let num = 1; num <= 13; ++num) {
        let up = this._cache[num + Suit[suit]] = new Card(num, suit, true);
        let down = new Card(num, suit, false);
        up._alt_face = down;
        down._alt_face = up;
      }
    }
  }

  // Names are like "11S"
  static get(name: string): Card {
    return this._cache[name];
  }

  static face_up_of(card: Card) {
    return card.face_up ? card : card._alt_face;
  }

  static face_down_of(card: Card) {
    return card.face_up ? card._alt_face : card;
  }
};


// Instances are treated as immutable.
class Card {
  colour: Colour;
  suit: Suit;
  display_str: string;
  number: number;
  face_up: boolean;
  // Points to a card of the same number/suit with .face_up flipped
  _alt_face: Card;

  constructor(number: number, suit: Suit, face_up: boolean) {
    const suit_to_colour: LookupBySuit<Colour> = { [Suit.S]: Colour.B, [Suit.H]: Colour.R, [Suit.D]: Colour.R, [Suit.C]: Colour.B };
    this.colour = suit_to_colour[suit];
    this.suit = suit;
    this.display_str = Suit[suit] + number;
    this.number = number;
    this.face_up = face_up;
  }
};


function is_same_colour(a: Card, b: Card) {
  return a.suit === b.suit || a.suit === other_suit_of_same_colour[b.suit];
};


function is_next(a: Card, b: Card): boolean {
  return a.number + 1 === b.number;
};

function is_next_mod13(a: Card, b: Card): boolean {
  return a.number === 13 ? b.number === 1 : a.number + 1 === b.number;
};

function is_next_in_suit(a: Card, b: Card): boolean {
  return a.number + 1 === b.number && a.suit === b.suit;
};

function is_next_in_suit_mod13(a: Card, b: Card): boolean {
  return a.suit === b.suit && is_next_mod13(a, b);
};

function is_next_and_same_colour(a: Card, b: Card): boolean {
  return a.number + 1 === b.number && is_same_colour(a, b);
};

function is_next_and_alt_colour(a: Card, b: Card): boolean {
  return a.number + 1 === b.number && !is_same_colour(a, b);
};

function is_next_and_alt_colour_mod13(a: Card, b: Card): boolean {
  return !is_same_colour(a, b) && is_next_mod13(a, b);
};

function is_up_or_down_mod13(a: Card, b: Card): boolean {
  return is_next_mod13(a, b) || is_next_mod13(b, a);
};


function is_next_down(a: Card, b: Card): boolean {
  return a.number === b.number + 1;
};

function is_next_down_alt_colour(a: Card, b: Card): boolean {
  return a.number === b.number + 1 && !is_same_colour(a, b);
};

function is_next_down_same_suit(a: Card, b: Card): boolean {
  return a.number === b.number + 1 && a.suit === b.suit;
};

function is_next_down_mod13_same_suit(a: Card, b: Card): boolean {
  return is_next_mod13(b, a) && a.suit === b.suit;
};


function check_consecutive_cards(cseq: CardSequence, predicate: (a: Card, b: Card) => boolean): boolean {
  const cs = cseq.cards, max = cs.length - 1;
  for(let i = 0; i !== max; ++i) if(!predicate(cs[i], cs[i + 1])) return false;
  return true;
};


// Represents one or more cards that are being moved, or are under consideration for moving.
class CardSequence {
  public source: AnyPile;
  public index: number;
  public first: Card;
  public cards: Card[];
  public count: number;

  constructor(source: AnyPile, index: number) {
    this.source = source;
    this.index = index;
    this.first = source.cards[index];
    this.cards = source.cards.slice(index);
    this.count = this.cards.length;
  }

  public get is_single(): boolean {
    return this.count === 1;
  }
};


const other_suit_of_same_colour: LookupBySuit<Suit> = {
  [Suit.S]: Suit.C,
  [Suit.H]: Suit.D,
  [Suit.D]: Suit.H,
  [Suit.C]: Suit.S,
};
