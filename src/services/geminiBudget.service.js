import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const minute = 61_000; // Extra second avoids sending on the provider's window boundary.
const pacificDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
export const quotaDay = time => pacificDate.format(new Date(time));

export function budgetError(reason) {
    return Object.assign(new Error(reason), {
        code: 'GEMINI_REQUEST_FAILED', status: 429, localQuota: true, modelFallbackAllowed: true
    });
}

// One backend represents one shared project budget, even when its callers use different keys.
// Synchronous reservations are atomic within this Node process; persist before sending.
export class GeminiBudget {
    constructor({ config = () => JSON.parse(fs.readFileSync(path.join(root, 'config/gemini-rate-limits.json'), 'utf8')),
        stateFile = path.join(root, 'data/runtime/gemini-usage.json'), now = Date.now } = {}) {
        this.config = config;
        this.stateFile = stateFile;
        this.now = now;
        this.state = null;
    }

    settings(model) {
        let config;
        try { config = this.config(); }
        catch { throw budgetError('Cannot read config/gemini-rate-limits.json. No Gemini request was sent.'); }
        const factor = config.safetyFactor;
        const limits = config.models?.[model];
        if (!(factor > 0 && factor <= 1) || !limits ||
            !['rpm', 'tpm', 'rpd'].every(key => Number.isSafeInteger(limits[key]) && limits[key] >= 0 || limits[key] === 'unlimited')) {
            throw budgetError(`Configure verified RPM, TPM and RPD for ${model} in config/gemini-rate-limits.json. Unknown limits are not used.`);
        }
        const group = limits.quotaGroup || model;
        if (typeof group !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(group)) throw budgetError('Invalid quota group configuration.');
        // Models explicitly sharing a provider quota must also share configured limits.
        for (const [otherModel, other] of Object.entries(config.models)) {
            if ((other.quotaGroup || otherModel) === group && ['rpm', 'tpm', 'rpd'].some(key => other[key] !== limits[key])) {
                throw budgetError('Models in the same quotaGroup must have identical RPM, TPM and RPD limits.');
            }
        }
        const initial = config.initialDailyUsage;
        const baseline = initial?.date === quotaDay(this.now()) ? (initial.requests?.[group] ?? 0) : 0;
        if (!Number.isSafeInteger(baseline) || baseline < 0) throw budgetError('Invalid initial daily usage.');
        return { group, baseline, ...Object.fromEntries(['rpm', 'tpm', 'rpd'].map(key => [key,
            limits[key] === 'unlimited' ? Number.MAX_SAFE_INTEGER : Math.floor(limits[key] * factor)])) };
    }

    load() {
        if (this.state) return;
        try {
            const state = this.stateFile && fs.existsSync(this.stateFile)
                ? JSON.parse(fs.readFileSync(this.stateFile, 'utf8')) : { version: 1, buckets: {} };
            if (state.version !== 1 || !state.buckets || typeof state.buckets !== 'object' || Array.isArray(state.buckets)) throw new Error();
            for (const bucket of Object.values(state.buckets)) {
                if (typeof bucket.day !== 'string' || !Number.isSafeInteger(bucket.daily) || bucket.daily < 0 ||
                    !Number.isFinite(bucket.blockedUntil) || !Array.isArray(bucket.events) ||
                    !bucket.events.every(event => Number.isFinite(event.at) && Number.isSafeInteger(event.requests) && event.requests >= 0 &&
                        Number.isSafeInteger(event.tokens) && event.tokens >= 0)) throw new Error();
            }
            this.state = state;
        } catch { throw budgetError('Saved Gemini usage could not be read. Restore the usage file before retrying; counters were not reset.'); }
    }

    save() {
        if (!this.stateFile) return;
        try {
            fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
            fs.writeFileSync(`${this.stateFile}.tmp`, JSON.stringify(this.state));
            fs.renameSync(`${this.stateFile}.tmp`, this.stateFile);
        } catch { throw budgetError('Cannot save Gemini usage. No further request will be sent until usage storage is writable.'); }
    }

    bucket(group, baseline = 0) {
        this.load();
        const now = this.now(), day = quotaDay(now);
        if (!Object.hasOwn(this.state.buckets, group)) {
            Object.defineProperty(this.state.buckets, group, {
                value: { day, daily: baseline, events: [], blockedUntil: 0 }, enumerable: true, writable: true
            });
        }
        const bucket = this.state.buckets[group];
        if (bucket.day !== day) { bucket.day = day; bucket.daily = 0; }
        bucket.events = bucket.events.filter(event => event.at > now - minute);
        return bucket;
    }

    check(model, { requests = 1, tokens = 0 } = {}) {
        if (!Number.isSafeInteger(requests) || requests < 0 || !Number.isSafeInteger(tokens) || tokens < 0) throw budgetError('Invalid token or request reservation.');
        const limits = this.settings(model), bucket = this.bucket(limits.group, limits.baseline);
        const rpm = bucket.events.reduce((sum, event) => sum + event.requests, 0);
        const tpm = bucket.events.reduce((sum, event) => sum + event.tokens, 0);
        if (this.now() < bucket.blockedUntil) throw budgetError(`${model} is cooling down after a provider rate-limit response. Retry later.`);
        if (bucket.daily + requests > limits.rpd) throw budgetError(`${model} reached its reserved daily budget. Retry after midnight Pacific time.`);
        if (rpm + requests > limits.rpm) throw budgetError(`${model} is near its RPM limit. Retry after the minute window clears.`);
        if (tpm + tokens > limits.tpm) throw budgetError(`${model} cannot fit this request within its TPM budget. Retry later or review the document size.`);
        return { bucket, group: limits.group };
    }

    reserve(model, { requests = 1, tokens = 0 } = {}) {
        const { bucket, group } = this.check(model, { requests, tokens });
        const event = { at: this.now(), requests, tokens };
        bucket.daily += requests;
        bucket.events.push(event);
        this.save();
        return { group, event };
    }

    reconcile(reservation, promptTokens) {
        if (Number.isSafeInteger(promptTokens) && promptTokens > reservation.event.tokens) {
            // Never refund estimates or failed calls: actual usage is not always reported.
            reservation.event.tokens = promptTokens;
            this.save();
        }
    }

    cooldown(model) {
        const bucket = this.bucket(this.settings(model).group);
        // A 429 can reflect usage outside this service. Do not immediately hammer it again.
        bucket.blockedUntil = this.now() + minute;
        this.save();
    }
}

export const geminiBudget = new GeminiBudget();
