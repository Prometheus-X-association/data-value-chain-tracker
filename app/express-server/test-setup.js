const {
  after: afterAll,
  afterEach,
  before: beforeAll,
  beforeEach,
  describe,
  it,
  test,
} = require('node:test');
const { expect } = require('expect');

Object.assign(globalThis, {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
});
