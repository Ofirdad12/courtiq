import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);

  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey) return json({error:"Pilot activation is not configured."},500);
  const admin=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});

  let inviteId:string|null=null;
  try{
    const body=await req.json();
    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    const code=String(body.invite_code||"").trim();

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Enter a valid email address."},422);
    if(password.length<10) return json({error:"Password must contain at least 10 characters."},422);
    if(!/^[0-9a-f-]{36}$/i.test(code)) return json({error:"Invalid pilot invitation."},403);

    const {data:invite,error:inviteErr}=await admin.from("pilot_invites")
      .update({status:"processing"})
      .eq("invite_code",code).eq("status","pending")
      .select("id,club_id,invitee_name,role").maybeSingle();
    if(inviteErr) throw inviteErr;
    if(!invite) return json({error:"This pilot invitation is invalid or has already been used."},403);
    inviteId=invite.id;

    const {data:created,error:createErr}=await admin.auth.admin.createUser({
      email,password,email_confirm:true,
      user_metadata:{full_name:invite.invitee_name,pilot:true}
    });
    if(createErr||!created.user){
      await admin.from("pilot_invites").update({status:"pending"}).eq("id",invite.id).eq("status","processing");
      if(createErr?.message?.toLowerCase().includes("already")) return json({error:"An account already exists for this email. Sign in instead."},409);
      throw createErr||new Error("Could not create pilot user.");
    }

    const userId=created.user.id;
    const {error:memberErr}=await admin.from("club_members").insert({
      club_id:invite.club_id,user_id:userId,role:invite.role
    });
    if(memberErr){
      await admin.auth.admin.deleteUser(userId);
      await admin.from("pilot_invites").update({status:"pending"}).eq("id",invite.id).eq("status","processing");
      throw memberErr;
    }

    const {error:claimErr}=await admin.from("pilot_invites").update({
      status:"claimed",claimed_by:userId,claimed_at:new Date().toISOString()
    }).eq("id",invite.id).eq("status","processing");
    if(claimErr) throw claimErr;

    return json({
      created:true,
      invitee_name:invite.invitee_name,
      role:invite.role,
      message:"Pilot account created. Sign in with your email and password."
    });
  }catch(e){
    if(inviteId) await admin.from("pilot_invites").update({status:"pending"}).eq("id",inviteId).eq("status","processing");
    return json({error:e instanceof Error?e.message:String(e)},422);
  }
});
