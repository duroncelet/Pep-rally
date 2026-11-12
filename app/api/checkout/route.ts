import {getChatGPTUser,chatGPTSignInPath} from "../../chatgpt-auth";
import {getDb} from "../../../db";
import {eq,and,inArray,like} from "drizzle-orm";
import {purchases} from "../../../db/schema";
import {createCheckoutSession} from "../../stripe";
import {findConcept} from "../../catalog";
import {checkoutReadiness,checkoutOrderId} from "../../commerce";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Open checkout from Pep Rally."},{status:403});
 const raw=await request.text();if(raw.length>2000)return Response.json({error:"Request too large."},{status:413});
 let body;try{body=JSON.parse(raw);}catch{return Response.json({error:"Choose a Rally."},{status:400});}
 // Originals remain free; third-party commerce requires a separate Connect/access implementation.
 const concept=typeof body?.conceptSlug==="string"?findConcept(body.conceptSlug):undefined;
 if(!concept||body.creatorAppId)return Response.json({error:"This Rally is not available for purchase."},{status:404});
 const returnPath="/discover/"+concept.slug;
 const user=await getChatGPTUser();
 if(!user)return Response.json({error:"Sign in to keep your purchase.",signIn:chatGPTSignInPath(returnPath)},{status:401});
 const readiness=checkoutReadiness(process.env,user.userId,concept.slug);
 if(!readiness.enabled)return Response.json({error:"Paid access is not on sale yet. Try the free preview.",code:"checkout_unavailable"},{status:503});
 let purchaseId;try{purchaseId=await checkoutOrderId(user.userId,request.headers.get("Idempotency-Key")||"");}catch{return Response.json({error:"A request identifier is required."},{status:400});}
 const db=getDb(),now=new Date(),toolSlug="catalog:"+concept.slug,origin=new URL(request.url).origin;
 const [owned]=await db.select().from(purchases).where(and(eq(purchases.buyerUserId,user.userId),eq(purchases.toolSlug,toolSlug),eq(purchases.status,"paid_and_unlocked"),like(purchases.stripeSessionId,process.env.PEP_RALLY_COMMERCE_MODE==="test"?"cs_test_%":"cs_live_%"))).limit(1);
 if(owned)return Response.json({url:"/rally/market/"+concept.slug,alreadyOwned:true});
 await db.insert(purchases).values({id:purchaseId,buyerUserId:user.userId,toolSlug,title:concept.title,amountCents:concept.priceCents,platformFeeCents:concept.priceCents,creatorEarningsCents:0,status:"creating_checkout",createdAt:now}).onConflictDoNothing();
 const [order]=await db.select().from(purchases).where(eq(purchases.id,purchaseId)).limit(1);
 if(!order||order.toolSlug!==toolSlug||order.amountCents!==concept.priceCents)return Response.json({error:"This request identifier belongs to another checkout."},{status:409});
 if(Date.now()-order.createdAt.getTime()>23*3600000||!["creating_checkout","checkout_open","checkout_failed"].includes(order.status))return Response.json({error:"Start a new checkout from the listing."},{status:409});
 try{
  const session=await createCheckoutSession(process.env.STRIPE_SECRET_KEY!,{purchaseId,buyerUserId:user.userId,buyerEmail:user.email,title:order.title,description:concept.promise,amountCents:order.amountCents,toolSlug,successUrl:origin+"/purchase/success?session_id={CHECKOUT_SESSION_ID}",cancelUrl:origin+returnPath+"?checkout=cancelled"});
  await db.update(purchases).set({stripeSessionId:session.id,status:"checkout_open"}).where(and(eq(purchases.id,purchaseId),inArray(purchases.status,["creating_checkout","checkout_open","checkout_failed"])));
  return Response.json({purchaseId,url:session.url,mode:readiness.mode},{status:201});
 }catch{
  await db.update(purchases).set({status:"checkout_failed"}).where(and(eq(purchases.id,purchaseId),eq(purchases.status,"creating_checkout")));
  return Response.json({error:"Checkout could not be opened. Please retry with the same request."},{status:502});
 }
}
