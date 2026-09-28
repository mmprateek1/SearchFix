import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
const context = new AsyncLocalStorage();
const requests = new WeakMap();
export const currentTraceId = () => context.getStore()?.id;
// Multipart stream callbacks can lose the initial middleware async context.
// Restore the original ID, rather than creating a second request identity.
export function withRequestTrace(req, work) {
  const saved = requests.get(req);
  return saved ? context.run(saved, work) : work();
}
const allowed = new Set(['stage','model','attempt','count','bytes','characters','status','httpStatus','durationMs','issueType','required','missing','source','code','client']);
export function trace(event, details = {}) {
  const safe = Object.fromEntries(Object.entries(details).filter(([key])=>allowed.has(key)));
  console.info(JSON.stringify({time:new Date().toISOString(),requestId:context.getStore()?.id || 'local',event,...safe}));
}
export function requestTrace(req, res, next) {
  const id = randomUUID(), started = Date.now();
  requests.set(req, {id});
  res.set('X-SearchFix-Request-Id',id);
  context.run({id},()=>{
    trace('request.start',{stage:req.path.split('/').pop()});
    res.on('finish',()=>context.run({id},()=>trace('request.complete',{httpStatus:res.statusCode,durationMs:Date.now()-started})));
    next();
  });
}
