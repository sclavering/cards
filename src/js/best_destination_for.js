// Standard implementations of .best_destination_for(card)

function find_destination__nearest_legal_pile_preferring_nonempty(card) {
  const ps = card.pile.isPile ? card.pile.surrounding() : this.piles;
  let maybe = null;
  for each(let p in ps) {
    if(!p.mayAddCard(card)) continue;
    if(p.cards.length) return p;
    if(!maybe) maybe = p;
  }
  return maybe;
}

function find_destination__nearest_legal_pile(card) {
  const ps = card.pile.isPile ? card.pile.surrounding() : this.piles;
  for each(let p in ps) if(p.mayAddCard(card)) return p;
  return null;
}

function find_destination__nearest_legal_pile_or_cell(card) {
  const p = find_destination__nearest_legal_pile.call(this, card);
  return p || (card.isLast ? findEmpty(this.cells) : null);;
}
