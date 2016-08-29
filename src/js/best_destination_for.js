// Standard implementations of .best_destination_for(card)

function best_destination_for__nearest_legal_pile_preferring_nonempty(card) {
  const ps = card.pile.is_pile ? card.pile.surrounding() : this.piles;
  let maybe = null;
  for(let p of ps) {
    if(!p.may_add_card_maybe_to_self(card)) continue;
    if(p.cards.length) return p;
    if(!maybe) maybe = p;
  }
  return maybe;
}

function best_destination_for__nearest_legal_pile(card) {
  const ps = card.pile.is_pile ? card.pile.surrounding() : this.piles;
  for(let p of ps) if(p.may_add_card_maybe_to_self(card)) return p;
  return null;
}

function best_destination_for__nearest_legal_pile_or_cell(card) {
  const p = best_destination_for__nearest_legal_pile.call(this, card);
  return p || (card.isLast ? findEmpty(this.cells) : null);;
}
