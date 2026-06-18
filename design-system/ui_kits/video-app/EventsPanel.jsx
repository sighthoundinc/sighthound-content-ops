function EventsPanel() {
  const events = [
    { t:'14:32:18', cam:'03', type:'motion',  label:'Motion detected',          tag:null },
    { t:'14:31:45', cam:'01', type:'vehicle', label:'Vehicle · White Tesla M3', tag:null },
    { t:'14:30:12', cam:'02', type:'plate',   label:'NV-4XKD891 read',          tag:null },
    { t:'14:28:55', cam:'06', type:'person',  label:'Person · Bay 6 west',      tag:null },
    { t:'14:25:30', cam:'03', type:'person',  label:'Person enters site',       tag:'follow-up' },
    { t:'14:22:18', cam:'04', type:'motion',  label:'Motion · loading deck',    tag:null },
    { t:'14:19:02', cam:'01', type:'vehicle', label:'Vehicle · Ford F-150',     tag:null },
    { t:'14:15:48', cam:'06', type:'motion',  label:'Motion detected',          tag:null },
    { t:'14:11:22', cam:'02', type:'plate',   label:'CA-7ABC123 read',          tag:null },
  ];
  const iconFor = t => ({
    motion:  { d:'M3 12h4l2-6 4 12 2-6h4', c:'#8792e8' },
    vehicle: { d:'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2', c:'#4f60dc' },
    plate:   { d:'M3 6h18v12H3z M6 9h12 M6 12h12 M6 15h8', c:'#f99f25' },
    person:  { d:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z', c:'#4f60dc' },
  }[t]);
  return (
    <aside style={{width:320,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'18px 18px 12px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Today's activity</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Events',128,'#1a1d38'],['Motion',96,'#8792e8'],['Vehicles',18,'#4f60dc'],['Alerts',2,'#f62470']].map(([l,n,c])=>(
            <div key={l} style={{padding:10,background:'#f6f8fb',borderRadius:10}}>
              <div style={{fontSize:22,fontWeight:500,color:c,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{n}</div>
              <div style={{fontSize:11,color:'#64708a',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'14px 18px 10px',borderBottom:'1px solid #eef1fc',display:'flex',gap:6,flexWrap:'wrap'}}>
        {[['All',true],['Motion',false],['Vehicle',false],['Plate',false],['Person',false]].map(([l,a])=>(
          <span key={l} style={{padding:'4px 10px',fontSize:11,fontWeight:500,borderRadius:999,background:a?'#eef1fc':'#fff',color:a?'#2e3ba4':'#64708a',border:'1px solid '+(a?'#dee2f8':'#e4e8ef')}}>{l}</span>
        ))}
      </div>

      <div style={{padding:'10px 14px 14px',flex:1}}>
        {events.map((e,i)=>{
          const icon = iconFor(e.type);
          return (
            <div key={i} style={{display:'flex',gap:10,padding:'10px',borderRadius:8,alignItems:'flex-start',cursor:'pointer'}} onMouseEnter={ev=>ev.currentTarget.style.background='#f6f8fb'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
              <div style={{width:30,height:30,borderRadius:8,background:'#f6f8fb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={icon.c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={icon.d}/></svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',display:'flex',alignItems:'center',gap:6}}>
                  <span>{e.label}</span>
                  {e.tag && <span style={{padding:'1px 7px',fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',borderRadius:999,background:'#fef4e0',color:'#f05d22'}}>{e.tag}</span>}
                </div>
                <div style={{fontSize:11,color:'#64708a',marginTop:2,display:'flex',gap:8}}>
                  <span style={{fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{e.t}</span>
                  <span>· Camera {e.cam}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
window.VideoEventsPanel = EventsPanel;
