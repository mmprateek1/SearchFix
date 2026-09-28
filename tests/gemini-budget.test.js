import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GeminiBudget, quotaDay } from '../src/services/geminiBudget.service.js';
import { GeminiService } from '../src/services/gemini.service.js';
import { TEXT_FALLBACK_CHAIN, DOCUMENT_FALLBACK_CHAIN } from '../src/config/modelFallbacks.js';
import { withGeminiKey } from '../src/services/geminiContext.service.js';
import { createServer } from 'node:http';
import { GoogleGenAI } from '@google/genai';

const models = [...new Set([...TEXT_FALLBACK_CHAIN, ...DOCUMENT_FALLBACK_CHAIN])];
const makeConfig = (limits = {}) => ({ safetyFactor: 0.8, models: Object.fromEntries(models.map(model =>
    [model, { rpm: 5, tpm: 250000, rpd: 20, ...limits }])) });
const makeBudget = (config = makeConfig(), extra = {}) => new GeminiBudget({ config: () => config, stateFile: null, ...extra });
const primary = TEXT_FALLBACK_CHAIN[0];

test('five RPM becomes four local requests and a rolling window releases reservations', () => {
    let now = Date.UTC(2026, 8, 28, 12);
    const budget = makeBudget(undefined, { now: () => now });
    for (let i = 0; i < 4; i++) budget.reserve(primary);
    assert.throws(() => budget.reserve(primary), /RPM/);
    now += 60000;
    assert.throws(() => budget.reserve(primary), /RPM/);
    now += 1000;
    budget.reserve(primary);
});

test('input tokens are reserved before sending and actual higher usage cannot be refunded', () => {
    const budget = makeBudget();
    const reservation = budget.reserve(primary, { tokens: 199000 });
    assert.throws(() => budget.reserve(primary, { tokens: 1001 }), /TPM/);
    budget.reconcile(reservation, 200000);
    budget.reconcile(reservation, 100);
    assert.equal(reservation.event.tokens, 200000);
    assert.throws(() => budget.reserve(primary, { tokens: 1 }), /TPM/);
});

test('daily quota resets at Pacific midnight, including daylight saving changes', () => {
    for (const midnight of ['2026-09-29T07:00:00Z', '2026-12-01T08:00:00Z']) {
        let now = Date.parse(midnight) - 1;
        const budget = makeBudget(makeConfig({ rpm: 100 }), { now: () => now });
        for (let i = 0; i < 16; i++) budget.reserve(primary);
        assert.throws(() => budget.reserve(primary), /daily/);
        const before = quotaDay(now);
        now += 1;
        assert.notEqual(quotaDay(now), before);
        budget.reserve(primary);
    }
});

test('saved daily and minute reservations survive restart; invalid state fails closed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'searchfix-budget-'));
    const stateFile = path.join(dir, 'usage.json');
    try {
        const budget = makeBudget(undefined, { stateFile });
        for (let i = 0; i < 4; i++) budget.reserve(primary);
        assert.throws(() => makeBudget(undefined, { stateFile }).reserve(primary), /RPM/);
        assert.doesNotMatch(fs.readFileSync(stateFile, 'utf8'), /apiKey|systemInstruction|contents/);
        fs.writeFileSync(stateFile, '{}');
        assert.throws(() => makeBudget(undefined, { stateFile }).reserve(primary), /counters were not reset/);
    } finally {
        if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
        fs.rmdirSync(dir);
    }
});

test('unknown, zero, malformed and inconsistent shared quotas cannot make requests', () => {
    for (const invalid of [null, -1, '250000', NaN]) {
        assert.throws(() => makeBudget(makeConfig({ tpm: invalid })).reserve(primary), /Configure verified/);
    }
    assert.throws(() => makeBudget(makeConfig({ rpm: 0 })).reserve(primary), /RPM/);
    const config = makeConfig({ quotaGroup: 'shared' });
    config.models[primary].rpm = 10;
    assert.throws(() => makeBudget(config).reserve(primary), /identical/);
});

test('models in a shared provider group cannot escape its budget through fallback', () => {
    const budget = makeBudget(makeConfig({ quotaGroup: 'shared' }));
    for (let i = 0; i < 4; i++) budget.reserve(primary);
    assert.throws(() => budget.reserve(TEXT_FALLBACK_CHAIN[1]), /RPM/);
});

test('supplied historical peaks conservatively seed only the specified day', () => {
    const config = makeConfig({ rpm: 100 });
    config.initialDailyUsage = { date: '2026-09-28', requests: { [primary]: 15 } };
    let now = Date.parse('2026-09-28T12:00:00Z');
    const budget = makeBudget(config, { now: () => now });
    budget.reserve(primary);
    assert.throws(() => budget.reserve(primary), /daily/);
    now = Date.parse('2026-09-29T07:00:00Z');
    budget.reserve(primary);
    assert.equal(budget.state.buckets[primary].daily, 1);
});

test('fallback skips models before count or generation if RPM/RPD headroom is gone', async () => {
    const budget = makeBudget(), calls = [];
    for (let i = 0; i < 3; i++) budget.reserve(primary);
    const service = new GeminiService({ models: {
        countTokens: async request => { calls.push(['count', request.model]); return { totalTokens: 10 }; },
        generateContent: async request => { calls.push(['generate', request.model]); return { text: 'ok' }; }
    } }, { budget });
    assert.equal(await service.generateJSON('system', 'comment'), 'ok');
    assert.deepEqual(calls, [['count', TEXT_FALLBACK_CHAIN[1]], ['generate', TEXT_FALLBACK_CHAIN[1]]]);
});

test('PDF, TA and system text are counted; an oversized request never reaches generation on that model', async () => {
    const calls = [], pdf = { inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } };
    const service = new GeminiService({ models: {
        countTokens: async request => {
            calls.push(['count', request.model]);
            assert.deepEqual(request.contents, ['system', pdf, { text: 'TA report' }, 'claim']);
            return { totalTokens: request.model === DOCUMENT_FALLBACK_CHAIN[0] ? 200000 : 1000 };
        },
        generateContent: async request => { calls.push(['generate', request.model]); return { text: 'ok' }; }
    } }, { budget: makeBudget() });
    assert.equal(await service.generateContentWithFiles('system', 'claim', [pdf, { text: 'TA report' }]), 'ok');
    assert.deepEqual(calls, [['count', DOCUMENT_FALLBACK_CHAIN[0]], ['count', DOCUMENT_FALLBACK_CHAIN[1]], ['generate', DOCUMENT_FALLBACK_CHAIN[1]]]);
});

test('concurrent keys on the same backend share atomic reservations across both chains', async () => {
    const budget = makeBudget(), generated = [];
    const service = new GeminiService(null, { budget });
    const client = key => ({ models: {
        countTokens: async () => { await new Promise(resolve => setImmediate(resolve)); return { totalTokens: 10 }; },
        generateContent: async ({ model }) => { generated.push([key, model]); return { text: key }; }
    } });
    const keys = ['key-a', 'key-b', 'key-c'];
    const results = await Promise.all(keys.map(key => withGeminiKey(key, () => service.generateJSON('system', 'comment'), client)));
    assert.deepEqual(results, keys);
    assert.ok(generated.some(([, model]) => model !== primary));
    for (const bucket of Object.values(budget.state.buckets)) {
        assert.ok(bucket.events.reduce((sum, event) => sum + event.requests, 0) <= 4);
    }
    // Both chains contain this model: it still has one common counter.
    assert.equal(budget.settings('gemini-3.5-flash').group, 'gemini-3.5-flash');
});

test('all-full budgets produce a clear failure without any provider call', async () => {
    const budget = makeBudget();
    for (const model of TEXT_FALLBACK_CHAIN) for (let i = 0; i < 4; i++) budget.reserve(model);
    const service = new GeminiService({ models: {
        countTokens: () => assert.fail('No budget for countTokens'),
        generateContent: () => assert.fail('No budget for generation')
    } }, { budget });
    await assert.rejects(service.validateKey(), error => error.localQuota && /fallback chain/.test(error.message));
});

test('provider 429 cools down the model and retries cannot bypass preflight checks', async () => {
    const budget = makeBudget(makeConfig({ rpm: 100 })), calls = [];
    const service = new GeminiService({ models: {
        countTokens: async () => ({ totalTokens: 10 }),
        generateContent: async ({ model }) => {
            calls.push(model);
            if (model === primary) throw Object.assign(new Error('private'), { status: 429 });
            return { text: 'ok' };
        }
    } }, { budget });
    await service.generateJSON('system', 'comment');
    await service.generateJSON('system', 'comment');
    assert.deepEqual(calls, [primary, TEXT_FALLBACK_CHAIN[1], TEXT_FALLBACK_CHAIN[1]]);
});

test('key checks and transient retries consume the shared daily and minute budget', async () => {
    const config = makeConfig({ rpm: 100 });
    const budget = makeBudget(config);
    let attempts = 0;
    const service = new GeminiService({ models: {
        countTokens: async () => ({ totalTokens: 5 }),
        generateContent: async () => {
            attempts++;
            if (attempts === 1) throw Object.assign(new Error('private'), { status: 503 });
            return { text: 'OK' };
        }
    } }, { budget });
    await service.validateKey();
    assert.equal(budget.state.buckets[primary].daily, 2);
    assert.equal(Object.values(budget.state.buckets).reduce((sum, bucket) => sum + bucket.daily, 0), 6);
});

test('token count failure never bypasses TPM checking', async () => {
    const service = new GeminiService({ models: {
        countTokens: async () => ({ totalTokens: undefined }),
        generateContent: () => assert.fail('Must have a valid token count')
    } }, { budget: makeBudget() });
    await assert.rejects(service.generateJSON('system', 'comment'), /token count/);
});

test('installed Gemini SDK sends the full token preflight and does not retry HTTP errors internally', async () => {
    const requests = [];
    const server = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString());
        requests.push({ url: req.url, body });
        res.setHeader('Content-Type', 'application/json');
        if (req.url.includes(':countTokens')) return res.end(JSON.stringify({ totalTokens: 100 }));
        if (req.url.includes(primary)) {
            res.statusCode = 503;
            return res.end(JSON.stringify({ error: { code: 503, message: 'Synthetic unavailable', status: 'UNAVAILABLE' } }));
        }
        res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: '{}' }] } }], usageMetadata: { promptTokenCount: 100 } }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const client = new GoogleGenAI({ apiKey: 'synthetic-test-key', httpOptions: {
            baseUrl: `http://127.0.0.1:${server.address().port}`, retryOptions: { attempts: 1 }
        } });
        const service = new GeminiService(client, { budget: makeBudget() });
        assert.equal(await service.generateJSON('system instructions', 'comment'), '{}');
        assert.equal(requests.length, 4); // Count + generate once for each of two candidates.
        for (const request of requests.filter(item => item.url.includes(':countTokens'))) {
            assert.deepEqual(request.body.contents[0].parts, [{ text: 'system instructions' }, { text: 'comment' }]);
        }
    } finally { await new Promise(resolve => server.close(resolve)); }
});
