gGameClasses.mod3 = {
  __proto__: Game,

  pileDetails: () => [
    "s", 1, StockDealToPiles, StockView, 0, 0,
    "p", 8, AcesUpPile, FanDownView, 0, 1,
    "f", 8, { __proto__: _Mod3Foundation, _baseNum: 2 }, Mod3SlideView, 0, 1,
    "g", 8, { __proto__: _Mod3Foundation, _baseNum: 3 }, Mod3SlideView, 0, 1,
    "h", 8, { __proto__: _Mod3Foundation, _baseNum: 4 }, Mod3SlideView, 0, 1,
  ],

  layoutTemplate: '#<   f f f f f f f f     ><   g g g g g g g g><   h h h h h h h h><   p p p p p p p p s>.',

  init_cards: () => null, // handled in .init() instead

  init: function() {
    const numss = [[2,5,8,11], [3,6,9,12], [4,7,10,13]];
    const cardss = [for(nums of numss) make_cards(2, null, nums)];
    this.allcards = flatten_array(cardss);
    const baseIxs = [0, 4, 8, 12, 16, 20, 24, 28];
    this.bases = [for(cards of cardss) [for(ix of baseIxs) cards[ix]]];
    const fs = this.foundations;
    this.rows = [fs.slice(0,8), fs.slice(8,16), fs.slice(16)];
    // Ordinarily this excludes .foundations
    this.hint_and_autoplay_source_piles = [].concat(this.foundations, this.piles);
  },

  // games that start with no cards in the correct place on the foundations are impossible
  is_shuffle_impossible: function(cards) {
    for(let i = 0; i < 8; ++i)
      if(cards[i].number === 2 || cards[i + 8].number === 3 || cards[i + 16].number === 4)
        return false;
    return true;
  },

  best_destination_for: function(card) {
    return this.foundation_destination_for(card) || findEmpty(card.pile.isPile ? card.pile.surrounding() : this.piles);
  },

  autoplay: function() {
    const t0 = Date.now();
    const autoplayable_numbers_by_row = this.rows.map(row => this._autoplayable_numbers_for_row(row));
    for(let p of this.hint_and_autoplay_source_piles) {
      if(p.isFoundation && p.contains_appropriate_cards()) continue;
      let c = p.lastCard;
      if(!c || c.number > autoplayable_numbers_by_row[(c.number - 2) % 3][c.suit]) continue;
      let act = this.foundation_action_for(c);
      if(act) return act;
    }
    return null;
  },

  // The general idea here is that if both of a given number+suit are in place, it's okay to autoplay the next number (since when its twin comes up, it can go up too).  e.g. if both 6H are up, 9H can be autoplayed.  And spaces can only be filled if it won't potentially get in the way of using a different 2/3/4 to fill that space (i.e. only when there's no cards non-base_num cards in the way).
  _autoplayable_numbers_for_row: function(row) {
    const rv = { S: 0, H: 0, D: 0, C: 0 };
    const seen = {};
    let seen_invalid_cards = false;
    for(let f of row) {
      let c = f.lastCard;
      if(!c) continue;
      if(!f.contains_appropriate_cards()) seen_invalid_cards = true;
      else if(seen[c.suit]) rv[c.suit] = Math.min(seen[c.suit], c.number) + 3;
      else seen[c.suit] = c.number;
    }
    const base_num = row[0]._baseNum;
    if(!seen_invalid_cards) for(let k in rv) if(rv[k] < base_num) rv[k] = base_num;
    return rv;
  },

  is_won: function() {
    if(this.stock.hasCards) return false;
    for(let p of this.piles) if(p.cards.length) return false;
    return true;
  },
};


const _Mod3Foundation = {
  __proto__: WorryingBackFoundation,
  _baseNum: -1, // set elsewhere
  contains_appropriate_cards: function() {
    const first = this.firstCard;
    return first ? first.number === this._baseNum : false;
  },
  mayAddCard: function(card) {
    const last = this.lastCard;
    if(!this.hasCards) return card.number === this._baseNum;
    return this.contains_appropriate_cards() && card.suit === last.suit && card.number === last.number + 3;
  },
  getHintSources: function() {
    const c = this.firstCard;
    return c && !this.contains_appropriate_cards() ? [c] : [];
  }
};
