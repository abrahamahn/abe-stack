import { fuzzyMatch } from "../../../../../server/shared/utils/fuzzyMatch";

describe("FuzzyMatch", () => {
  test("Matches a whole string", () => {
    const result = fuzzyMatch("abc", "abc");
    expect(result).toEqual([{ match: "abc" }]);
  });

  test("Matches a prefix", () => {
    const result = fuzzyMatch("ab", "abc");
    expect(result).toEqual([{ match: "ab" }, { skip: "c" }]);
  });

  test("Matches word gaps", () => {
    const result = fuzzyMatch("SiL", "Simon Last");
    expect(result).toEqual([
      { match: "Si" },
      { skip: "mon " },
      { match: "L" },
      { skip: "ast" },
    ]);
  });

  test("Symbols treated like whitespace", () => {
    const result = fuzzyMatch("Ac", "Apple-cinnamon");
    expect(result).toEqual([
      { match: "A" },
      { skip: "pple-" },
      { match: "c" },
      { skip: "innamon" },
    ]);
  });

  test("Harder backtrack", () => {
    const result = fuzzyMatch("abcd", "abc bcd");
    expect(result).toEqual([{ match: "abc" }, { skip: " bc" }, { match: "d" }]);
  });
});
