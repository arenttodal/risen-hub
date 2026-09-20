import { getRawDb } from '@/db';
const limits:Record<string,number>={farmhouse:8,barn:12};
export async function GET(){try{const db=getRawDb();const {results}=await db.prepare('SELECT camp, COUNT(*) AS count FROM rsvps GROUP BY camp').all();return Response.json(Object.fromEntries(results.map((r:any)=>[r.camp,r.count])));}catch{return Response.json({error:'Availability is temporarily unavailable.'},{status:503});}}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Please submit from this website.'},{status:403});
 try{const data=await request.json() as Record<string,unknown>;const camp=String(data.camp||'');const name=String(data.name||'').trim();const email=String(data.email||'').trim().toLowerCase();if(!limits[camp]||!name||name.length>100||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:'Please enter a valid name and email.'},{status:400});
 const db=getRawDb();
 const result=await db.prepare('INSERT OR IGNORE INTO rsvps (id,camp,name,email,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM rsvps WHERE camp=?) < ?').bind(crypto.randomUUID(),camp,name,email,new Date().toISOString(),camp,limits[camp]).run();
 if(!result.meta.changes){const exists=await db.prepare('SELECT id FROM rsvps WHERE camp=? AND email=?').bind(camp,email).first();return Response.json({error:exists?'You already have a preview RSVP for this weekend.':'This weekend is full.'},{status:409});}
 const count=await db.prepare('SELECT COUNT(*) AS count FROM rsvps WHERE camp=?').bind(camp).first();return Response.json({count:count?.count},{status:201});
 }catch{return Response.json({error:'Could not save your RSVP. Please try again.'},{status:503});}
}
