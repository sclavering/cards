function find_empty(piles: AnyPile[]): AnyPile {
  for(let p of piles) if(!p.cards.length) return p;
  return null;
}

function find_pile_by_top_card(piles: AnyPile[], predicate: (c: Card) => boolean): AnyPile {
  for(let p of piles) if(p.cards.length && predicate(p.last_card)) return p;
  return null;
}

function for_each_top_card(piles: AnyPile[], func: (c: Card) => void): void {
  for(let p of piles) if(p.cards.length) func(p.last_card);
}

function includes_pile_starting_with_suit(ps: AnyPile[], suit: string): boolean {
  for(let p of ps) if(p.cards.length && p.cards[0].suit === suit) return true;
  return false;
}
