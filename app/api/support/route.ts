import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Open support from Pep Rally.'},{status:403});
 const user=await getChatGPTUser();
 if(!user)return Response.json({error:'Sign in to send your request.',signIn:chatGPTSignInPath('/support')},{status:401});
 const raw=await request.text();if(raw.length>10000)return Response.json({error:'Keep your request under 4,000 characters.'},{status:413});
 let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'Check your request.'},{status:400});}
 if(typeof body.message!=='string'||body.message.trim().length<12||body.message.length>4000)return Response.json({error:'Describe the problem in 12–4,000 characters.'},{status:422});
 if(!env.RALLY_UPLOADS)return Response.json({error:'Support storage is unavailable. Please retry later.'},{status:503});
 const prefix=`support/${user.userId}/${new Date().toISOString().slice(0,10)}/`;
 const existing=await env.RALLY_UPLOADS.list({prefix,limit:10});
 if(existing.objects.length>=10)return Response.json({error:'You have sent several requests today. Please try again tomorrow.'},{status:429,headers:{'Retry-After':'86400'}});
 const id=crypto.randomUUID();
 await env.RALLY_UPLOADS.put(prefix+id+'.json',JSON.stringify({id,owner:user.userId,email:user.email,rally:String(body.rally||'').slice(0,200),message:body.message.trim(),status:'received',createdAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}});
 return Response.json({id,status:'received'},{status:201});
}
