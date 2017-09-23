// Cards are represented as integers, bitwise-OR'ing the suit, number, and a single bit for whether the card is face-up.

// Using this *fake* definition gives us stronger type-checking from tsc.  We use "as any" where we need to deal with the real representation.
interface Card {
  __fake_property_so_nothing_else_typechecks_as_Card: any;
};

const CARD_NUMBER_MASK =    0b1111;
const CARD_SUIT_MASK =   0b1110000;
const CARD_FACEUP_BIT = 0b10000000;

enum Suit {
  // << 4, because these are bitwise-OR'd with card numbers.
  S = 1 << 4,
  H = 2 << 4,
  D = 3 << 4,
  C = 4 << 4,
  // Rarely used.
  GREEN_CLUBS = 5 << 4,
};

enum Colour {
  // Colour of a card is computed, not stored, so the numeric values don't matter.
  R, // Red
  B, // Black
  G, // Green.  Not generally used.
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


// Pass a string like "13S" or "5H".  Used in testing.
function make_card_by_name(name: string): Card {
  // Typescript 2.0's type-checking stupidly assumes enums are indexed by value (returning names) rather than vice versa.
  const suit: any = Suit[name.slice(-1) as any];
  return make_card(+name.slice(0, -1), suit, true);
};

function make_card(num: number, suit: Suit, face_up: boolean): Card {
  return (num | suit | (face_up ? CARD_FACEUP_BIT : 0)) as any;
};

function make_cards(repeat: number, suits?: Suit[] | null, numbers?: number[]): Card[] {
  if(!repeat) repeat = 1;
  if(!suits) suits = [Suit.S, Suit.H, Suit.D, Suit.C];
  if(!numbers) numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const rv: Card[] = [];
  for(let suit of suits)
    for(let i = 0; i < repeat; ++i)
      for(let num of numbers)
        rv.push(make_card(num, suit, true));
  return rv;
}

class Cards {
  static face_up_of(card: Card): Card {
    return is_face_up(card) ? card : this._alt_face(card);
  }

  static face_down_of(card: Card): Card {
    return is_face_up(card) ? this._alt_face(card) : card;
  }

  private static _alt_face(card: Card): Card {
    return ((card as any) ^ CARD_FACEUP_BIT) as any;
  }
};


function is_face_up(c: Card): boolean {
  return !!((c as any) & CARD_FACEUP_BIT);
};

function card_number(c: Card): number {
  return (c as any) & CARD_NUMBER_MASK;
};

function card_suit(c: Card): Suit {
  return (c as any) & CARD_SUIT_MASK;
};

function card_colour(c: Card): Colour {
  return card_suit(c) === Suit.S || card_suit(c) === Suit.C ? Colour.B : Colour.R;
};


function is_same_suit(a: Card, b: Card): boolean {
  return card_suit(a) === card_suit(b);
};

function is_same_colour(a: Card, b: Card) {
  return card_suit(a) === card_suit(b) || card_suit(a) === other_suit_of_same_colour[card_suit(b)];
};


function is_next(a: Card, b: Card): boolean {
  return card_number(a) + 1 === card_number(b);
};

function is_next_mod13(a: Card, b: Card): boolean {
  return card_number(a) === 13 ? card_number(b) === 1 : card_number(a) + 1 === card_number(b);
};

function is_next_in_suit(a: Card, b: Card): boolean {
  return card_number(a) + 1 === card_number(b) && card_suit(a) === card_suit(b);
};

function is_next_in_suit_mod13(a: Card, b: Card): boolean {
  return card_suit(a) === card_suit(b) && is_next_mod13(a, b);
};

function is_next_and_same_colour(a: Card, b: Card): boolean {
  return card_number(a) + 1 === card_number(b) && is_same_colour(a, b);
};

function is_next_and_alt_colour(a: Card, b: Card): boolean {
  return card_number(a) + 1 === card_number(b) && !is_same_colour(a, b);
};

function is_next_and_alt_colour_mod13(a: Card, b: Card): boolean {
  return !is_same_colour(a, b) && is_next_mod13(a, b);
};

function is_up_or_down_mod13(a: Card, b: Card): boolean {
  return is_next_mod13(a, b) || is_next_mod13(b, a);
};


function is_next_down(a: Card, b: Card): boolean {
  return card_number(a) === card_number(b) + 1;
};

function is_next_down_alt_colour(a: Card, b: Card): boolean {
  return card_number(a) === card_number(b) + 1 && !is_same_colour(a, b);
};

function is_next_down_same_suit(a: Card, b: Card): boolean {
  return card_number(a) === card_number(b) + 1 && card_suit(a) === card_suit(b);
};

function is_next_down_mod13_same_suit(a: Card, b: Card): boolean {
  return is_next_mod13(b, a) && card_suit(a) === card_suit(b);
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
