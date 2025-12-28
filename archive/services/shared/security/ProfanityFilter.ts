export class ProfanityFilter {
  private static instance: ProfanityFilter;
  private readonly profanityList: Set<string> = new Set();

  private constructor() {
    // Initialize with basic profanity list
    // In production, load from a proper source
    this.profanityList = new Set(["badword1", "badword2"]);
  }

  static getInstance(): ProfanityFilter {
    if (!ProfanityFilter.instance) {
      ProfanityFilter.instance = new ProfanityFilter();
    }
    return ProfanityFilter.instance;
  }

  async check(text: string): Promise<boolean> {
    const words = text.toLowerCase().split(/\s+/);
    return words.some((word) => this.profanityList.has(word));
  }
}

export const profanityFilter = ProfanityFilter.getInstance();
