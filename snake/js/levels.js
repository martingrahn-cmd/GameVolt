export async function loadLevel(name){
 const res=await fetch(`./assets/levels/${name}.json`);
 if(!res.ok)return {name:"Fallback",gridWidth:24,gridHeight:24,start:[12,12],startDir:"right",walls:[],foodNeeded:10};
 return await res.json();
}