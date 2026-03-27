import { describe, it, expect } from "vitest";
import { buildYtDlpQueryUrl, normalizeMeetUrl } from "../src/urls";

describe("buildYtDlpQueryUrl", () => {
  it("preserva URL http(s)", () => {
    expect(buildYtDlpQueryUrl("https://youtu.be/x")).toBe("https://youtu.be/x");
    expect(buildYtDlpQueryUrl("http://a.com")).toBe("http://a.com");
  });

  it("prefixa ytsearch1 para texto de busca", () => {
    expect(buildYtDlpQueryUrl("lo fi")).toBe("ytsearch1:lo fi");
  });
});

describe("normalizeMeetUrl", () => {
  it("preserva URL completa", () => {
    expect(normalizeMeetUrl("https://meet.google.com/abc-defg-hij")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("aceita http", () => {
    expect(normalizeMeetUrl("http://meet.google.com/x")).toBe(
      "http://meet.google.com/x",
    );
  });

  it("monta URL a partir do código da sala", () => {
    expect(normalizeMeetUrl("abc-defg-hij")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });
});
