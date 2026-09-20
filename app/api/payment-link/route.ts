import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request:Request) {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Sign in required",signIn:chatGPTSignInPath("/rally/bachelorette")},{status:401});
  const secret=process.env.STRIPE_SECRET_KEY;
  if(!secret) return Response.json({error:"Stripe is ready to connect, but the private merchant key has not been added yet.",needsCredential:true},{status:503});
  const body=await request.json() as {amount?:number;title?:string};
  const amount=Math.max(100,Math.round(Number(body.amount||0)*100));
  const params=new URLSearchParams();
  params.set("line_items[0][price_data][currency]","usd");
  params.set("line_items[0][price_data][unit_amount]",String(amount));
  params.set("line_items[0][price_data][product_data][name]",body.title?.trim()||"Pep Rally group share");
  params.set("line_items[0][quantity]","1");
  const response=await fetch("https://api.stripe.com/v1/payment_links",{method:"POST",headers:{authorization:`Bearer ${secret}`,"content-type":"application/x-www-form-urlencoded"},body:params});
  const data=await response.json() as {url?:string;error?:{message?:string}};
  if(!response.ok||!data.url) return Response.json({error:data.error?.message||"Stripe could not create the payment link"},{status:502});
  return Response.json({url:data.url});
}
