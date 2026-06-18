function VehicleDetail({ event }) {
  if (!event) return <aside style={{width:380,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:24,color:'#64708a',fontFamily:'Lexend'}}>Select an event to see vehicle details.</aside>;
  const confColor = event.conf >= 0.95 ? '#1f9d55' : event.conf >= 0.90 ? '#4f60dc' : '#f99f25';
  return (
    <aside style={{width:380,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'22px 22px 18px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <span style={{padding:'5px 10px',background:'#1a1d38',color:'#fff',borderRadius:8,fontSize:14,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em'}}>{event.region} · {event.plate}</span>
          {event.flag === 'alert' && <span style={{padding:'3px 8px',borderRadius:999,background:'#fdebf2',color:'#f62470',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Alert</span>}
          {event.flag === 'watch' && <span style={{padding:'3px 8px',borderRadius:999,background:'#fef4e0',color:'#f05d22',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Watchlist</span>}
        </div>
        <div style={{fontSize:20,fontWeight:500,color:'#1a1d38',lineHeight:1.2,marginBottom:2}}>{event.color} {event.year} {event.make} {event.model}</div>
        <div style={{fontSize:12,color:'#64708a'}}>Captured {event.t} · {event.site} · {event.lane}</div>
      </div>

      {/* Evidence frame placeholder — composition motif, not stock imagery */}
      <div style={{margin:'18px 22px 8px',position:'relative'}}>
        <div className="sh-pattern-scan" style={{position:'relative',background:'#1a1d38',borderRadius:12,aspectRatio:'16/9',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg viewBox="0 0 320 180" width="100%" height="100%" style={{position:'absolute',inset:0}}>
            {/* simulated lane lines */}
            <g stroke="rgba(255,255,255,.08)" strokeWidth="1">
              <path d="M0,150 Q160,90 320,150"/>
              <path d="M0,90 Q160,40 320,90"/>
              <path d="M0,180 Q160,140 320,180" strokeDasharray="6 8"/>
            </g>
            {/* detection bbox */}
            <g>
              <rect x="118" y="76" width="86" height="58" fill="none" stroke="#4f60dc" strokeWidth="2"/>
              <rect x="118" y="61" width="58" height="14" fill="#4f60dc"/>
              <text x="124" y="72" fill="#fff" fontSize="9" fontFamily="SF Mono, Menlo, monospace" fontWeight="600">VEHICLE · {(event.conf*100).toFixed(0)}%</text>
              {/* plate bbox */}
              <rect x="140" y="116" width="42" height="11" fill="none" stroke="#f99f25" strokeWidth="1.5"/>
              <rect x="140" y="105" width="36" height="10" fill="#f99f25"/>
              <text x="143" y="113" fill="#1a1d38" fontSize="7" fontFamily="SF Mono, Menlo, monospace" fontWeight="600">PLATE · 99%</text>
            </g>
          </svg>
          <div style={{position:'absolute',bottom:8,left:10,fontSize:9,color:'#dee2f8',fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.05em',display:'flex',gap:10}}>
            <span>16:9 EVIDENCE</span>
            <span>· F#82914</span>
            <span>· {event.t}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          {[1,2,3,4].map(i=>(
            <div key={i} className="sh-pattern-scan" style={{flex:1,aspectRatio:'16/9',background:'#1a1d38',borderRadius:6,opacity:.5 + i*0.12}}/>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div style={{padding:'14px 22px 8px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Profile</div>
        <dl style={{margin:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
          {[
            ['Make', event.make],
            ['Model', event.model],
            ['Year', event.year],
            ['Color', event.color],
            ['Region', event.region],
            ['Generation', event.year >= 2020 ? '6th' : '5th'],
          ].map(([k,v])=>(
            <div key={k}>
              <dt style={{fontSize:10,color:'#64708a',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600}}>{k}</dt>
              <dd style={{margin:0,fontSize:13,color:'#1a1d38',fontWeight:500}}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Confidence bar */}
      <div style={{padding:'14px 22px',borderTop:'1px solid #eef1fc',marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Confidence</div>
          <div style={{fontSize:14,fontWeight:500,color:confColor,fontVariantNumeric:'tabular-nums'}}>{event.conf.toFixed(2)}</div>
        </div>
        <div style={{height:6,background:'#eff3f7',borderRadius:999,overflow:'hidden'}}>
          <div style={{height:'100%',width:(event.conf*100)+'%',background:confColor,borderRadius:999}}/>
        </div>
      </div>

      {/* Mini map */}
      <div style={{padding:'14px 22px',borderTop:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Location</div>
        <div className="sh-pattern-topo" style={{position:'relative',background:'#f6f8fb',borderRadius:10,height:120,border:'1px solid #e4e8ef',overflow:'hidden'}}>
          <svg viewBox="0 0 320 120" width="100%" height="100%" style={{position:'absolute',inset:0}}>
            {/* Abstract road lines */}
            <g stroke="#9aa3b2" strokeWidth="1.5" fill="none" strokeLinecap="round">
              <path d="M-10,40 Q80,30 160,55 T330,70"/>
              <path d="M-10,80 Q80,70 160,90 T330,100"/>
              <line x1="60" y1="0" x2="100" y2="120" stroke="#d9dfe6" strokeWidth="1"/>
              <line x1="220" y1="0" x2="240" y2="120" stroke="#d9dfe6" strokeWidth="1"/>
            </g>
            {/* Marker */}
            <g transform="translate(170,58)">
              <circle r="10" fill="rgba(79,96,220,.18)"/>
              <circle r="5" fill="#4f60dc" stroke="#fff" strokeWidth="2"/>
            </g>
          </svg>
          <div style={{position:'absolute',left:10,bottom:8,fontSize:10,color:'#4b4f73',fontFamily:'SF Mono, Menlo, monospace'}}>33.5°N · 112.0°W</div>
        </div>
        <div style={{fontSize:13,color:'#1a1d38',marginTop:8,fontWeight:500}}>{event.site}</div>
        <div style={{fontSize:11,color:'#64708a'}}>Lane {event.lane}</div>
      </div>

      {/* Actions */}
      <div style={{padding:'18px 22px 24px',borderTop:'1px solid #eef1fc',marginTop:'auto',display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-primary" style={{padding:'9px 14px',fontSize:13,borderRadius:8}}>+ Watchlist</button>
        <button className="btn btn-secondary" style={{padding:'9px 14px',fontSize:13,borderRadius:8}}>Export evidence</button>
        <button style={{border:0,background:'transparent',color:'#f62470',padding:'9px 12px',fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:500}}>Flag</button>
      </div>
    </aside>
  );
}
window.AlprVehicleDetail = VehicleDetail;
