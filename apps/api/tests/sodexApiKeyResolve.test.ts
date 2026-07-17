import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SoDEX API key auto-resolve matching", () => {
  it("prefers named key over default when publicKey matches", () => {
    const signing = "0xaa86fc7194314e96bc37e61d4cf5c04f3b136a21";
    const rows = [
      { name: "default", publicKey: "0x17877260f63536223f15a9f3c97d5df910115397" },
      { name: "webkey", publicKey: "0xaa86fc7194314e96bc37e61d4cf5c04f3b136a21" },
    ];
    const hit = rows.find((k) => k.publicKey.toLowerCase() === signing.toLowerCase());
    assert.equal(hit?.name, "webkey");
  });

  it("maps master address to default (omit header)", () => {
    const signing = "0x17877260f63536223f15a9f3c97d5df910115397";
    const rows = [
      { name: "default", publicKey: "0x17877260f63536223f15a9f3c97d5df910115397" },
      { name: "webkey", publicKey: "0xaa86fc7194314e96bc37e61d4cf5c04f3b136a21" },
    ];
    const hit = rows.find((k) => k.publicKey.toLowerCase() === signing.toLowerCase());
    assert.equal(hit?.name, "default");
    const omitHeader = !hit || hit.name.toLowerCase() === "default";
    assert.equal(omitHeader, true);
  });
});
