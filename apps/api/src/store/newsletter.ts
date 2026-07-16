import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SmartMoneyNewsletter } from "@bloom-ai/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const NEWS_FILE = join(DATA_DIR, "newsletters.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): SmartMoneyNewsletter[] {
  ensureDataDir();
  if (!existsSync(NEWS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(NEWS_FILE, "utf-8")) as SmartMoneyNewsletter[];
  } catch {
    return [];
  }
}

function save(items: SmartMoneyNewsletter[]): void {
  ensureDataDir();
  writeFileSync(NEWS_FILE, JSON.stringify(items.slice(0, 50), null, 2), "utf-8");
}

class NewsletterStore {
  private items: SmartMoneyNewsletter[] = load();
  private MAX = 50;

  add(newsletter: SmartMoneyNewsletter) {
    this.items.unshift(newsletter);
    if (this.items.length > this.MAX) this.items = this.items.slice(0, this.MAX);
    save(this.items);
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
