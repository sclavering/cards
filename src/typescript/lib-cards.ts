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
        rv.push(new Card(num, suit));
  return rv;
}


class Card {
  colour: string;
  suit: string;
  displayStr: string;
  number: number;
  faceUp: boolean;
  pile: AnyPile;
  index: number;
  __all_cards_index: number; // used by Game

  constructor(number: number, suit: string) {
    this.colour = { S: 'B', H: 'R', D: 'R', C: 'B' }[suit];
    this.suit = suit;
    this.displayStr = suit + number;
    this.number = number;

    this.faceUp = false;
    this.pile = null; // the pile the card is in
    this.index = -1;  // the position within the pile
  }
  get isLast(): boolean {
    return this.index === this.pile.cards.length - 1;
  }
  setFaceUp(val: boolean): void {
    this.faceUp = val;
    const p = this.pile;
    if(p) p.view.update();
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


// Represents one or more cards that are being moved, or are under consideration for moving.
class CardSequence {
  source: AnyPile;
  index: number;
  first: Card;

  constructor(source: AnyPile, index: number) {
    this.source = source;
    this.index = index;
    this.first = source.cards[index];
  }

  static from_card(card: Card): CardSequence {
    return card ? new CardSequence(card.pile, card.index) : null;
  }
};
