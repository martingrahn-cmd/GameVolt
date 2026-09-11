export async function loadLevel(name){
 const fallback={name:"Fallback",gridWidth:24,gridHeight:24,start:[12,12],startDir:"right",walls:[],foodNeeded:10};
 const controller=typeof AbortController === "function" ? new AbortController() : null;
 const timeoutId=controller ? setTimeout(() => controller.abort(), 8000) : null;
 try {
  const res=await fetch(`./assets/levels/${name}.json`, controller ? {signal:controller.signal} : undefined);
  if(!res.ok)return fallback;
  const level=await res.json();
  if(!level || !Number.isFinite(level.gridWidth) || !Number.isFinite(level.gridHeight) ||
     !Array.isArray(level.start) || level.start.length < 2) return fallback;
  return level;
 } catch (error) {
  console.warn(`Could not load ${name}; using fallback`, error);
  return fallback;
 } finally {
  if(timeoutId !== null) clearTimeout(timeoutId);
 }
}
