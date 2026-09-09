/* ai_video_real_v8.js */
"use strict";
(() => {
  const MODEL="amazon/nova-reel-v1";
  const KEY="polli_access_token";
  const $=id=>document.getElementById(id);
  const status=(t,c="")=>{const e=$("status");if(e){e.textContent=t;e.className="status "+c;}};
  const token=()=>sessionStorage.getItem(KEY)||sessionStorage.getItem("pollinations_access_token")||sessionStorage.getItem("access_token")||"";
  const duration=()=>Number($("duration")?.value)===10?10:5;
  const aspect=()=>["16:9","9:16","1:1"].includes($("aspect")?.value)?$("aspect").value:"16:9";
  const prompt=()=>((($("prompt")?.value||"").trim())+". Animate the reference image with clear continuous natural motion. Preserve the exact subject, identity, appearance, anatomy, colors, clothing or fur, background and environment. The subject must visibly move throughout the video. Natural realistic physical motion and consistent subject. Do not freeze, morph, warp, duplicate or replace the subject. No new subjects. No text, logo or watermark.").trim());
  async function upload(blob,t){
    const f=new FormData(); f.append("file",blob,"reference-image.png");
    const r=await fetch("https://media.pollinations.ai/upload",{method:"POST",headers:{Authorization:"Bearer "+t},body:f});
    const txt=await r.text().catch(()=>""); let d={}; try{d=JSON.parse(txt)}catch{}
    if(!r.ok)throw new Error("Upload gambar gagal: HTTP "+r.status+(txt?" - "+txt.slice(0,500):""));
    const u=d.url||d.publicUrl||d.imageUrl||d.data?.url||d.data?.publicUrl||d.data?.imageUrl;
    if(!u||!/^https?:\/\//i.test(u))throw new Error("Upload berhasil, tetapi URL gambar publik HTTPS tidak ditemukan.");
    return u;
  }
  async function generate(){
    const btn=$("videoBtn"),img=$("imagePreview"),video=$("videoPreview"),dl=$("download");
    status("Tombol video aktif. Menyiapkan proses...");
    const t=token();
    if(!t){status("Token OAuth tidak ditemukan. Hubungkan Pollinations terlebih dahulu.","err");return;}
    if(!img?.src?.startsWith("blob:")){status("Buat gambar AI terlebih dahulu.","err");return;}
    if(btn)btn.disabled=true;
    try{
      status("Membaca gambar AI..."); const ir=await fetch(img.src); if(!ir.ok)throw new Error("Gagal membaca gambar AI: HTTP "+ir.status);
      const ib=await ir.blob(); if(!ib.size)throw new Error("Gambar AI kosong.");
      status("Mengunggah gambar referensi ke Pollinations..."); const imageUrl=await upload(ib,t);
      status("Meminta Amazon Nova Reel ("+duration()+" detik, "+aspect()+")...");
      const qs=new URLSearchParams({model:MODEL,duration:String(duration()),aspectRatio:aspect(),image:imageUrl});
      const r=await fetch("https://gen.pollinations.ai/video/"+encodeURIComponent(prompt())+"?"+qs,{headers:{Authorization:"Bearer "+t}});
      if(!r.ok){const txt=await r.text().catch(()=>"");if(r.status===401)sessionStorage.removeItem(KEY);throw new Error("Video gagal: HTTP "+r.status+(txt?" - "+txt.slice(0,700):""));}
      status("Video diterima. Menyiapkan pemutar..."); const b=await r.blob(); if(!b.size)throw new Error("Server mengembalikan video kosong.");
      if(window.__novaVideoUrl)URL.revokeObjectURL(window.__novaVideoUrl); window.__novaVideoUrl=URL.createObjectURL(b);
      if(video){video.src=window.__novaVideoUrl;video.controls=true;video.style.display="block";video.load();}
      if(dl){dl.href=window.__novaVideoUrl;dl.download="ai-video-nova-reel.mp4";dl.style.display="block";dl.textContent="Download Video";}
      status("Video AI berhasil dibuat dengan Amazon Nova Reel.","ok");
    }catch(e){status(e?.message||String(e),"err");}finally{if(btn)btn.disabled=false;}
  }
  window.generateVideoWithNovaReel=generate;
  window.__NOVA_REEL_V8_LOADED=true;
})();
