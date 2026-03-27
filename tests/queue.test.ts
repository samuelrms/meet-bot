import { describe, it, expect, vi } from "vitest";
import { MusicQueue } from "../src/queue";
import type { QueueItem } from "../src/types";

function item(title: string, url = "https://x"): QueueItem {
  return { title, uploader: "u", duration: "1:00", url, query: title };
}

describe("MusicQueue", () => {
  it("add emite added e incrementa tamanho", () => {
    const q = new MusicQueue();
    const spy = vi.fn();
    q.on("added", spy);
    q.add(item("a"));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "a", url: "https://x" }),
      1,
    );
    expect(q.size()).toBe(1);
    expect(q.isEmpty()).toBe(false);
  });

  it("shift retira o primeiro e define current", () => {
    const q = new MusicQueue();
    q.add(item("a"));
    q.add(item("b"));
    const first = q.shift();
    expect(first?.title).toBe("a");
    expect(q.current?.title).toBe("a");
    expect(q.size()).toBe(1);
  });

  it("shift com fila vazia retorna null", () => {
    const q = new MusicQueue();
    expect(q.shift()).toBeNull();
  });

  it("com loop ativo shift repete current", () => {
    const q = new MusicQueue();
    q.add(item("only"));
    q.shift();
    q.toggleLoop();
    const again = q.shift();
    expect(again?.title).toBe("only");
    expect(q.items).toHaveLength(0);
  });

  it("clear zera fila e current", () => {
    const q = new MusicQueue();
    q.add(item("x"));
    q.shift();
    q.clear();
    expect(q.current).toBeNull();
    expect(q.list()).toEqual([]);
  });

  it("skip avança sem loop", () => {
    const q = new MusicQueue();
    q.add(item("a"));
    q.add(item("b"));
    q.shift();
    const next = q.skip();
    expect(next?.title).toBe("b");
  });

  it("skip com fila vazia após current limpa current", () => {
    const q = new MusicQueue();
    q.add(item("solo"));
    q.shift();
    const n = q.skip();
    expect(n).toBeNull();
    expect(q.current).toBeNull();
  });

  it("toggleLoop alterna flag", () => {
    const q = new MusicQueue();
    expect(q.toggleLoop()).toBe(true);
    expect(q.toggleLoop()).toBe(false);
  });

  it("list retorna o array interno da fila (mutações afetam o tamanho)", () => {
    const q = new MusicQueue();
    q.add(item("a"));
    const l = q.list();
    l.pop();
    expect(q.size()).toBe(0);
  });
});
