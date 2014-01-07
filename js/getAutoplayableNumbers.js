// returns a suit -> number map
// If result.S = x then any spade with rank >=x may be autoplayed
const getAutoplayableNumbers = {
  // Can put 5H up if 4C and 4S are up (since there's then no reason to keep 5H down).
  // Can always put A* up, and also 2* (because they're never needed to put an Ace on).
  klondike: function() { return _getAutoplayableNumbers_klondike(this.foundations, true); },

  "any": function() {
    return { S: 13, H: 13, D: 13, C: 13 };
  },
};

function autoplay_any_where_all_lower_of_other_colour_are_on_foundations() {
  return _getAutoplayableNumbers_klondike(this.foundations, false);
}

function _getAutoplayableNumbers_klondike(fs, always_allow_twos) {
  const colour_nums = { R: 1000, B: 1000 }; // colour -> smallest num of that colour on the top of an f
  const colour_counts = { R: 0, B: 0 }; // num of fs of a given colour
  for(var i = 0; i != fs.length; ++i) {
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
