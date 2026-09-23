import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const tokens = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map((m) => [m[1], m[2]]));
const light = tokens(css.match(/:root \{([^]*?)\n\}/)[1]);
const dark = { ...light, ...tokens(css.match(/prefers-color-scheme: dark\) \{\s*:root \{([^]*?)\n  \}/)[1]) };

const rgb = (hex) => {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

for (const [name, t] of [['light', light], ['dark', dark]]) {
  test(`${name}: text keeps 4.5:1 on its ground`, () => {
    for (const [fg, bg] of [['ink', 'bg'], ['dim', 'bg'], ['body', 'bg'], ['red', 'bg'], ['hint', 'rule'], ['ink', 'rule']]) {
      assert.ok(contrast(t[fg], t[bg]) >= 4.5, `${fg} on ${bg}: ${contrast(t[fg], t[bg]).toFixed(2)}`);
    }
  });

}

// The light figure is the shipped design; the dark one is what must not turn into a negative.
const t = dark;
const name = 'dark';
{
  test(`${name}: the five Roles differ from each other and from the resting figure`, () => {
    const roles = Object.keys(t).filter((k) => k.startsWith('r-'));
    assert.equal(roles.length, 5);
    for (const a of roles) {
      assert.ok(contrast(t[a], t['c-rest']) >= 1.8, `${a} vs resting muscle`);
      for (const b of roles) if (a < b) assert.ok(dist(t[a], t[b]) > 60, `${a} vs ${b}`);
    }
  });

  test(`${name}: the figure's layers are told apart`, () => {
    assert.ok(contrast(t['c-muscle'], t['c-rest']) >= 1.5, 'lit muscle vs resting');
    assert.ok(contrast(t['c-outline'], t['c-skin']) >= 3, 'outline vs skin');
    assert.ok(contrast(t['c-skin'], t.bg) >= 1.02 || contrast(t['c-outline'], t.bg) >= 3, 'figure vs page');
  });
}

test('every token has a dark value', () => {
  const override = tokens(css.match(/prefers-color-scheme: dark\) \{\s*:root \{([^]*?)\n  \}/)[1]);
  for (const k of Object.keys(light)) assert.ok(k in override, `--${k} has no dark value`);
});

test('the browser bar is coloured for both themes, matching --bg', () => {
  assert.match(html, new RegExp(`theme-color" content="${dark.bg}" media="\\(prefers-color-scheme: dark\\)`));
  assert.match(html, /theme-color" content="#ffffff" media="\(prefers-color-scheme: light\)/);
  assert.equal(light.bg, '#fff');
});

test('no colour is written outside the tokens', () => {
  const rules = css.replace(/:root \{[^]*?\n\}/, '').replace(/@media \(prefers-color-scheme: dark\) \{[^]*?\n\}\n/, '');
  const literals = rules.replace(/\/\*[^]*?\*\//g, '').replace(/\[(fill|stroke)='[^']*'\]/g, '').match(/#[0-9a-f]{3,8}\b|rgba?\(|(?<![-\w])(white|black)(?![-\w])/gi);
  assert.equal(literals, null);
});
