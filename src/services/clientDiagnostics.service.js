import { z } from 'zod';
import { trace } from './trace.service.js';

const label=z.string().max(100);
const fields=z.object({step:label,tabId:z.number(),orderNumber:label,kind:label,count:z.number(),fileType:label,
  bytes:z.number(),characters:z.number(),status:label,httpStatus:z.number(),requestId:label,durationMs:z.number(),errorCode:label,
  attempt:z.number(),required:z.array(label).max(20),selected:z.array(label).max(100),missing:z.array(label).max(20)}).partial();
const diagnostics=z.object({events:z.array(z.object({time:z.string().datetime(),event:z.string().regex(/^[a-z.]{1,60}$/),details:fields})).max(1500)});

export function receiveClientDiagnostics(req,res) {
  const parsed=diagnostics.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid activity-log metadata.'});
  for(const entry of parsed.data.events) trace('extension.activity',{source:entry.time,stage:entry.event,client:entry.details});
  return res.json({received:parsed.data.events.length});
}
