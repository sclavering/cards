const canfield_layout = "#<   s  f f f f  [r]   ><   w  p p p p>.";


class CanfieldGame extends Game {
  protected _reserveFaceDown: number;
  protected _reserveFaceUp: number;

  static create_layout() {
    return new Layout(canfield_layout, { f: CountedView, r: CountedView });
  }

  constructor() {
    super();
    this.helpId = "canfield";
    // Note: subclasses modify this.
    this.pile_details = {
      stocks: [1, StockDealToWasteOrRefill, 0, 0],
      wastes: [1, Waste, 0, 0],
      piles: [4, CanfieldPile, 0, 0],
      foundations: [4, CanfieldFoundation, 0, 0],
      reserves: [1, Reserve, 0, 0],
    };
    this._reserveFaceDown = 12;
    this._reserveFaceUp = 1;
  }

  protected deal(cards: Card[]): void {
    const num = cards[0].number;
    for(let f of this.foundations) (f as CanfieldFoundation).canfield_foundation_base_num = num;

    let ix = 0;
    ix = this.deal_cards(cards, ix, this.foundations[0], 0, 1);
    ix = this.deal_cards(cards, ix, this.reserve, this._reserveFaceDown, this._reserveFaceUp);
    for(let p of this.piles) ix = this.deal_cards(cards, ix, p, 0, 1);
    const remainder = cards.length - 1 - this.piles.length - this._reserveFaceDown - this._reserveFaceUp;
    this.deal_cards(cards, ix, this.stock, remainder, 0);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    const base_num = (this.foundations[0] as CanfieldFoundation).canfield_foundation_base_num;
    // Remap numbers so that we can just use less-than on them.
    const _effective_num = (num: number) => num >= base_num ? num : num + 13;
    const max_nums: LookupBySuit<number> = { S: base_num, H: base_num, D: base_num, C: base_num };
    for(let f of this.foundations) if(f.hasCards) max_nums[f.firstCard.suit] = _effective_num(f.lastCard.number);
    // As in Klondike, if all the black "threes" are up, you can autoplay red "fours", and you can always autoplay "twos".  It's just that the "aces" is instead base_num, etc.
    const autoplayable: LookupByColour<number> = { R: Math.min(max_nums.S, max_nums.C) + 1, B: Math.min(max_nums.H, max_nums.D) + 1 };
    return this.autoplay_using_predicate(cseq => _effective_num(cseq.first.number) <= autoplayable[cseq.first.colour]);
  }
};
gGameClasses["canfield"] = CanfieldGame;


class CanfieldDrawThreeGame extends CanfieldGame {
  static create_layout() {
    // Waste view is different.
    return new Layout(canfield_layout, { f: CountedView, r: CountedView, w: Deal3VWasteView });
  }
  constructor() {
    super();
    this.pile_details["stocks"][1] = StockDeal3OrRefill;
  }
};
gGameClasses["canfield3"] = CanfieldDrawThreeGame;


class DemonGame extends CanfieldGame {
  static create_layout() {
    // Reserve view is different.
    return new Layout(canfield_layout, { f: CountedView, r: FanDownView });
  }
  constructor() {
    super();
    this._reserveFaceDown = 0;
    this._reserveFaceUp = 13;
  }
};
gGameClasses["demon"] = DemonGame;


class CanfieldPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return cseq.first.faceUp;
  }
  may_add(cseq: CardSequence): boolean {
    return !this.hasCards || is_next_and_alt_colour_mod13(cseq.first, this.lastCard);
  }
};


class CanfieldFoundation extends Foundation {
  canfield_foundation_base_num: number;

  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    if(!cseq.is_single) return false;
    return this.hasCards ? is_next_in_suit_mod13(this.lastCard, cseq.first) : cseq.first.number === this.canfield_foundation_base_num;
  }
};
