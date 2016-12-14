// Various predicate-getters for use with Game .autoplay_using_predicate().


// Can put 5H up if 4C and 4S are up (since there's then no reason to keep 5H down).
// Can always put A* up, and also 2* (because they're never needed to put an Ace on).
function autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(foundations: AnyPile[]): AutoplayPredicate {
  return _autoplayable_predicate_for_klondike(foundations, true, false);
};

// Similar to autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two, except that (for two-deck games) you also shouldn't autoplay a 5H until both 5H can go up (i.e. until both 4H are already up) since it's not clear which 5H it would be better to put up first.
function autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two_for_two_decks(foundations: AnyPile[]): AutoplayPredicate {
  return _autoplayable_predicate_for_klondike(foundations, true, true);
};

function autoplay_any_where_all_lower_of_other_colour_are_on_foundations(foundations: AnyPile[]): AutoplayPredicate {
  return _autoplayable_predicate_for_klondike(foundations, false, false);
};

function _autoplayable_predicate_for_klondike(fs: AnyPile[], always_allow_twos: boolean, have_two_decks: boolean): AutoplayPredicate {
  const colour_nums: LookupByColour<number> = { [Colour.R]: 1000, [Colour.B]: 1000 }; // colour -> smallest num of that colour on the top of an f
  const colour_counts: LookupByColour<number> = { [Colour.R]: 0, [Colour.B]: 0 }; // num of fs of a given colour
  for_each_top_card(fs, c => {
    const colour = card_colour(c);
    ++colour_counts[colour];
    if(card_number(c) < colour_nums[colour]) colour_nums[colour] = card_number(c);
  });
  const max_red = colour_counts[Colour.B] >= fs.length / 2 ? colour_nums[Colour.B] + 1 : (always_allow_twos ? 2 : 1);
  const max_black = colour_counts[Colour.R] >= fs.length / 2 ? colour_nums[Colour.R] + 1 : (always_allow_twos ? 2 : 1);
  const max_by_suit: LookupBySuit<number> = { [Suit.S]: max_black, [Suit.H]: max_red, [Suit.D]: max_red, [Suit.C]: max_black };
  if(have_two_decks) {
    const [suit_nums, suit_counts] = lowest_numbers_and_counts_by_suit_on_foundations(fs);
    for(let suit in max_by_suit) {
      if(suit_counts[suit] < 2) max_by_suit[suit] = 1;
      else max_by_suit[suit] = Math.min(max_by_suit[suit], suit_nums[suit] + 1);
    }
  }
  return cseq => card_number(cseq.first) <= max_by_suit[cseq.first.suit];
};


// e.g. can autoplay 5D when all 4Ds are on foundations.  Assumes two full decks are in use.
function autoplay_any_where_all_lower_of_same_suit_are_on_foundations(foundations: AnyPile[]): AutoplayPredicate {
  const [nums, counts] = lowest_numbers_and_counts_by_suit_on_foundations(foundations);
  for(let suit in counts) {
    if(counts[suit] < 2) nums[suit] = 1;
    else ++nums[suit];
  }
  return cseq => card_number(cseq.first) <= nums[cseq.first.suit];
};


function lowest_numbers_and_counts_by_suit_on_foundations(fs: AnyPile[]): [LookupBySuit<number>, LookupBySuit<number>] {
  const nums: LookupBySuit<number> = { [Suit.S]: 20, [Suit.H]: 20, [Suit.D]: 20, [Suit.C]: 20 }; // suit -> lowest rank seen on fs
  const counts: LookupBySuit<number> = { [Suit.S]: 0, [Suit.H]: 0, [Suit.D]: 0, [Suit.C]: 0 }; // suit -> num of such on fs
  for_each_top_card(fs, c => {
    ++counts[c.suit];
    if(card_number(c) < nums[c.suit]) nums[c.suit] = card_number(c);
  });
  return [nums, counts];
};
