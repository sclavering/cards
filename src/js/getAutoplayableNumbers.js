// These are commonly-used implementations of games' .getAutoplayableNumbers().
// They return a suit -> number map, where e.g. if .S = 7 then any spade of number 7 or lower is eligible for autoplay.

function autoplay_any_card() {
  return { S: 13, H: 13, D: 13, C: 13 };
}

// Can put 5H up if 4C and 4S are up (since there's then no reason to keep 5H down).
// Can always put A* up, and also 2* (because they're never needed to put an Ace on).
function autoplay_any_where_all_lower_of_other_colour_are_on_foundations_and_also_any_two() {
  return _getAutoplayableNumbers_klondike(this.foundations, true);
}

function autoplay_any_where_all_lower_of_other_colour_are_on_foundations() {
  return _getAutoplayableNumbers_klondike(this.foundations, false);
}

function _getAutoplayableNumbers_klondike(fs, always_allow_twos) {
  const colour_nums = { R: 1000, B: 1000 }; // colour -> smallest num of that colour on the top of an f
  const colour_counts = { R: 0, B: 0 }; // num of fs of a given colour
  for(var i = 0; i !== fs.length; ++i) {
    var c = fs[i].lastCard;
    if(!c) continue;
    colour_counts[c.colour]++;
    if(colour_nums[c.colour] > c.number) colour_nums[c.colour] = c.number;
  }
  if(colour_counts.R < fs.length / 2) colour_nums.R = always_allow_twos ? 1 : 0;
  if(colour_counts.B < fs.length / 2) colour_nums.B = always_allow_twos ? 1 : 0;
  const black = colour_nums.R + 1, red = colour_nums.B + 1; // note the flip
  return { S: black, H: red, D: red, C: black };
}

// e.g. can autoplay 5D when all 4Ds are on foundations.
// Assumes two full decks are in use.
function autoplay_any_where_all_lower_of_same_suit_are_on_foundations() {
  const nums = { S: 20, H: 20, D: 20, C: 20 }; // suit -> lowest rank seen on fs
  const counts = { S: 0, H: 0, D: 0, C: 0 }; // suit -> num of such on fs
  for(let f of this.foundations) {
    let c = f.lastCard;
    if(!c) continue;
    ++counts[c.suit];
    if(c.number < nums[c.suit]) nums[c.suit] = c.number;
  }
  for(let i in counts) {
    if(counts[i] < 2) nums[i] = 1;
    else ++nums[i];
  }
  return nums;
}
