import { encode } from "@auth/core/jwt";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/)
  .filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const authDb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false},db:{schema:"next_auth"}});
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const email="pwa@example.test";
let {data:u}=await authDb.from("users").select("id").eq("email",email).maybeSingle();
if(!u){const id=randomUUID();await authDb.from("users").insert({id,email,name:"PWA検証"});u={id};}
const {data:pr}=await db.from("profiles").select("id").eq("auth_user_id",u.id).maybeSingle();
if(!pr) await db.from("profiles").insert({auth_user_id:u.id,display_name:"PWA検証"});
for (const salt of ["authjs.session-token","__Secure-authjs.session-token"]) {
  const t = await encode({token:{uid:u.id,role:"user",name:"PWA検証",email,sub:u.id},secret:env.AUTH_SECRET,salt,maxAge:3600});
  const res = await fetch("http://localhost:3000/prompts",{headers:{cookie:`${salt}=${t}`},redirect:"manual"});
  console.log(`${salt.padEnd(32)} → HTTP ${res.status} ${res.headers.get("location")??""}`);
}
console.log("userId:", u.id);
