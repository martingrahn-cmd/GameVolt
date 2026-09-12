const { test } = require('node:test');
const assert = require('node:assert/strict');
const analytics = require('./gv-demo-analytics.js');

test('demo source and mode values are kept low-cardinality', () => {
  assert.equal(analytics.normalizeSource('homepage_demo'), 'homepage_demo');
  assert.equal(analytics.normalizeSource('anything-user-supplied'), 'direct');
  assert.equal(analytics.normalizeMode('demo'), 'populated_city');
  assert.equal(analytics.normalizeMode('play'), 'new_city');
  assert.equal(analytics.normalizeMode('other'), 'direct');
});

test('tool labels map to stable analytics names', () => {
  assert.equal(analytics.toolName('Build roads'), 'roads');
  assert.equal(analytics.toolName('Water & Sewage'), 'water_sewage');
  assert.equal(analytics.toolName('Open statistics'), 'statistics');
  assert.equal(analytics.toolName('Settings'), '');
});
