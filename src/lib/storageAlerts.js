
// ---- storage-full reporting: nothing is allowed to fail silently ----
export let lastStorageAlert = 0, lastStorageBanner = 0;
// Blocking message for something the person just asked to save (a note, a star, the profile).
export function alertStorageFull(what){
  const now = Date.now();
  if(now - lastStorageAlert < 5000) return;
  lastStorageAlert = now;
  window.alert("Not saved: " + what + ".\n\nYour browser storage is full. Free some space (Test History: delete old attempts; All Notes: delete notes that have images) and try again.");
}
// Non-blocking red bar for the exam autosave (a pop-up would interrupt the test; it fires every second, so it is throttled).
export function showStorageBanner(text){
  const now = Date.now();
  if(now - lastStorageBanner < 30000) return;
  lastStorageBanner = now;
  try{
    const el = document.createElement("div");
    el.setAttribute("role","alert");
    el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:300;background:#b3261e;color:#fff;font:600 13.5px/1.4 Arial,sans-serif;padding:9px 16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3);";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 12000);
  }catch(e){}
}
