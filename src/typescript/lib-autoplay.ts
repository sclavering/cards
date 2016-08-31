// Various predicate-getters for use with Game .autoplay_using_predicate().


// Can put 5H up if 4C and 4S are up (since there's then no reason to keep 5H down).
// Can always put A* up, and also 2* (because they're never needed to put an Ace on).
function autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two(foundations) {
  return _autoplayable_predicate_for_klondike(foundations, true, false);
};

// Similar to autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two, except that (for two-deck games) you also shouldn't autoplay a 5H until both 5H can go up (i.e. until both 4H are already up) since it's not clear which 5H it would be better to put up first.
function autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two_for_two_decks(foundations) {
  return _autoplayable_predicate_for_klondike(foundations, true, true);
};

function autoplay_any_where_all_lower_of_other_colour_are_on_foundations(foundations) {
  return _autoplayable_predicate_for_klondike(foundations, false, false);
};

function _autoplayable_predicate_for_klondike(fs, always_allow_twos, have_two_decks) {
  const colour_nums = { R: 1000, B: 1000 }; // colour -> smallest num of that colour on the top of an f
  const colour_counts = { R: 0, B: 0 }; // num of fs of a given colour
  for_each_top_card(fs, c => {
    ++colour_counts[c.colour];
    if(c.number < colour_nums[c.colour]) colour_nums[c.colour] = c.number;
  });
  const max_red = colour_counts.B >= fs.length / 2 ? colour_nums.B + 1 : (always_allow_twos ? 2 : 1);
  const max_black = colour_counts.R >= fs.length / 2 ? colour_nums.R + 1 : (always_allow_twos ? 2 : 1);
  const max_by_suit = { S: max_black, H: max_red, D: max_red, C: max_black };
  if(have_two_decks) {
    const [suit_nums, suit_counts] = lowest_numbers_and_counts_by_suit_on_foundations(fs);
    for(let suit in max_by_suit) {
      if(suit_counts[suit] < 2) max_by_suit[suit] = 1;
      else max_by_suit[suit] = Math.min(max_by_suit[suit], suit_nums[suit] + 1);
    }
  }
  return card => card.number <= max_by_suit[card.suit];
};


// e.g. can autoplay 5D when all 4Ds are on foundations.  Assumes two full decks are in use.
function autoplay_any_where_all_lower_of_same_suit_are_on_foundations(foundations) {
  const [nums, counts] = lowest_numbers_and_counts_by_suit_on_foundations(foundations);
  for(let suit in counts) {
    if(counts[suit] < 2) nums[suit] = 1;
    else ++nums[suit];
  }
  return card => card.number <= nums[card.suit];
};


function lowest_numbers_and_counts_by_suit_on_foundations(fs) {
  const nums = { S: 20, H: 20, D: 20, C: 20 }; // suit -> lowest rank seen on fs
  const counts = { S: 0, H: 0, D: 0, C: 0 }; // suit -> num of such on fs
  for_each_top_card(fs, c => {
    ++counts[c.suit];
    if(c.number < nums[c.suit]) nums[c.suit] = c.number;
  });
  return [nums, counts];
};
