// Standard implementations of .best_destination_for(cseq)

function best_destination_for__nearest_legal_pile_preferring_nonempty(cseq) {
  const ps = cseq.source.is_pile ? cseq.source.surrounding() : this.piles;
  let maybe = null;
  for(let p of ps) {
    if(!p.may_add_card_maybe_to_self(cseq.first)) continue;
    if(p.cards.length) return p;
    if(!maybe) maybe = p;
  }
  return maybe;
}

function best_destination_for__nearest_legal_pile(cseq) {
  const ps = cseq.source.is_pile ? cseq.source.surrounding() : this.piles;
  for(let p of ps) if(p.may_add_card_maybe_to_self(cseq.first)) return p;
  return null;
}

function best_destination_for__nearest_legal_pile_or_cell(cseq) {
  const p = best_destination_for__nearest_legal_pile.call(this, cseq);
  return p || (cseq.first.isLast ? findEmpty(this.cells) : null);;
}
