/* global describe, it */
/* eslint-disable no-console */
const assert = require('assert');
const BulkWriter = require('../bulk_writer');

describe('BulkWriter retry', () => {
  it('keeps structured entries after repeated buffered failures', async () => {
    const calls = [];
    const client = {
      bulk({ body }) {
        calls.push(body);
        return calls.length < 3 ? Promise.reject(new Error('temporary failure')) : Promise.resolve({ errors: false });
      }
    };
    const writer = new BulkWriter(client, { buffering: true });
    writer.stop = () => {};
    writer.checkEsConnection = () => Promise.resolve();
    const entry = { index: 'test', type: 'doc', doc: { message: 'synthetic' } };
    writer.bulk.push(entry);
    const originalError = console.error;
    console.error = () => {};
    try {
      await writer.flush();
      assert.deepStrictEqual(writer.bulk, [entry]);
      await writer.flush();
      assert.deepStrictEqual(writer.bulk, [entry]);
      await writer.flush();
    } finally {
      console.error = originalError;
    }
    assert.deepStrictEqual(calls[1], calls[0]);
    assert.deepStrictEqual(calls[2], calls[0]);
    assert.deepStrictEqual(writer.bulk, []);
  });

  it('keeps a structured entry after an immediate write failure', async () => {
    const writer = new BulkWriter({
      bulk() { return Promise.reject(new Error('temporary failure')); }
    }, { buffering: false, bufferLimit: 1 });
    writer.stop = () => {};
    writer.checkEsConnection = () => Promise.resolve();
    const originalError = console.error;
    console.error = () => {};
    try {
      writer.append('test', 'doc', { message: 'synthetic' });
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      console.error = originalError;
    }
    assert.deepStrictEqual(writer.bulk, [
      { index: 'test', type: 'doc', doc: { message: 'synthetic' } }
    ]);
  });
});
