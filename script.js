/* ===== Intelligent Maze Solver – script.js ===== */
const R=17,C=25;
let wall,start,goal,mode='wall',busy=false,drawing=false,timers=[];
let store={};                       // latest result of each algorithm on the CURRENT maze
const ORDER=['bfs','dfs','astar','greedy'];
const NAMES={bfs:'BFS',dfs:'DFS',astar:'A* Search',greedy:'Greedy Best-First'};
const SHORT={bfs:'BFS',dfs:'DFS',astar:'A*',greedy:'Greedy'};
const COL={bfs:'#2f6fed',dfs:'#2e9e4f',astar:'#e8851c',greedy:'#6d3fd6'};

const el=document.getElementById('maze'),$=id=>document.getElementById(id);
el.style.gridTemplateColumns=`repeat(${C},auto)`;
const cells=[];
for(let i=0;i<R*C;i++){const d=document.createElement('div');d.className='cell';d.dataset.i=i;el.appendChild(d);cells.push(d)}
const idx=(r,c)=>r*C+c;

/* ---------- maze state ---------- */
function reset(){wall=new Array(R*C).fill(false);start=idx(0,0);goal=idx(R-1,C-1);mazeChanged();render()}
function render(){cells.forEach((d,i)=>{d.className='cell'+(wall[i]?' w':'')+(i===start?' s':'')+(i===goal?' g':'')})}
function setBusy(b){busy=b;$('solve').disabled=$('cmpBtn').disabled=b}
function clearViz(){timers.forEach(clearTimeout);timers=[];setBusy(false);render()}
function mazeChanged(){store={};renderComparison()}   // old results are invalid for a new maze

/* ---------- editing ---------- */
function setMode(m,id){mode=m;['mWall','mStart','mGoal'].forEach(b=>$(b).classList.remove('act'));$(id).classList.add('act')}
$('mWall').onclick=()=>setMode('wall','mWall');
$('mStart').onclick=()=>setMode('start','mStart');
$('mGoal').onclick=()=>setMode('goal','mGoal');
function edit(i){
  if(busy)return;
  if(mode==='start'&&i!==goal&&!wall[i])start=i;
  else if(mode==='goal'&&i!==start&&!wall[i])goal=i;
  else if(mode==='wall'&&i!==start&&i!==goal)wall[i]=drawing==='erase'?false:true;
  mazeChanged();render();
}
el.addEventListener('pointerdown',e=>{const i=+e.target.dataset.i;if(isNaN(i))return;clearViz();drawing=(mode==='wall'&&wall[i])?'erase':'draw';edit(i);if(mode!=='wall')drawing=false});
el.addEventListener('pointerover',e=>{if(drawing&&mode==='wall'){const i=+e.target.dataset.i;if(!isNaN(i))edit(i)}});
addEventListener('pointerup',()=>drawing=false);
$('gen').onclick=()=>{clearViz();wall=wall.map((_,i)=>i!==start&&i!==goal&&Math.random()<0.28);mazeChanged();render()};
$('clr').onclick=()=>{clearViz();wall.fill(false);mazeChanged();render()};
$('rst').onclick=()=>{clearViz();reset()};

/* ---------- search algorithms ---------- */
function nbrs(i){const r=Math.floor(i/C),c=i%C,o=[];
  if(r>0)o.push(i-C);if(c<C-1)o.push(i+1);if(r<R-1)o.push(i+C);if(c>0)o.push(i-1);
  return o.filter(n=>!wall[n])}
const h=i=>Math.abs(Math.floor(i/C)-Math.floor(goal/C))+Math.abs(i%C-goal%C);   // Manhattan distance

function search(type){
  const t0=performance.now(),prev={},seen=new Set([start]),closed=new Set(),order=[],g={[start]:0};
  let open=[start],found=false;
  while(open.length){
    let cur;
    if(type==='bfs')cur=open.shift();                    // queue
    else if(type==='dfs')cur=open.pop();                 // stack
    else{                                                // A* (g+h) or Greedy (h)
      let b=0;const f=n=>type==='astar'?g[n]+h(n):h(n);
      for(let k=1;k<open.length;k++)if(f(open[k])<f(open[b]))b=k;
      cur=open.splice(b,1)[0];
    }
    if(type==='dfs'){if(closed.has(cur))continue;closed.add(cur)}
    order.push(cur);
    if(cur===goal){found=true;break}
    const ns=nbrs(cur);
    if(type==='dfs')ns.reverse();
    for(const n of ns){
      if(type==='dfs'){if(!closed.has(n)){prev[n]=cur;g[n]=g[cur]+1;open.push(n)}}
      else if(type==='astar'){
        if(!seen.has(n)){seen.add(n);open.push(n);prev[n]=cur;g[n]=g[cur]+1}
        else if(g[cur]+1<g[n]){prev[n]=cur;g[n]=g[cur]+1}      // cheaper route found: update cost and parent
      }
      else if(!seen.has(n)){seen.add(n);prev[n]=cur;g[n]=g[cur]+1;open.push(n)}   // BFS and Greedy
    }
  }
  const path=[];
  if(found){for(let n=goal;n!==undefined;n=prev[n])path.push(n);path.reverse()}
  return{order,path,found,nodes:order.length,len:found?path.length-1:0,time:performance.now()-t0}
}

/* ---------- animation (calls onDone when finished) ---------- */
function animate(r,sp,onDone){
  const mark=(i,cls)=>{if(i!==start&&i!==goal)cells[i].classList.add(cls)};
  if(sp===0){r.order.forEach(i=>mark(i,'e'));r.path.forEach(i=>mark(i,'p'));onDone();return}
  r.order.forEach((i,k)=>timers.push(setTimeout(()=>mark(i,'e'),k*sp)));
  const base=r.order.length*sp,ps=Math.max(sp,15);
  r.path.forEach((i,k)=>timers.push(setTimeout(()=>{cells[i].classList.remove('e');mark(i,'p')},base+k*ps)));
  timers.push(setTimeout(onDone,base+r.path.length*ps+50));
}

/* ---------- results card ---------- */
function showResult(type,r){
  $('rA').textContent=NAMES[type];
  $('rF').textContent=r.found?'Yes':'No';$('rF').style.color=r.found?'var(--green)':'#d32f2f';
  $('rN').textContent=r.nodes;$('rL').textContent=r.found?r.len:'—';$('rT').textContent=r.time.toFixed(2)+' ms';
}

/* ---------- comparison table + charts (built from stored results) ---------- */
function renderComparison(){
  const body=$('cmpBody');if(!body)return;
  body.innerHTML=ORDER.map(t=>{
    const r=store[t];
    if(!r)return `<tr><td>${NAMES[t]}</td><td colspan="4" class="note">Not run yet</td></tr>`;
    return `<tr><td>${NAMES[t]}</td><td class="${r.found?'yes':'no'}">${r.found?'Yes':'No'}</td><td>${r.nodes}</td><td>${r.found?r.len:'—'}</td><td>${r.time.toFixed(2)} ms</td></tr>`}).join('');
  const defs=[['Nodes Explored','nodes',0,()=>true],['Path Length','len',0,r=>r.found],['Execution Time (ms)','time',2,()=>true]];
  $('charts').innerHTML=defs.map(([title,key,dp,ok])=>{
    const vals=ORDER.map(t=>store[t]&&ok(store[t])?store[t][key]:null);
    const max=Math.max(...vals.filter(v=>v!==null),0.0001);
    return `<div class="chart"><h4>${title}</h4><div class="bars">`+ORDER.map((t,i)=>{
      const v=vals[i];
      return `<div class="bar"><div style="height:${v===null?0:Math.max(v/max*100,2)}%;background:${COL[t]}"></div><span>${v===null?'—':v.toFixed(dp)}</span><span>${SHORT[t]}</span></div>`}).join('')+`</div></div>`}).join('');
}

/* ---------- Solve Maze: run one algorithm, then update comparison ---------- */
$('solve').onclick=()=>{
  clearViz();
  const type=$('algo').value,r=search(type),sp=+$('speed').value;
  setBusy(true);
  animate(r,sp,()=>{
    setBusy(false);
    store[type]=r;showResult(type,r);renderComparison();      // comparison updates after every run
    if(!r.found)alert('No path exists between start and goal. Try removing some walls.');
  });
};

/* ---------- Compare All: run BFS, DFS, A*, Greedy one after another ---------- */
$('cmpBtn').onclick=()=>{
  clearViz();store={};renderComparison();
  const sp=+$('speed').value;
  setBusy(true);
  $('comparison').scrollIntoView({behavior:'smooth'});
  (function next(i){
    if(i>=ORDER.length){setBusy(false);return}
    const type=ORDER[i],r=search(type);
    render();$('algo').value=type;                              // clear previous run, show which algorithm is running
    animate(r,sp,()=>{
      store[type]=r;showResult(type,r);renderComparison();
      timers.push(setTimeout(()=>next(i+1),sp===0?0:700));
    });
  })(0);
};

/* ---------- navigation highlight ---------- */
const links=[...document.querySelectorAll('nav a')];
addEventListener('scroll',()=>{let cur='home';['home','solver','algorithms','comparison','about'].forEach(id=>{if($(id).getBoundingClientRect().top<150)cur=id});
  links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+cur))});

/* ---------- start ---------- */
reset();$('gen').click();
