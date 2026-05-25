import type { SmartMoneyNewsletter } from "@bloom-ai/types";

/** In-memory newsletter store — in production replace with Postgres */
class NewsletterStore {
  private items: SmartMoneyNewsletter[] = [];
  private MAX = 50;

  add(newsletter: SmartMoneyNewsletter) {
    this.items.unshift(newsletter); // newest first
    if (this.items.length > this.MAX) this.items.pop();
  }

  getAll(): SmartMoneyNewsletter[] {
    return this.items;
  }

  getById(id: string): SmartMoneyNewsletter | undefined {
    return this.items.find((n) => n.id === id);
  }

  getLatest(): SmartMoneyNewsletter | undefined {
    return this.items[0];
  }
}

export const newsletterStore = new NewsletterStore();
