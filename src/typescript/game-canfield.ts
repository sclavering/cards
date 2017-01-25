const canfield_layout = "#<   s  f f f f  [r]   ><   w  p p p p>.";


class CanfieldGame extends Game {
  protected _reserveFaceDown: number;
  protected _reserveFaceUp: number;

  static create_layout() {
    return new Layout(canfield_layout, { f: CountedView, r: CountedView });
  }

  constructor() {
    super();
    this.help_id = "canfield";
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
    const num = card_number(cards[0]);
    for(let f of this.foundations) (f as CanfieldFoundation).canfield_foundation_base_num = num;

    let ix = 0;
    ix = this.deal_cards(cards, ix, this.foundations[0], 0, 1);
    ix = this.deal_cards(cards, ix, this.reserve, this._reserveFaceDown, this._reserveFaceUp);
    for(let p of this.piles) ix = this.deal_cards(cards, ix, p, 0, 1);
    const remainder = cards.length - 1 - this.piles.length - this._reserveFaceDown - this._reserveFaceUp;
    this.deal_cards(cards, ix, this.stock, 0, remainder);
  }

  protected best_destination_for(cseq: CardSequence): AnyPile {
    return this.best_destination_for__nearest_legal_pile_preferring_nonempty(cseq);
  }

  autoplay() {
    const base_num = (this.foundations[0] as CanfieldFoundation).canfield_foundation_base_num;
    // Remap numbers so that we can just use less-than on them.
    const _effective_num = (num: number) => num >= base_num ? num : num + 13;
    const max_nums: LookupBySuit<number> = { [Suit.S]: base_num, [Suit.H]: base_num, [Suit.D]: base_num, [Suit.C]: base_num };
    for(let f of this.foundations) if(f.cards.length) max_nums[card_suit(f.first_card)] = _effective_num(card_number(f.last_card));
    // As in Klondike, if all the black "threes" are up, you can autoplay red "fours", and you can always autoplay "twos".  It's just that the "aces" is instead base_num, etc.
    const autoplayable: LookupByColour<number> = { [Colour.R]: Math.min(max_nums[Suit.S], max_nums[Suit.C]) + 1, [Colour.B]: Math.min(max_nums[Suit.H], max_nums[Suit.D]) + 1 };
    return this.autoplay_using_predicate(cseq => _effective_num(card_number(cseq.first)) <= autoplayable[card_colour(cseq.first)]);
  }
};
g_game_classes["canfield"] = CanfieldGame;


class CanfieldDrawThreeGame extends CanfieldGame {
  static create_layout() {
    // Waste view is different.
    return new Layout(canfield_layout, { f: CountedView, r: CountedView, w: DealThreeWasteVerticalView });
  }
  constructor() {
    super();
    this.pile_details["wastes"][1] = DealThreeWaste;
    this.pile_details["stocks"][1] = StockDealThreeOrRefill;
  }
};
g_game_classes["canfield3"] = CanfieldDrawThreeGame;


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
g_game_classes["demon"] = DemonGame;


class CanfieldPile extends Pile {
  may_take(cseq: CardSequence): boolean {
    return is_face_up(cseq.first);
  }
  may_add(cseq: CardSequence): boolean {
    return !this.cards.length || is_next_and_alt_colour_mod13(cseq.first, this.last_card);
  }
};


class CanfieldFoundation extends Foundation {
  canfield_foundation_base_num: number;

  may_take(cseq: CardSequence): boolean {
    return cseq.is_single;
  }
  may_add(cseq: CardSequence): boolean {
    if(!cseq.is_single) return false;
    return this.cards.length ? is_next_in_suit_mod13(this.last_card, cseq.first) : card_number(cseq.first) === this.canfield_foundation_base_num;
  }
};
