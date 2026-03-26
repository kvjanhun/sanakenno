/**
 * Unit tests for the localStorage wrapper module.
 *
 * @module tests/storage.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
} from '../src/utils/storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('saveToStorage', () => {
  it('writes a JSON-serialised value to localStorage', () => {
    saveToStorage('key', { score: 42 });
    expect(localStorage.getItem('key')).toBe('{"score":42}');
  });

  it('overwrites an existing value', () => {
    saveToStorage('key', 1);
    saveToStorage('key', 2);
    expect(localStorage.getItem('key')).toBe('2');
  });

  it('swallows QuotaExceededError silently', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      const err = new DOMException('quota', 'QuotaExceededError');
      throw err;
    };

    expect(() => saveToStorage('key', 'data')).not.toThrow();

    Storage.prototype.setItem = original;
  });

  it('re-throws non-quota errors', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('unexpected');
    };

    expect(() => saveToStorage('key', 'data')).toThrow('unexpected');

    Storage.prototype.setItem = original;
  });
});

describe('loadFromStorage', () => {
  it('reads and parses a JSON value', () => {
    localStorage.setItem('key', '{"score":42}');
    expect(loadFromStorage('key')).toEqual({ score: 42 });
  });

  it('returns null for a missing key', () => {
    expect(loadFromStorage('missing')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem('key', 'not-json{{{');
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadFromStorage('key')).toBeNull();
    consoleSpy.mockRestore();
  });

  it('parses arrays correctly', () => {
    localStorage.setItem('arr', '[1,2,3]');
    expect(loadFromStorage('arr')).toEqual([1, 2, 3]);
  });

  it('parses strings correctly', () => {
    localStorage.setItem('str', '"hello"');
    expect(loadFromStorage('str')).toBe('hello');
  });
});

describe('removeFromStorage', () => {
  it('removes an existing key', () => {
    localStorage.setItem('key', 'value');
    removeFromStorage('key');
    expect(localStorage.getItem('key')).toBeNull();
  });

  it('does not throw for a missing key', () => {
    expect(() => removeFromStorage('missing')).not.toThrow();
  });
});
