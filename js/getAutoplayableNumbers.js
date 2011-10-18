// returns a suit -> number map
// If result.S = x then any spade with rank >=x may be autoplayed
const getAutoplayableNumbers = {
  // can play 5H if 4C and 4S played.  can play any Ace or 2
  "klondike": function() {
    const fs = this.foundations;
    const colournums = { R: 1000, B: 1000 }; // colour -> smallest num of that colour on fs
    const colourcounts = { R: 0, B: 0 }; // num of foundation of a given colour
    for(var i = 0; i != 4; ++i) {
      var c = fs[i].lastCard;
      if(!c) continue;
      var col = c.colour, num = c.number;
      colourcounts[col]++;
      if(colournums[col] > num) colournums[col] = num;
    }
    if(colourcounts.R < 2) colournums.R = 1;
    if(colourcounts.B < 2) colournums.B = 1;
    const black = colournums.R + 1, red = colournums.B + 1;
    return { S: black, H: red, D: red, C: black };
  },

  "any": function() {
    return { S: 13, H: 13, D: 13, C: 13 };
  },

  "gypsy": function() {
    const fs = this.foundations;
    const nums = { R: 20, B: 20 }, counts = { R: 0, B: 0 }; // colour -> foo maps
    for(var i = 0; i != 8; ++i) {
      var c = fs[i].lastCard;
      if(!c) continue;
      var colour = c.colour, num = c.number;
      counts[colour]++;
      if(nums[colour] > num) nums[colour] = num;
    }
    if(counts.R != 4) nums.R = 0;
    if(counts.B != 4) nums.B = 0;
    const black = nums.R + 1, red = nums.B + 1;
    return { S: black, H: red, D: red, C: black };
  }
};
