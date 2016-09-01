function findEmpty(piles: AnyPile[]): AnyPile {
  for(let p of piles) if(!p.hasCards) return p;
  return null;
}

function find_pile_by_top_card(piles: AnyPile[], predicate: (c: Card) => boolean): AnyPile {
  for(let p of piles) if(p.hasCards && predicate(p.lastCard)) return p;
  return null;
}

function for_each_top_card(piles: AnyPile[], func: (c: Card) => void): void {
  for(let p of piles) if(p.hasCards) func(p.lastCard);
}

function includes_pile_starting_with_suit(ps: AnyPile[], suit: string): boolean {
  for(let p of ps) if(p.hasCards && p.cards[0].suit === suit) return true;
  return false;
}

function check_consecutive_cards(first_card: Card, predicate: (a: Card, b: Card) => boolean): boolean {
  return check_count_and_consecutive_cards(first_card, null, predicate);
}

function check_count_and_consecutive_cards(first_card: Card, count: number, predicate: (a: Card, b: Card) => boolean): boolean {
  const cs = first_card.pile.cards, len = cs.length;
  if(count !== null && len - first_card.index !== count) return false;
  for(let i = first_card.index; i !== len - 1; ++i) if(!predicate(cs[i + 1], cs[i])) return false;
  return true;
}
