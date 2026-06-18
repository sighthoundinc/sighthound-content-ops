const { useState } = React;

function AppShell({ children }) {
  const nav = [
    { k:'live',      l:'Live operations', i:'M3 12h4l2-6 4 12 2-6h4 M21 12h-2' },
    { k:'search',    l:'Search',          i:'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.3-4.3' },
    { k:'vehicles',  l:'Vehicles',        i:'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2' },
    { k:'sites',     l:'Sites & lanes',   i:'M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z M12 11a2 2 0 100-4 2 2 0 000 4z' },
    { k:'analytics', l:'Analytics',       i:'M3 3v18h18 M7 14l4-4 3 3 5-6' },
    { k:'watchlist', l:'Watchlist',       i:'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z', count:4 },
    { k:'settings',  l:'Settings',        i:'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z' },
  ];
  const [active, setActive] = useState('live');
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/sighthound-logo-white.png" style={{height:30}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>ALPR+</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>City of Phoenix</div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n => (
            <button key={n.k} onClick={()=>setActive(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center',position:'relative'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'#f99f25',color:'#1a1d38',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#4f60dc,#f62470)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>TM</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>T. Marquez</div>
            <div style={{color:'#8792e8',fontSize:11}}>Traffic Operations</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>
        {children}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38'}}>Live operations</div>
          <div style={{fontSize:12,color:'#64708a'}}>All 12 sites · 47 active lanes</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#e7f4ed',borderRadius:999,fontSize:12,fontWeight:500,color:'#1f9d55'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.20)'}}/>
          Live · 14.3 / min
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          Pause stream
        </button>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Export</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>+ Add filter</button>
      </div>
    </header>
  );
}

window.AlprAppShell = AppShell;
window.AlprTopBar = TopBar;
