const { useState } = React;

function AppShell({ children, active, onNav }) {
  const nav = [
    { k:'projects', l:'Projects', i:'M3 7h18M3 12h18M3 17h12' },
    { k:'editor', l:'Editor', i:'M12 4v16m8-8H4' },
    { k:'library', l:'Library', i:'M4 4h16v16H4zM4 10h16' },
    { k:'activity', l:'Activity', i:'M4 12h4l2-6 4 12 2-6h4' },
    { k:'settings', l:'Settings', i:'M12 8a4 4 0 100 8 4 4 0 000-8z' },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 10px 24px'}}>
          <img src="../../assets/redactor-logo-horizontal.webp" style={{height:30,filter:'brightness(0) invert(1)'}}/>
        </div>
        <button className="btn btn-primary" style={{margin:'0 6px 18px',padding:'12px 16px',fontSize:14,background:'#4f60dc'}}>+ New project</button>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n=>(
            <button key={n.k} onClick={()=>onNav?.(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:300,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={n.i}/></svg>
              {n.l}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#f99f25,#f62470)'}}/>
          <div style={{fontSize:13}}>
            <div style={{fontWeight:500}}>K. Skelly</div>
            <div style={{color:'#8792e8',fontSize:11}}>Heritage School</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
        {children}
      </div>
    </div>
  );
}

function TopBar({ title, subtitle }) {
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'18px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div>
        <div className="overline" style={{marginBottom:2}}>Editor</div>
        <div style={{fontFamily:'Lexend',fontWeight:500,fontSize:20,color:'#1a1d38'}}>{title}</div>
        {subtitle && <div style={{fontSize:13,color:'#64708a',marginTop:2}}>{subtitle}</div>}
      </div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <div style={{padding:'6px 12px',background:'#eef1fc',color:'#2e3ba4',borderRadius:999,fontSize:12,fontWeight:500}}>Auto-saved · just now</div>
        <button className="btn btn-secondary" style={{padding:'10px 18px',fontSize:14}}>Preview</button>
        <button className="btn btn-primary" style={{padding:'10px 18px',fontSize:14}}>Export</button>
      </div>
    </header>
  );
}
window.AppShell = AppShell;
window.TopBar = TopBar;
