
// ---------- Tiny ZIP writer / reader and download helper (no libraries; shared by the test platform and the Archive Viewer) ----------
export const CRC_TABLE = (()=>{ const t = new Uint32Array(256); for(let n=0;n<256;n++){ let c = n; for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); t[n] = c>>>0; } return t; })();
export function crc32(u8){ let c = 0xFFFFFFFF; for(let i=0;i<u8.length;i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c>>>8); return (c ^ 0xFFFFFFFF)>>>0; }
export async function pipeBytes(u8, transform){
  const out = new Blob([u8]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
// files: [{name, data: string | Uint8Array}] -> Blob of a .zip (compressed with deflate when the browser supports it)
export async function zipBuild(files){
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  const canDeflate = typeof CompressionStream === "function";
  const d = new Date();
  const dosTime = (d.getHours()<<11) | (d.getMinutes()<<5) | (d.getSeconds()>>1);
  const dosDate = ((d.getFullYear()-1980)<<9) | ((d.getMonth()+1)<<5) | d.getDate();
  for(const f of files){
    const nameB = enc.encode(f.name);
    const raw = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    let method = 0, body = raw;
    if(canDeflate && raw.length > 64){
      try{ const z = await pipeBytes(raw, new CompressionStream("deflate-raw")); if(z.length < raw.length){ method = 8; body = z; } }catch(e){}
    }
    const crc = crc32(raw);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, body.length, true); lh.setUint32(22, raw.length, true); lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nameB, body);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, body.length, true); ch.setUint32(24, raw.length, true); ch.setUint16(28, nameB.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nameB);
    offset += 30 + nameB.length + body.length;
  }
  let cdSize = 0; central.forEach(p=>{ cdSize += p.length; });
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {type:"application/zip"});
}
// ArrayBuffer of a .zip -> [{name, bytes}]  (stored or deflate entries)
export async function zipRead(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let e = -1;
  for(let i = u8.length-22; i >= Math.max(0, u8.length-22-65535); i--){ if(dv.getUint32(i, true) === 0x06054b50){ e = i; break; } }
  if(e < 0) throw new Error("this is not a valid ZIP file");
  const n = dv.getUint16(e+10, true); let p = dv.getUint32(e+16, true);
  const out = [], dec = new TextDecoder();
  for(let k=0;k<n;k++){
    if(dv.getUint32(p, true) !== 0x02014b50) throw new Error("the ZIP file is damaged");
    const method = dv.getUint16(p+10, true), csize = dv.getUint32(p+20, true);
    const nl = dv.getUint16(p+28, true), el = dv.getUint16(p+30, true), cl = dv.getUint16(p+32, true), lo = dv.getUint32(p+42, true);
    const name = dec.decode(u8.subarray(p+46, p+46+nl)); p += 46 + nl + el + cl;
    if(name.endsWith("/")) continue;
    const start = lo + 30 + dv.getUint16(lo+26, true) + dv.getUint16(lo+28, true);
    const data = u8.subarray(start, start+csize);
    let bytes;
    if(method === 0) bytes = data;
    else if(method === 8){
      if(typeof DecompressionStream !== "function") throw new Error("this browser cannot unpack compressed ZIP files");
      bytes = await pipeBytes(data, new DecompressionStream("deflate-raw"));
    } else throw new Error("unsupported ZIP compression (method " + method + ")");
    out.push({name, bytes});
  }
  return out;
}
export function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ try{ a.remove(); URL.revokeObjectURL(url); }catch(e){} }, 4000);
}
export function safeFileName(s){ return String(s||"test").replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "test"; }
export function fileStamp(ts){
  const d = new Date(ts), p = n=>String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
