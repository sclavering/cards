function prepare_freecell_move_animation(cseq: CardSequence, dest: AnyPile, cells: AnyPile[], spaces: AnyPile[]) {
  const num_movable_via_cells = cells.length + 1;
  const steps: AnimationSteps = [];

  const src_cards = cseq.source.cards.slice(0, cseq.index);
  const moving_cards = cseq.cards;
  const dest_cards = dest.cards.slice(); // This will get captured in closures, and dest.cards gets mutated by the actual card transfer just after this function returns.
  if(moving_cards.length <= num_movable_via_cells) {
    _freecell_animate_simple(steps, cseq.source, dest, src_cards, moving_cards, dest_cards, cells);
  } else if(moving_cards.length <= num_movable_via_cells + spaces.length) {
    _freecell_animate_simple(steps, cseq.source, dest, src_cards, moving_cards, dest_cards, cells.concat(spaces));
  } else if(moving_cards.length <= num_movable_via_cells * (spaces.length + 1)) {
    _freecell_animate_medium(steps, cseq.source, dest, src_cards, moving_cards, dest_cards, cells, spaces);
  } else {
    // We know that moving_cards.length <= num_movable_via_cells * (sum(1, 2, ... spaces.length) + 1)
    _freecell_animate_complex(steps, cseq.source, dest, src_cards, moving_cards, dest_cards, cells, spaces);
  }

  return { steps: steps, piles_to_update: [].concat(cseq.source, dest, cells, spaces) };
}

function _freecell_evil_get_card_absolute_coords(pile: AnyPile, num_in_pile: number, card_index: number) {
  // xxx Making this work for all possible View subclasses (rather than those actually used in relevant games) would require more work, and this will do for now.
  const view = pile.view;
  let y_offset = 0;
  if(view instanceof _FlexFanView) y_offset = view.calculate_new_offset(g_v_fan_offset, view.canvas_height - g_card_height, num_in_pile);
  const r = view.pixel_rect();
  return [r.left, r.top + y_offset * card_index];
}

function _freecell_animate_step(steps: AnimationSteps, src: AnyPile, dest: AnyPile, src_cards: Card[], moving_card: Card, dest_cards: Card[]) {
  const [x0, y0] = _freecell_evil_get_card_absolute_coords(src, src_cards.length + 1, src_cards.length);
  steps.push([k_animation_delay, () => g_floating_pile.start_freecell_animation(src, src_cards, moving_card, x0, y0)]);

  const [x1, y1] = _freecell_evil_get_card_absolute_coords(dest, dest_cards.length, dest_cards.length);

  const transition_duration_ms = g_floating_pile.get_transition_duration_ms(x0, y0, x1, y1);
  steps.push([0, function() { g_floating_pile.transition_from_to(x0, y0, x1, y1, transition_duration_ms); }]);

  // In normal animation we just let g_animations update the target pile, but here we're probably dealing with a temporary move anyway, so must do it ourselves.
  steps.push([k_animation_repack_delay, () => {
    g_floating_pile.hide();
    dest.view.update_with(dest_cards.concat(moving_card));
  }]);
}

// Put one card in each cell (or space), then move the main card, then move them all back on to it.
function _freecell_animate_simple(steps: AnimationSteps, src: AnyPile, dest: AnyPile, src_cards: Card[], moving_cards: Card[], dest_cards: Card[], cells: AnyPile[]): void {
  // The name "batches" is just for consistency with the other similar functions.
  interface SimpleBatch { where: AnyPile; card: Card; src_extra_cards: Card[]; };
  const batches: SimpleBatch[] = [];
  for(let ix = moving_cards.length - 1, n = 0; ix >= 1; --ix, ++n) batches.push({ where: cells[n], card: moving_cards[ix], src_extra_cards: moving_cards.slice(0, ix) });

  for(let batch of batches) _freecell_animate_step(steps, src, batch.where, src_cards.concat(batch.src_extra_cards), batch.card, []);
  _freecell_animate_step(steps, src, dest, src_cards, moving_cards[0], dest_cards);
  for(let batch of batches.reverse()) _freecell_animate_step(steps, batch.where, dest, [], batch.card, dest_cards.concat(batch.src_extra_cards));
}

// Use C cells to put C+1 cards in each space, until there's C+1 or fewer remaining, and they can move to the destination rather than a space (still via cells).  Then transfer each space's cards to the destination.
function _freecell_animate_medium(steps: AnimationSteps, src: AnyPile, dest: AnyPile, src_cards: Card[], moving_cards: Card[], dest_cards: Card[], cells: AnyPile[], spaces: AnyPile[]): void {
  const num_movable_via_cells = cells.length + 1;
  if(moving_cards.length <= num_movable_via_cells) return _freecell_animate_simple(steps, src, dest, src_cards, moving_cards, dest_cards, cells);
  if(moving_cards.length <= num_movable_via_cells + spaces.length) return _freecell_animate_simple(steps, src, dest, src_cards, moving_cards, dest_cards, cells.concat(spaces));

  interface MediumBatch { where: AnyPile; cards: Card[]; src_extra_cards: Card[]; };
  const batches: MediumBatch[] = [];
  let s = 0;
  let ix = moving_cards.length;
  while(ix > num_movable_via_cells) {
    ix -= num_movable_via_cells;
    batches.push({ where: spaces[s], cards: moving_cards.slice(ix, ix + num_movable_via_cells), src_extra_cards: moving_cards.slice(0, ix) });
    ++s;
  }
  const final_batch_cards = moving_cards.slice(0, ix);

  for(let batch of batches) _freecell_animate_simple(steps, src, batch.where, src_cards.concat(batch.src_extra_cards), batch.cards, [], cells);
  _freecell_animate_simple(steps, src, dest, src_cards, final_batch_cards, dest_cards, cells);
  for(let batch of batches.reverse()) _freecell_animate_simple(steps, batch.where, dest, [], batch.cards, dest_cards.concat(batch.src_extra_cards), cells);
}

// This fills each space with (cells.length + 1) cards like above, then packs them all into a single space.  This process is repeated (with ever-fewer spaces) until there are few enough cards to switch to a simpler strategy.
function _freecell_animate_complex(steps: AnimationSteps, src: AnyPile, dest: AnyPile, src_cards: Card[], moving_cards: Card[], dest_cards: Card[], cells: AnyPile[], spaces: AnyPile[]): void {
  const num_movable_via_cells = cells.length + 1;
  interface ComplexBatch { where: AnyPile; cards: Card[]; src_extra_cards: Card[]; available: AnyPile[] };
  const batches: ComplexBatch[] = [];
  let top = moving_cards.length;
  let dest_cards_acc = dest_cards;
  while(true) {
    let batch_size = (spaces.length + 1) * num_movable_via_cells;
    if(top <= batch_size) break;
    let space = spaces.shift();
    batch_size -= num_movable_via_cells;
    let btm = top - batch_size;
    batches.push({ where: space, cards: moving_cards.slice(btm, top), src_extra_cards: moving_cards.slice(0, btm), available: spaces.slice() });
    top = btm;
  }
  const final_batch_cards = moving_cards.slice(0, top);

  for(let batch of batches) _freecell_animate_medium(steps, src, batch.where, src_cards.concat(batch.src_extra_cards), batch.cards, [], cells, batch.available);
  _freecell_animate_medium(steps, src, dest, src_cards, final_batch_cards, dest_cards, cells, spaces);
  for(let batch of batches.reverse()) _freecell_animate_medium(steps, batch.where, dest, [], batch.cards, dest_cards.concat(batch.src_extra_cards), cells, batch.available);
}

