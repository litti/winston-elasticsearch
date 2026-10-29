/* global describe, it */
const assert = require('assert');
const Elasticsearch = require('../index');

describe('legacy 0.7.13 transport behavior', () => {
  it('preserves the supplied timestamp and calls back without waiting for a flush', async () => {
    const client = {
      ping() { return Promise.resolve(true); },
      bulk() { return Promise.resolve({ errors: false }); }
    };
    const transport = new Elasticsearch({
      client,
      index: 'test',
      buffering: true,
      ensureMappingTemplate: false,
      flushInterval: 60000
    });
    const timestamp = '2026-01-02T03:04:05.000Z';
    let called = false;
    try {
      transport.log({ level: 'info', message: 'synthetic', timestamp }, () => {
        called = true;
      });
      assert.strictEqual(called, true);
      assert.strictEqual(transport.bulkWriter.bulk[0].doc['@timestamp'], timestamp);
    } finally {
      await new Promise(resolve => setImmediate(resolve));
      transport.bulkWriter.stop();
    }
  });
});
