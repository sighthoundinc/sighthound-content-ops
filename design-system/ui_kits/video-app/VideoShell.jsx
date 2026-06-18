const { useState } = React;

function VideoAppShell({ children }) {
  const nav = [
    { k:'live',       l:'Live monitoring', i:'M3 12h4l2-6 4 12 2-6h4 M21 12h-2' },
    { k:'cameras',    l:'Cameras',         i:'M3 7l3-3h12l3 3v12H3z M12 11a3 3 0 100 6 3 3 0 000-6z', count:14 },
    { k:'recordings', l:'Recordings',      i:'M3 4h18v16H3z M3 8h18 M7 4v16' },
    { k:'events',     l:'Events',          i:'M12 9v4 M12 17h.01 M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', count:23 },
    { k:'schedules',  l:'Schedules',       i:'M3 7h18 M3 12h18 M3 17h18 M7 3v4 M17 3v4' },
    { k:'users',      l:'Users & access',  i:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
    { k:'settings',   l:'Settings',        i:'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z' },
  ];
  const [active, setActive] = useState('live');
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/sighthound-logo-white.png" style={{height:30}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>Video</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>Mercer Logistics</div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n => (
            <button key={n.k} onClick={()=>setActive(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'rgba(135,146,232,.2)',color:'#dee2f8',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#4f60dc,#f99f25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>DP</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500}}>D. Patel</div>
            <div style={{color:'#8792e8',fontSize:11}}>Security Ops</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>{children}</div>
    </div>
  );
}

function VideoTopBar({ layout, onLayout }) {
  const opts = [
    { k:'grid', i:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
    { k:'focus', i:'M3 3h18v18H3z' },
    { k:'list', i:'M3 5h18 M3 12h18 M3 19h18' },
  ];
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18,minWidth:0}}>
        <div>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38'}}>Live monitoring</div>
          <div style={{fontSize:12,color:'#64708a'}}>Mercer Logistics · West Yard</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#e7f4ed',borderRadius:999,fontSize:12,fontWeight:500,color:'#1f9d55'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.20)'}}/>
          12 / 14 cameras online
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{display:'flex',padding:3,background:'#f6f8fb',border:'1px solid #e4e8ef',borderRadius:10}}>
          {opts.map(o=>(
            <button key={o.k} onClick={()=>onLayout(o.k)} style={{padding:'6px 9px',border:0,background:layout===o.k?'#fff':'transparent',color:layout===o.k?'#4f60dc':'#64708a',borderRadius:8,cursor:'pointer',boxShadow:layout===o.k?'0 1px 2px rgba(26,29,56,.06)':'none',display:'flex',alignItems:'center'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={o.i}/></svg>
            </button>
          ))}
        </div>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Audio off</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>+ Add camera</button>
      </div>
    </header>
  );
}

window.VideoAppShell = VideoAppShell;
window.VideoTopBar = VideoTopBar;
