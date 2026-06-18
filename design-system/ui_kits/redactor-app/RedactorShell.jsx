const { useState } = React;

function RedactorAppShell({ children, active, onNav }) {
  const nav = [
    { k:'projects', l:'Projects',  i:'M3 7h18M3 12h18M3 17h12' },
    { k:'editor',   l:'Editor',    i:'M12 4v16m8-8H4' },
    { k:'library',  l:'Library',   i:'M4 4h16v16H4z M4 10h16' },
    { k:'detectors',l:'Detectors', i:'M12 8a4 4 0 100 8 4 4 0 000-8z M3 12h2 M19 12h2 M12 3v2 M12 19v2', count:8 },
    { k:'activity', l:'Activity',  i:'M4 12h4l2-6 4 12 2-6h4' },
    { k:'settings', l:'Settings',  i:'M12 8a4 4 0 100 8 4 4 0 000-8z' },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/redactor-logo-horizontal.webp" style={{height:28,filter:'brightness(0) invert(1)'}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>Redactor</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>Heritage School District</div>
        </div>
        <button className="btn btn-primary" style={{margin:'0 6px 14px',padding:'11px 14px',fontSize:13,background:'#4f60dc',borderRadius:10}}>+ New project</button>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n=>(
            <button key={n.k} onClick={()=>onNav?.(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'rgba(135,146,232,.2)',color:'#dee2f8',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#f99f25,#f62470)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>KS</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500}}>K. Skelly</div>
            <div style={{color:'#8792e8',fontSize:11}}>Legal & Compliance</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
        {children}
      </div>
    </div>
  );
}

function RedactorTopBar({ title, subtitle }) {
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18,minWidth:0,flex:1}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
          {subtitle && <div style={{fontSize:12,color:'#64708a'}}>{subtitle}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#fff4e0',borderRadius:999,fontSize:12,fontWeight:500,color:'#f05d22'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#f99f25',boxShadow:'0 0 0 4px rgba(249,159,37,.20)'}}/>
          Processing · 2 jobs in queue
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{padding:'6px 12px',background:'#eef1fc',color:'#2e3ba4',borderRadius:999,fontSize:12,fontWeight:500}}>Auto-saved · just now</div>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Preview</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>Export</button>
      </div>
    </header>
  );
}
window.AppShell = RedactorAppShell;
window.TopBar = RedactorTopBar;
