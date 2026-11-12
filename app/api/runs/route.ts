import { and, eq, desc } from 'drizzle-orm';
import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { plannerRuns } from '../../../db/schema';
import { createDraft, reviseDraft, artifactMarkdown } from '../../agentic/session';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,message:string)=>Response.json({error:message},{status,headers});
function view(row: typeof plannerRuns.$inferSelect) {
  return {session_id:row.id,version:row.version,status:'delivered',answers:JSON.parse(row.answers),artifact:JSON.parse(row.artifact),revision_count:row.revisionCount,max_revisions:3,spend_cents:0,generation_kind:'template'};
}
export async function GET(request:Request) {
  try {
    const user=await getChatGPTUser(); if(!user) return fail(401,'Sign in to save and reopen your plan.');
    const url=new URL(request.url); const id=url.searchParams.get('id');
    const [row]=await getDb().select().from(plannerRuns).where(and(eq(plannerRuns.ownerId,user.userId),id?eq(plannerRuns.id,id):undefined)).orderBy(desc(plannerRuns.updatedAt)).limit(1);
    if(!row) return fail(404,'No saved generated plan yet.');
    if(url.searchParams.get('format')==='markdown') return new Response(artifactMarkdown(JSON.parse(row.artifact)),{headers:{...headers,'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename="weekend-draft.md"'}});
    return Response.json(view(row),{headers});
  } catch { return fail(503,'Saved plans are temporarily unavailable. Your open workspace is unchanged.'); }
}
export async function POST(request:Request) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin) return fail(403,'Open Pep Rally to update your plan.');
    const user=await getChatGPTUser(); if(!user) return fail(401,'Sign in to save your plan.');
    const raw=await request.text(); if(raw.length>12000) return fail(413,'Your request is too large.');
    let body; try { body=JSON.parse(raw); } catch { return fail(400,'Send valid trip details.'); }
    if(!body || typeof body!=='object') return fail(400,'Send valid trip details.');
    const db=getDb(); const now=Date.now();
    if(body.action==='revise') {
      if(typeof body.id!=='string' || !Number.isInteger(body.version)) return fail(400,'Choose a saved plan and its current version.');
      const [row]=await db.select().from(plannerRuns).where(and(eq(plannerRuns.id,body.id),eq(plannerRuns.ownerId,user.userId))).limit(1);
      if(!row) return fail(404,'Plan not found.');
      if(row.version!==body.version) return fail(409,'This plan changed. Reopen it before revising.');
      if(row.revisionCount>=3) return fail(409,'This plan includes three revisions. You can still edit the workspace manually.');
      let artifact; try { artifact=reviseDraft(JSON.parse(row.artifact),JSON.parse(row.answers),body.feedback,row.revisionCount); } catch(e) { return fail(422,(e as Error).message); }
      const [updated]=await db.update(plannerRuns).set({artifact:JSON.stringify(artifact),version:row.version+1,revisionCount:row.revisionCount+1,updatedAt:now}).where(and(eq(plannerRuns.id,row.id),eq(plannerRuns.ownerId,user.userId),eq(plannerRuns.version,row.version))).returning();
      return updated?Response.json(view(updated),{headers}):fail(409,'This plan changed. Reopen it before revising.');
    }
    if(body.action!=='create') return fail(400,'Choose create or revise.');
    const key=request.headers.get('Idempotency-Key');
    if(!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) return fail(400,'A request identifier is required.');
    let draft; try { draft=createDraft(body.answers); } catch(e) { return fail(422,(e as Error).message); }
    const answers=JSON.stringify(draft.answers);
    await db.insert(plannerRuns).values({id:crypto.randomUUID(),ownerId:user.userId,requestId:key,answers,artifact:JSON.stringify(draft.artifact),createdAt:now,updatedAt:now}).onConflictDoNothing();
    const [row]=await db.select().from(plannerRuns).where(and(eq(plannerRuns.ownerId,user.userId),eq(plannerRuns.requestId,key))).limit(1);
    if(!row || row.answers!==answers) return fail(409,'This request identifier was already used for different trip details.');
    return Response.json(view(row),{status:201,headers});
  } catch { return fail(503,'We could not save this draft. Your answers are still on this page; please retry.'); }
}
