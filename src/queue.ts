import { EventEmitter } from 'events';
import type { QueueItem } from './types';

export class MusicQueue extends EventEmitter {
  items: QueueItem[] = [];
  current: QueueItem | null = null;
  loop = false;

  add(item: QueueItem): void {
    this.items.push(item);
    this.emit('added', item, this.items.length);
  }

  shift(): QueueItem | null {
    if (this.loop && this.current) return this.current;
    if (this.items.length === 0) return null;
    this.current = this.items.shift() ?? null;
    return this.current;
  }

  skip(): QueueItem | null {
    if (this.items.length === 0) {
      this.current = null;
      return null;
    }
    this.current = this.items.shift() ?? null;
    return this.current;
  }

  clear(): void {
    this.items = [];
    this.current = null;
  }

  toggleLoop(): boolean {
    this.loop = !this.loop;
    return this.loop;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  list(): QueueItem[] {
    return this.items;
  }
}
