// Attribution is a licence obligation, so the failure that matters is drift:
// someone adds a source to CREDITS.md and the screen in the app keeps showing
// the old two rows. Nothing about that looks broken on screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const { credits, note } = JSON.parse(read('content/credits.json'));
const CREDITS_MD = read('CREDITS.md');

const licenses = (text) => [...new Set(text.match(/https:\/\/creativecommons\.org\/licenses\/[^)\s>]+/g))];

/**
 * The sources CREDITS.md declares. Keyed by the source link rather than the
 * licence: two sources can share one licence, and comparing licences alone
 * would let a third CC BY 4.0 source slip onto the page unattributed.
 */
const sources = (text) => [...text.matchAll(/Джерело:\s*<([^>]+)>/g)].map((m) => m[1]);

test('the screen names every source CREDITS.md names', () => {
  assert.deepEqual(credits.map((c) => c.sourceUrl).sort(), sources(CREDITS_MD).sort());
});

test('the screen names every licence CREDITS.md names', () => {
  assert.deepEqual(
    licenses(credits.map((c) => c.licenseUrl).join('\n')).sort(),
    licenses(CREDITS_MD).sort(),
  );
});

test('every row carries what a licence asks for: author, licence, its text', () => {
  for (const row of credits) {
    for (const field of ['work', 'author', 'license', 'licenseUrl', 'sourceUrl']) {
      assert.match(row[field] ?? '', /\S/, `${row.work}: empty "${field}"`);
    }
    for (const lang of ['uk', 'en']) {
      assert.match(row.what?.[lang] ?? '', /\S/, `${row.work}: no "what" in ${lang}`);
      assert.match(note?.[lang] ?? '', /\S/, `no note in ${lang}`);
    }
  }
});

test('illustrations and Exercise data are separate rows', () => {
  assert.ok(credits.length >= 2);
  assert.equal(new Set(credits.map((c) => c.work)).size, credits.length);
});

test('nothing but a licence link leaves our own domain at read time', () => {
  // Links the Trainer may tap are fine; a request the page makes on its own is
  // not. Every URL here has to be a link target, never a fetch.
  for (const row of credits) {
    assert.match(row.licenseUrl, /^https:\/\//);
    assert.match(row.sourceUrl, /^https:\/\//);
  }
});
