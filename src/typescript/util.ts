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

function check_consecutive_cards(cseq: CardSequence, predicate: (a: Card, b: Card) => boolean): boolean {
  return check_count_and_consecutive_cards(cseq, null, predicate);
}

function check_count_and_consecutive_cards(cseq: CardSequence, count: number | null, predicate: (a: Card, b: Card) => boolean): boolean {
  const cs = cseq.cards;
  if(count !== null && cs.length !== count) return false;
  for(let i = 0; i !== cs.length - 1; ++i) if(!predicate(cs[i + 1], cs[i])) return false;
  return true;
}
