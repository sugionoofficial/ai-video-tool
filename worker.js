const PROVIDER_ALIASES = { gemini: "veo", veo: "veo", minimax: "minimax", luma: "luma" };
const ADAPTERS = {
  veo: { name: "Gemini / Veo", models: ["veo-3.1-fast-generate-preview","veo-3.1-generate-preview","veo-3.1-lite-generate-preview"], durations: [4,6,8], aspects: ["16:9","9:16"], resolutions: ["720p","1080p","4k"] },
  minimax: { name: "MiniMax", models: ["MiniMax-Hailuo-2.3","MiniMax-Hailuo-2.3-Fast","MiniMax-Hailuo-02"], durations: [6,10], aspects: ["16:9","9:16"], resolutions: ["512P","768P","1080P"] },
  luma: { name: "Luma", models: ["ray-2","ray-flash-2"], durations: ["5s","9s"], aspects: ["1:1","16:9","9:16","4:3","3:4","21:9","9:21"], resolutions: ["720p","1080p","4k"] }
};

function canonicalProvider(value) {
  const id = String(value || "").trim().toLowerCase();
  return PROVIDER_ALIASES[id] || id;
}
function providerId(value) { const id=String(value||"").trim().toLowerCase(); if(!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) throw new HttpError("ID provider tidak valid.",400); if(PROVIDER_ALIASES[id]&&id!==PROVIDER_ALIASES[id]) throw new HttpError("ID provider reserved. Gunakan ID selain gemini.",400); return id; }
function adapterInfo(adapter) { return ADAPTERS[String(adapter||"").toLowerCase()] || null; }

function corsHeaders(env) {
  const origin = String(env.ALLOWED_ORIGIN || "*").trim();
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data, status=200, env={}) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { ...corsHeaders(env), "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" }});
}
async function safeJson(res) { const text=await res.text(); if(!text) return {}; try{return JSON.parse(text)}catch{return {raw:text}} }
function apiError(data, fallback) { return typeof data?.error === "string" ? data.error : data?.error?.message || data?.message || data?.raw || fallback; }

function sbHeaders(env) { return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type":"application/json" }; }
async function sb(path, options={}, env) { return fetch(`${env.SUPABASE_URL}${path}`, {...options, headers:{...sbHeaders(env), ...(options.headers||{})}}); }
async function currentUser(request, env) {
  const auth=request.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer ")) return null;
  const token=auth.slice(7).trim(); if(!token) return null;
  const res=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${token}`}});
  return res.ok ? await res.json() : null;
}
async function requireUser(request, env) { const user=await currentUser(request,env); if(!user?.id) throw new HttpError("Unauthorized",401); return user; }
async function requireAdmin(request, env) {
  const user=await requireUser(request,env);
  const res=await sb(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=user_id`,{},env);
  if(!res.ok) throw new HttpError("Gagal memeriksa role admin.",500);
  const rows=await res.json(); if(!rows.length) throw new HttpError("Akses admin ditolak.",403); return user;
}
class HttpError extends Error { constructor(message,status){super(message);this.status=status} }

async function getProvider(provider, env, requireEnabled=true) {
  const id=canonicalProvider(provider);
  const res=await sb(`/rest/v1/providers?id=eq.${encodeURIComponent(id)}&select=id,name,adapter,api_key,enabled,config`,{},env);
  if(!res.ok) throw new HttpError("Gagal mengambil konfigurasi provider.",500);
  const row=(await res.json())?.[0];
  if(!row) throw new HttpError("Provider tidak ditemukan.",404);
  if(requireEnabled && !row.enabled) throw new HttpError("Provider sedang nonaktif.",409);
  if(!adapterInfo(row.adapter)) throw new HttpError(`Adapter provider ${id} belum didukung Worker.`,400);
  if(!row.api_key) throw new HttpError(`API key ${id} belum dikonfigurasi admin.`,400);
  return row;
}
async function providerConfigured(provider,env){try{const p=await getProvider(provider,env,false);return Boolean(p.api_key&&p.enabled&&adapterInfo(p.adapter))}catch{return false}}
function publicProvider(p){const a=adapterInfo(p.adapter);return {id:p.id,name:p.name||a?.name||p.id,adapter:p.adapter,enabled:Boolean(p.enabled),configured:Boolean(p.api_key),capabilities:a||{}}}

function parseDataUrl(value,maxBytes=12*1024*1024) {
  if(typeof value!=="string") return null;
  const m=value.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/s); if(!m)return null;
  const base64=m[2].replace(/\s/g,""); if(base64.length*0.75>maxBytes) return null; return {mimeType:m[1],base64};
}
function normalizeDuration(v, allowed, fallback){const n=Number(v||fallback); return allowed.includes(n)?n:null}

async function reserveJob(userId, provider, cost, env) {
  const res=await sb('/rest/v1/rpc/start_video_job',{method:'POST',body:JSON.stringify({p_user_id:userId,p_provider:provider,p_credit_cost:cost})},env);
  const data=await safeJson(res); if(!res.ok) throw new HttpError(apiError(data,"Credit tidak mencukupi."),402); return data;
}
async function updateJob(jobId, patch, env){await sb(`/rest/v1/video_jobs?id=eq.${encodeURIComponent(jobId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})},env)}
async function refundJob(jobId, env){const res=await sb('/rest/v1/rpc/refund_video_job',{method:'POST',body:JSON.stringify({p_job_id:jobId})},env); return res.ok}
async function getJob(userId, provider, externalId, env){
  const q=`/rest/v1/video_jobs?user_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}&external_id=eq.${encodeURIComponent(externalId)}&select=*`;
  const res=await sb(q,{},env); if(!res.ok) throw new HttpError("Gagal membaca job video.",500); const rows=await res.json(); return rows?.[0]||null;
}

async function generateVeo(body, provider, env) {
  const key=String(provider.api_key).trim();
  const model=String(body.model||"veo-3.1-fast-generate-preview");
  const allowed=["veo-3.1-fast-generate-preview","veo-3.1-generate-preview","veo-3.1-lite-generate-preview"];
  if(!allowed.includes(model)) throw new HttpError("Model Veo tidak valid.",400);
  const duration=normalizeDuration(body.duration,[4,6,8],8); if(!duration) throw new HttpError("Durasi Veo harus 4, 6, atau 8 detik.",400);
  const aspect=String(body.aspectRatio||"16:9"); if(!["16:9","9:16"].includes(aspect)) throw new HttpError("Aspect ratio Veo tidak valid.",400);
  const resolution=String(body.resolution||"720p"); if(!["720p","1080p","4k"].includes(resolution)) throw new HttpError("Resolusi Veo tidak valid.",400);
  if((resolution!=="720p"||body.imageData)&&duration!==8) throw new HttpError("1080p/4K atau image-to-video Veo membutuhkan 8 detik.",400);
  if(model.endsWith("lite-generate-preview")&&resolution==="4k") throw new HttpError("Veo Lite tidak mendukung 4K.",400);
  const instances=[{prompt:String(body.prompt).trim()}];
  if(body.imageData){const img=parseDataUrl(body.imageData); if(!img) throw new HttpError("Character reference tidak valid atau terlalu besar.",400); instances[0].image={inlineData:{mimeType:img.mimeType,data:img.base64}}}
  const parameters={aspectRatio:aspect,resolution};
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({instances,parameters})});
  const data=await safeJson(res); if(!res.ok) throw new HttpError(apiError(data,`Veo error (${res.status}).`),res.status);
  const operationName=data?.name||data?.operationName; if(!operationName) throw new HttpError("Veo tidak mengembalikan operation name.",502);
  return {externalId:operationName,provider:'veo',status:'processing',model,duration,aspectRatio:aspect,resolution};
}
async function generateMiniMax(body, provider, env) {
  const key=String(provider.api_key).trim(); const model=String(body.model||'MiniMax-Hailuo-2.3');
  const allowed=['MiniMax-Hailuo-2.3','MiniMax-Hailuo-2.3-Fast','MiniMax-Hailuo-02']; if(!allowed.includes(model)) throw new HttpError('Model MiniMax tidak valid.',400);
  let duration=normalizeDuration(body.duration,[6,10],6); if(!duration) throw new HttpError('Durasi MiniMax harus 6 atau 10 detik.',400);
  let resolution=String(body.resolution||'768P'); if(!['512P','768P','1080P'].includes(resolution)) throw new HttpError('Resolusi MiniMax tidak valid.',400);
  if(resolution==='1080P'&&duration!==6) duration=6;
  if(model!=='MiniMax-Hailuo-02'&&resolution==='512P') throw new HttpError('512P hanya tersedia untuk Hailuo 02.',400);
  if(model==='MiniMax-Hailuo-2.3-Fast'&&body.imageData==null) throw new HttpError('Hailuo 2.3 Fast memerlukan image reference.',400);
  const payload={model,prompt:String(body.prompt).trim(),duration,resolution,prompt_optimizer:true};
  if(body.imageData){const img=parseDataUrl(body.imageData); if(!img) throw new HttpError('Character reference tidak valid atau terlalu besar.',400); payload.first_frame_image=`data:${img.mimeType};base64,${img.base64}`}
  const res=await fetch('https://api.minimax.io/v1/video_generation',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await safeJson(res); if(!res.ok) throw new HttpError(apiError(data,`MiniMax error (${res.status}).`),res.status);
  const taskId=data?.task_id||data?.taskId; if(!taskId) throw new HttpError('MiniMax tidak mengembalikan task ID.',502);
  return {externalId:String(taskId),provider:'minimax',status:'processing',model,duration,resolution};
}
async function generateLuma(body, provider, env) {
  const key=String(provider.api_key).trim(); const model=String(body.model||'ray-2'); if(!['ray-2','ray-flash-2'].includes(model)) throw new HttpError('Model Luma tidak valid.',400);
  const aspect=String(body.aspectRatio||'16:9'); const aspects=['1:1','16:9','9:16','4:3','3:4','21:9','9:21']; if(!aspects.includes(aspect)) throw new HttpError('Aspect ratio Luma tidak valid.',400);
  const duration=String(body.duration||'5s'); if(!['5s','9s'].includes(duration)) throw new HttpError('Durasi Luma harus 5s atau 9s.',400);
  const payload={model,prompt:String(body.prompt).trim(),aspect_ratio:aspect,duration};
  // Luma requires a public image URL for image-to-video. This build intentionally keeps local images on Veo/MiniMax.
  if(body.imageData) throw new HttpError('Character reference Luma memerlukan public image URL; gunakan Veo atau MiniMax untuk gambar lokal.',400);
  const res=await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await safeJson(res); if(!res.ok) throw new HttpError(apiError(data,`Luma error (${res.status}).`),res.status);
  const id=data?.id; if(!id) throw new HttpError('Luma tidak mengembalikan generation ID.',502);
  return {externalId:String(id),provider:'luma',status:'processing',model,duration,aspectRatio:aspect};
}

async function handleGenerate(request,env){
  const user=await requireUser(request,env); let body; try{body=await request.json()}catch{throw new HttpError('JSON tidak valid.',400)}
  const id=canonicalProvider(body?.provider); const provider=await getProvider(id,env,true);
  const prompt=String(body?.prompt||'').trim(); if(prompt.length<3||prompt.length>2000) throw new HttpError('Prompt harus 3-2000 karakter.',400);
  const cost=Math.max(1,Number(env.GENERATION_CREDIT_COST||1));
  const reservation=await reserveJob(user.id,id,cost,env); const jobId=reservation?.job_id||reservation?.id; if(!jobId) throw new HttpError('Gagal membuat job credit.',500);
  try{
    const adapter=String(provider.adapter).toLowerCase();
    const result=adapter==='veo'?await generateVeo(body,provider,env):adapter==='minimax'?await generateMiniMax(body,provider,env):adapter==='luma'?await generateLuma(body,provider,env):null;
    if(!result) throw new HttpError('Adapter provider belum didukung.',400);
    result.provider=id;
    await updateJob(jobId,{external_id:result.externalId,status:'processing',model:result.model||null,metadata:{...result,adapter}},env);
    return json({success:true,jobId,...result,creditsRemaining:reservation.credits_remaining},200,env);
  }catch(err){await refundJob(jobId,env); throw err}
}
async function statusVeo(operationName,key){const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName.replace(/^\//,'')}`,{headers:{'x-goog-api-key':key}}); const data=await safeJson(res); if(!res.ok) throw new HttpError(apiError(data,`Veo status error (${res.status}).`),res.status); if(!data.done)return {success:true,status:'processing',provider:'veo'}; if(data.error)throw new HttpError(apiError(data,'Veo generation gagal.'),500); const uri=data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri||data?.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri; if(!uri)throw new HttpError('Veo selesai tetapi URL video tidak ditemukan.',502); return {success:true,status:'completed',provider:'veo',videoUrl:uri};}
async function statusMiniMax(taskId,key){const res=await fetch(`https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,{headers:{Authorization:`Bearer ${key}`}});const data=await safeJson(res);if(!res.ok)throw new HttpError(apiError(data,`MiniMax status error (${res.status}).`),res.status);const st=String(data?.status||data?.task_status||'').toLowerCase();if(['failed','failure','error'].includes(st))throw new HttpError(apiError(data,'MiniMax generation gagal.'),500);if(['success','succeeded','completed','finished'].includes(st)){const fileId=data?.file_id||data?.file?.file_id;if(fileId)return {success:true,status:'completed',provider:'minimax',videoUrl:`/api/video?provider=minimax&fileId=${encodeURIComponent(fileId)}`};const u=data?.file?.download_url||data?.download_url||data?.video_url;if(u)return {success:true,status:'completed',provider:'minimax',videoUrl:u};}return {success:true,status:'processing',provider:'minimax'};}
async function statusLuma(id,key){const res=await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`}});const data=await safeJson(res);if(!res.ok)throw new HttpError(apiError(data,`Luma status error (${res.status}).`),res.status);const st=String(data?.state||data?.status||'').toLowerCase();if(['failed','failure','error'].includes(st))throw new HttpError(data?.failure_reason||'Luma generation gagal.',500);const u=data?.assets?.video||data?.video?.url||data?.video_url;if(u)return {success:true,status:'completed',provider:'luma',videoUrl:u};return {success:true,status:'processing',provider:'luma'};}
async function handleStatus(request,env){const user=await requireUser(request,env);let body;try{body=await request.json()}catch{throw new HttpError('JSON status tidak valid.',400)}const id=canonicalProvider(body?.provider);if(!id)throw new HttpError('Provider wajib diberikan.',400);const externalId=String(body?.operationName||body?.taskId||body?.id||'').trim();if(!externalId)throw new HttpError('ID proses video wajib diberikan.',400);const job=await getJob(user.id,id,externalId,env);if(!job)throw new HttpError('Job tidak ditemukan.',404);try{const provider=await getProvider(id,env,false);const key=String(provider.api_key).trim();const adapter=String(provider.adapter).toLowerCase();const result=adapter==='veo'?await statusVeo(externalId,key):adapter==='minimax'?await statusMiniMax(externalId,key):adapter==='luma'?await statusLuma(externalId,key):null;if(!result)throw new HttpError('Adapter provider belum didukung.',400);result.provider=id;if(result.status==='completed'){await updateJob(job.id,{status:'completed',video_url:result.videoUrl},env)}return json({jobId:job.id,...result},200,env)}catch(err){if(err instanceof HttpError&&err.status>=500){await updateJob(job.id,{status:'failed'},env);await refundJob(job.id,env)}throw err}}
async function handleVideo(request,env){const user=await requireUser(request,env);const url=new URL(request.url);const id=canonicalProvider(url.searchParams.get('provider'));const provider=await getProvider(id,env,false);const adapter=String(provider.adapter).toLowerCase();const fileId=url.searchParams.get('fileId');const target=url.searchParams.get('url');const key=String(provider.api_key).trim();let response;
  if(adapter==='minimax'&&fileId){response=await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,{headers:{Authorization:`Bearer ${key}`}});const data=await safeJson(response);if(!response.ok)throw new HttpError(apiError(data,'Gagal mengambil file MiniMax.'),response.status);const downloadUrl=data?.file?.download_url;if(!downloadUrl)throw new HttpError('URL download MiniMax tidak tersedia.',502);const u=new URL(downloadUrl);if(u.protocol!=='https:')throw new HttpError('URL download tidak aman.',403);response=await fetch(u.toString());}
  else if((adapter==='veo'||adapter==='luma')&&target){const u=new URL(target);const allowed=adapter==='veo'?['generativelanguage.googleapis.com','storage.googleapis.com']:['storage.cdn-luma.com','api.lumalabs.ai'];if(u.protocol!=='https:'||!allowed.includes(u.hostname))throw new HttpError('Host video tidak diizinkan.',403);if(adapter==='veo'){u.searchParams.delete('key');response=await fetch(u.toString(),{headers:{'x-goog-api-key':key}})}else response=await fetch(u.toString(),{headers:{Authorization:`Bearer ${key}`}})}
  else throw new HttpError('Parameter video tidak lengkap.',400);
  if(!response.ok)throw new HttpError(`Gagal mengambil video (${response.status}).`,response.status);return new Response(response.body,{status:200,headers:{...corsHeaders(env),'Content-Type':response.headers.get('Content-Type')||'video/mp4','Cache-Control':'private, no-store'}});
}
async function accountApi(request,env){
  const user=await requireUser(request,env);
  const rows=await rowsForAccount(user.id,env);
  const roleRows=await rows(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=user_id`,env);
  const isAdmin=Array.isArray(roleRows)&&roleRows.length>0;
  const contactRes=await sb('/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value',{},env);
  const contactRows=contactRes.ok?await contactRes.json():[];
  return json({success:true,user:{id:user.id,email:user.email||null},credits:Number(rows?.[0]?.credits||0),isAdmin,adminContactUrl:contactRows?.[0]?.setting_value||''},200,env);
}
async function rowsForAccount(userId,env){
  const res=await sb(`/rest/v1/user_credits?user_id=eq.${encodeURIComponent(userId)}&select=credits`,{},env);
  if(!res.ok) throw new HttpError('Gagal mengambil credit.',500);
  return await res.json();
}

async function adminApi(request,env){const admin=await requireAdmin(request,env);const url=new URL(request.url);
  if(url.pathname==='/api/admin/providers'&&request.method==='GET'){const res=await sb('/rest/v1/providers?select=id,name,adapter,enabled,config,api_key,created_at,updated_at&order=created_at.asc',{},env);if(!res.ok)throw new HttpError('Gagal mengambil provider.',500);const rows=await res.json();return json({success:true,providers:rows.map(p=>({...publicProvider(p),created_at:p.created_at,updated_at:p.updated_at,apiKeySet:Boolean(p.api_key),api_key_masked:p.api_key?'••••••••':''}))},200,env)}
  if(url.pathname==='/api/admin/providers'&&request.method==='POST'){const body=await request.json();const id=providerId(body.id);const name=String(body.name||id).trim().slice(0,100);const adapter=String(body.adapter||'').trim().toLowerCase();if(!adapterInfo(adapter))throw new HttpError('Adapter tidak didukung. Pilih adapter yang tersedia.',400);const key=String(body.api_key||'').trim();if(!key)throw new HttpError('API key wajib diisi.',400);const enabled=body.enabled!==false;const config=body.config&&typeof body.config==='object'?body.config:{};const res=await sb('/rest/v1/providers',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id,name,adapter,api_key:key,enabled,config,updated_at:new Date().toISOString()})},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal menambahkan provider.'),res.status);return json({success:true,message:'Provider berhasil ditambahkan.'},201,env)}
  const m=url.pathname.match(/^\/api\/admin\/providers\/([^/]+)$/);
  if(m&&request.method==='PUT'){const id=providerId(decodeURIComponent(m[1]));const body=await request.json();const patch={};if(body.name!==undefined)patch.name=String(body.name).trim().slice(0,100)||id;if(body.adapter!==undefined){patch.adapter=String(body.adapter).trim().toLowerCase();if(!adapterInfo(patch.adapter))throw new HttpError('Adapter tidak didukung.',400)}if(body.api_key!==undefined&&String(body.api_key).trim())patch.api_key=String(body.api_key).trim();if(body.enabled!==undefined)patch.enabled=Boolean(body.enabled);if(body.config!==undefined)patch.config=body.config;patch.updated_at=new Date().toISOString();const res=await sb(`/rest/v1/providers?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal memperbarui provider.'),res.status);return json({success:true},200,env)}
  if(m&&request.method==='DELETE'){const id=providerId(decodeURIComponent(m[1]));const res=await sb(`/rest/v1/providers?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal menghapus provider.'),res.status);return json({success:true},200,env)}
  const mt=url.pathname.match(/^\/api\/admin\/providers\/([^/]+)\/toggle$/);
  if(mt&&request.method==='POST'){const id=providerId(decodeURIComponent(mt[1]));const current=await getProvider(id,env,false);const enabled=request.headers.get('x-enable')==='true'?true:request.headers.get('x-enable')==='false'?false:!current.enabled;const res=await sb(`/rest/v1/providers?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({enabled,updated_at:new Date().toISOString()})},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal mengubah status provider.'),res.status);return json({success:true,enabled},200,env)}
  if(url.pathname==='/api/admin/contact'&&request.method==='GET'){const res=await sb('/rest/v1/app_settings?setting_key=eq.admin_contact_url&select=setting_value',{},env);const rows=res.ok?await res.json():[];return json({success:true,url:rows?.[0]?.setting_value||''},200,env)}
  if(url.pathname==='/api/admin/contact'&&request.method==='POST'){const body=await request.json();const contact=String(body.url||'').trim();const res=await sb('/rest/v1/app_settings',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({setting_key:'admin_contact_url',setting_value:contact,updated_at:new Date().toISOString()})},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal menyimpan kontak admin.'),res.status);return json({success:true},200,env)}
  if(url.pathname==='/api/admin/users'&&request.method==='GET'){const users=await listUsers(env);const roles=await rows('/rest/v1/user_roles?select=user_id,role',env);const credits=await rows('/rest/v1/user_credits?select=user_id,credits',env);const rm=new Map(roles.map(x=>[x.user_id,x.role]));const cm=new Map(credits.map(x=>[x.user_id,Number(x.credits||0)]));return json({success:true,users:users.map(u=>({id:u.id,email:u.email,role:rm.get(u.id)||'user',credits:cm.get(u.id)||0,created_at:u.created_at}))},200,env)}
  if(url.pathname==='/api/admin/credits/adjust'&&request.method==='POST'){const body=await request.json();const userId=String(body.user_id||'');const amount=Number(body.amount);if(!userId||!Number.isInteger(amount)||amount===0)throw new HttpError('user_id dan amount integer non-zero wajib.',400);const res=await sb('/rest/v1/rpc/admin_adjust_credit',{method:'POST',body:JSON.stringify({p_admin_user_id:admin.id,p_user_id:userId,p_amount:amount,p_note:String(body.note||'Admin adjustment')})},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal mengubah credit.'),res.status);return json({success:true},200,env)}
  if(url.pathname==='/api/admin/admins'&&request.method==='GET'){const roles=await rows('/rest/v1/user_roles?role=eq.admin&select=user_id,role',env);const users=await listUsers(env);const um=new Map(users.map(u=>[u.id,u.email]));return json({success:true,admins:roles.map(r=>({user_id:r.user_id,email:um.get(r.user_id)||'',role:r.role}))},200,env)}
  if(url.pathname==='/api/admin/admins/add'&&request.method==='POST'){const body=await request.json();const email=String(body.email||'').trim().toLowerCase();const users=await listUsers(env);const u=users.find(x=>String(x.email||'').toLowerCase()===email);if(!u)throw new HttpError('User belum terdaftar.',404);const res=await sb('/rest/v1/user_roles',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:u.id,role:'admin'})},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal menambahkan admin.'),res.status);return json({success:true},200,env)}
  if(url.pathname==='/api/admin/admins/remove'&&request.method==='POST'){const body=await request.json();if(String(body.user_id)===admin.id)throw new HttpError('Tidak dapat menghapus diri sendiri.',400);const res=await sb(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(body.user_id)}&role=eq.admin`,{method:'DELETE'},env);if(!res.ok)throw new HttpError(apiError(await safeJson(res),'Gagal menghapus admin.'),res.status);return json({success:true},200,env)}
  throw new HttpError('Admin endpoint tidak ditemukan.',404);
}
async function rows(path,env){const r=await sb(path,{},env);return r.ok?await r.json():[]}
async function listUsers(env){const out=[];let page=1;while(page<=20){const r=await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`,{headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}});if(!r.ok)break;const d=await r.json();const batch=d?.users||[];out.push(...batch);if(batch.length<100)break;page++}return out}

export default {async fetch(request,env){if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(env)});const url=new URL(request.url);try{if(url.pathname==='/api/config'&&request.method==='GET')return json({success:true,supabaseUrl:env.SUPABASE_URL||'',supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY||''},200,env);if(url.pathname==='/api/diagnostic'&&request.method==='GET'){const ps=await rows('/rest/v1/providers?select=id,name,adapter,enabled,api_key',env);return json({success:true,worker:'GEN-Z.AI',supabaseConfigured:Boolean(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY),providers:ps.map(p=>({id:p.id,name:p.name,adapter:p.adapter,enabled:Boolean(p.enabled),configured:Boolean(p.api_key)})),timestamp:new Date().toISOString()},200,env)}if(url.pathname==='/api/providers'&&request.method==='GET'){const ps=await rows('/rest/v1/providers?enabled=eq.true&select=id,name,adapter,enabled,api_key&order=name.asc',env);return json({success:true,providers:ps.filter(p=>p.api_key&&adapterInfo(p.adapter)).map(publicProvider)},200,env);}if(url.pathname.startsWith('/api/admin/'))return await adminApi(request,env);if(url.pathname==='/api/account/credits'&&request.method==='GET')return await accountApi(request,env);if(url.pathname==='/api/generate'&&request.method==='POST')return await handleGenerate(request,env);if(url.pathname==='/api/generate/status'&&request.method==='POST')return await handleStatus(request,env);if(url.pathname==='/api/video'&&request.method==='GET')return await handleVideo(request,env);return env.ASSETS.fetch(request)}catch(err){console.error(err);return json({success:false,error:err?.message||'Internal Worker error.'},err?.status||500,env)}}};
