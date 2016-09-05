type Suit = "S" | "H" | "D" | "C";
type Colour = "R" | "B";

// xxx Is there a better way of doing these?
interface LookupBySuit<SomeType> {
  S: SomeType;
  H: SomeType;
  D: SomeType;
  C: SomeType;
  // This is :string because :Suit isn't allowed by TypeScript.
  [suit: string]: SomeType;
};
interface LookupByColour<SomeType> {
  R: SomeType;
  B: SomeType;
  [colour: string]: SomeType;
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


function make_cards(repeat: number, suits?: string, numbers?: number[]): Card[] {
  if(!repeat) repeat = 1;
  if(!suits) suits = 'SHDC';
  if(!numbers) numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const rv = new Array();
  for(let suit of suits)
    for(let i = 0; i < repeat; ++i)
      for(let num of numbers)
        rv.push(Cards.get(num + suit));
  return rv;
}

class Cards {
  private static _cache: { [name: string]: Card };

  static init(): void {
    this._cache = {};
    for(let suit of ["S", "H", "D", "C"]) {
      for(let num = 1; num <= 13; ++num) {
        let up = this._cache[num + suit] = new Card(num, suit as Suit, true);
        let down = new Card(num, suit as Suit, false);
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
    return card.faceUp ? card : card._alt_face;
  }

  static face_down_of(card: Card) {
    return card.faceUp ? card._alt_face : card;
  }
};


// Instances are treated as immutable.
class Card {
  colour: Colour;
  suit: Suit;
  displayStr: string;
  number: number;
  faceUp: boolean;
  // Points to a card of the same number/suit with .faceUp flipped
  _alt_face: Card;

  constructor(number: number, suit: Suit, face_up: boolean) {
    const suit_to_colour: LookupBySuit<Colour> = { S: "B", H: "R", D: "R", C: "B" };
    this.colour = suit_to_colour[suit];
    this.suit = suit;
    this.displayStr = suit + number;
    this.number = number;
    this.faceUp = face_up;
  }
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
  return a.number + 1 === b.number && a.colour === b.colour;
};

function is_next_and_alt_colour(a: Card, b: Card): boolean {
  return a.number + 1 === b.number && a.colour !== b.colour;
};

function is_next_and_alt_colour_mod13(a: Card, b: Card): boolean {
  return a.colour !== b.colour && is_next_mod13(a, b);
};

function is_up_or_down_mod13(a: Card, b: Card): boolean {
  return is_next_mod13(a, b) || is_next_mod13(b, a);
};


function is_next_down(a: Card, b: Card): boolean {
  return a.number === b.number + 1;
};

function is_next_down_alt_colour(a: Card, b: Card): boolean {
  return a.number === b.number + 1 && a.colour !== b.colour;
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
