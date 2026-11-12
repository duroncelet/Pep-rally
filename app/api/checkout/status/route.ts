import {checkoutReadiness} from '../../../commerce';
import {findConcept} from '../../../catalog';
import {getChatGPTUser} from '../../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get('slug')||'';
 if(!findConcept(slug))return Response.json({enabled:false},{status:404});
 const user=await getChatGPTUser();
 const state=checkoutReadiness(process.env,user?.userId||'',slug);
 return Response.json(state,{headers:{'Cache-Control':'no-store'}});
}
