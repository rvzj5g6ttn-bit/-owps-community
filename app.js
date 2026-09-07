(() => {
  const cfg = window.OWPS_CONFIG || {};
  const hasSupabase = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const shareForm = document.getElementById('shareForm');
  const checkForm = document.getElementById('checkForm');
  const shareMessage = document.getElementById('shareMessage');
  const checkMessage = document.getElementById('checkMessage');
  const results = document.getElementById('results');
  const profileCount = document.getElementById('profileCount');
  const resultLabel = document.getElementById('resultLabel');
  const scoreChips = document.getElementById('scoreChips');
  const distribution = document.getElementById('distribution');

  function validNoc(v){ return /^\d{5}$/.test(v); }
  function validScore(v){ const n=Number(v); return Number.isInteger(n) && n>=0 && n<=200; }
  function setMsg(el, text, type=''){ el.textContent=text; el.className='message'+(type?` ${type}`:''); }

  function localRows(){
    try { return JSON.parse(localStorage.getItem('owps-community-demo') || '[]'); }
    catch { return []; }
  }
  function saveLocal(row){
    const rows=localRows(); rows.push(row); localStorage.setItem('owps-community-demo', JSON.stringify(rows));
  }

  shareForm.addEventListener('submit', async (e) => {
    e.preventDefault(); setMsg(shareMessage,'');
    const noc=document.getElementById('shareNoc').value.trim();
    const region=document.getElementById('shareRegion').value;
    const score=Number(document.getElementById('shareScore').value);
    if(!validNoc(noc)) return setMsg(shareMessage,'Please enter a valid 5-digit NOC code.','error');
    if(!region) return setMsg(shareMessage,'Please select a region.','error');
    if(!validScore(score)) return setMsg(shareMessage,'Please enter a whole-number score from 0 to 200.','error');

    const btn=shareForm.querySelector('button'); btn.disabled=true;
    try {
      if(db){
        const { error } = await db.from('eoi_profiles').insert({ noc_code:noc, region, eoi_score:score });
        if(error) throw error;
      } else {
        saveLocal({noc_code:noc, region, eoi_score:score, created_at:new Date().toISOString()});
      }
      shareForm.reset();
      setMsg(shareMessage, hasSupabase ? 'Score shared. Thank you for helping the community.' : 'Saved in demo mode on this device. Connect Supabase to make it shared for everyone.','success');
    } catch(err){
      setMsg(shareMessage,'Could not save the score. Please try again.','error');
      console.error(err);
    } finally { btn.disabled=false; }
  });

  checkForm.addEventListener('submit', async (e) => {
    e.preventDefault(); setMsg(checkMessage,''); results.hidden=true;
    const noc=document.getElementById('checkNoc').value.trim();
    const region=document.getElementById('checkRegion').value;
    if(!validNoc(noc)) return setMsg(checkMessage,'Please enter a valid 5-digit NOC code.','error');
    if(!region) return setMsg(checkMessage,'Please select a region.','error');
    const btn=checkForm.querySelector('button'); btn.disabled=true;
    try {
      let rows=[];
      if(db){
        const { data, error } = await db.from('eoi_profiles').select('eoi_score').eq('noc_code',noc).eq('region',region).order('eoi_score',{ascending:false}).limit(500);
        if(error) throw error; rows=data || [];
      } else {
        rows=localRows().filter(r=>r.noc_code===noc && r.region===region).map(r=>({eoi_score:r.eoi_score})).sort((a,b)=>b.eoi_score-a.eoi_score);
      }
      render(rows,noc,region);
    } catch(err){
      setMsg(checkMessage,'Could not load shared scores. Please try again.','error'); console.error(err);
    } finally { btn.disabled=false; }
  });

  function render(rows,noc,region){
    results.hidden=false;
    profileCount.textContent=`${rows.length} profile${rows.length===1?'':'s'}`;
    resultLabel.textContent=`NOC ${noc} · ${region}`;
    scoreChips.innerHTML=''; distribution.innerHTML='';
    if(!rows.length){ scoreChips.innerHTML='<span style="color:#65758c">No scores have been shared yet.</span>'; return; }
    rows.slice(0,30).forEach(r=>{ const s=document.createElement('span'); s.className='chip'; s.textContent=r.eoi_score; scoreChips.appendChild(s); });
    if(rows.length>30){ const more=document.createElement('span'); more.className='chip'; more.textContent=`+${rows.length-30} more`; scoreChips.appendChild(more); }
    const buckets=new Map();
    for(const r of rows){ const start=Math.floor(r.eoi_score/10)*10; const key=`${start}-${start+9}`; buckets.set(key,(buckets.get(key)||0)+1); }
    const entries=[...buckets.entries()].sort((a,b)=>parseInt(b[0])-parseInt(a[0]));
    const max=Math.max(...entries.map(([,c])=>c));
    entries.forEach(([label,count])=>{
      const row=document.createElement('div'); row.className='dist-row';
      row.innerHTML=`<span>${label}</span><div class="bar-track"><div class="bar" style="width:${Math.round(count/max*100)}%"></div></div><strong>${count}</strong>`;
      distribution.appendChild(row);
    });
  }
})();
