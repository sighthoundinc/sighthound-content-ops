const EVENTS = [
  { id:'e01', t:'09:42:18', plate:'7ABC123', region:'CA', make:'Tesla',  model:'Model 3', year:2023, color:'White',  conf:0.98, site:'Loop 202',  lane:'WB · 3', flag:null      },
  { id:'e02', t:'09:42:11', plate:'4XKD891', region:'NV', make:'Ford',   model:'F-150',   year:2020, color:'Silver', conf:0.96, site:'Camelback', lane:'NB · 1', flag:null      },
  { id:'e03', t:'09:42:04', plate:'8RTL204', region:'CA', make:'Toyota', model:'Camry',   year:2018, color:'Black',  conf:0.99, site:'I-10',      lane:'EB · 4', flag:'watch'   },
  { id:'e04', t:'09:41:55', plate:'2GHM559', region:'AZ', make:'Honda',  model:'CR-V',    year:2021, color:'Blue',   conf:0.94, site:'Camelback', lane:'SB · 2', flag:null      },
  { id:'e05', t:'09:41:30', plate:'9PLN710', region:'CA', make:'BMW',    model:'X5',      year:2019, color:'Gray',   conf:0.97, site:'Loop 202',  lane:'EB · 1', flag:null      },
  { id:'e06', t:'09:41:18', plate:'3SDR882', region:'CA', make:'Chevy',  model:'Tahoe',   year:2022, color:'Black',  conf:0.99, site:'I-10',      lane:'EB · 3', flag:'alert'   },
  { id:'e07', t:'09:41:02', plate:'5JKF291', region:'TX', make:'Ram',    model:'1500',    year:2017, color:'Red',    conf:0.91, site:'Loop 202',  lane:'WB · 2', flag:null      },
  { id:'e08', t:'09:40:47', plate:'1WQM004', region:'CA', make:'Toyota', model:'RAV4',    year:2024, color:'White',  conf:0.95, site:'Camelback', lane:'NB · 2', flag:null      },
  { id:'e09', t:'09:40:22', plate:'6BVC553', region:'NV', make:'Subaru', model:'Outback', year:2019, color:'Green',  conf:0.93, site:'I-10',      lane:'WB · 4', flag:null      },
  { id:'e10', t:'09:39:51', plate:'8ZTP118', region:'AZ', make:'Hyundai',model:'Elantra', year:2021, color:'Silver', conf:0.96, site:'Loop 202',  lane:'EB · 2', flag:null      },
  { id:'e11', t:'09:39:18', plate:'4MKR777', region:'CA', make:'Tesla',  model:'Y',       year:2022, color:'Blue',   conf:0.98, site:'Camelback', lane:'SB · 3', flag:null      },
  { id:'e12', t:'09:38:55', plate:'2NDS104', region:'CA', make:'GMC',    model:'Sierra',  year:2020, color:'White',  conf:0.94, site:'I-10',      lane:'EB · 1', flag:null      },
];

window.EVENTS = EVENTS;

function EventStream({ activeId, onSelect }) {
  const conf = (c) => c >= 0.95 ? '#1f9d55' : c >= 0.90 ? '#4f60dc' : '#f99f25';
  return (
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Filter chips */}
      <div style={{padding:'14px 24px',background:'#fff',borderBottom:'1px solid #e4e8ef',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        {[
          {l:'All sites',active:true,close:false},
          {l:'Last 1 h',active:true,close:true},
          {l:'Confidence > 0.85',active:true,close:true},
        ].map(c => (
          <span key={c.l} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',background:c.active?'#eef1fc':'#fff',color:'#2e3ba4',border:'1px solid #dee2f8',borderRadius:999,fontSize:12,fontWeight:500}}>
            {c.l}
            {c.close && <button style={{border:0,background:'none',color:'#4f60dc',cursor:'pointer',fontSize:13,padding:0,lineHeight:1}}>×</button>}
          </span>
        ))}
        <div style={{marginLeft:'auto',position:'relative',width:240}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa3b2" strokeWidth="1.75" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" strokeLinecap="round"/></svg>
          <input placeholder="Search plate, MMCG, site…" style={{width:'100%',padding:'8px 12px 8px 32px',border:'1px solid #d9dfe6',borderRadius:8,fontSize:13,fontFamily:'Lexend',color:'#1a1d38'}}/>
        </div>
      </div>

      {/* Event list */}
      <div style={{flex:1,overflow:'auto',padding:'14px 24px 24px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10,paddingLeft:4}}>Today</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {EVENTS.map(e => {
            const isActive = e.id === activeId;
            const flagBg = e.flag === 'alert' ? '#fdebf2' : e.flag === 'watch' ? '#fef4e0' : null;
            const flagFg = e.flag === 'alert' ? '#f62470' : e.flag === 'watch' ? '#f05d22' : null;
            return (
              <button key={e.id} onClick={()=>onSelect(e.id)} style={{textAlign:'left',background:isActive?'#eef1fc':'#fff',border:'1px solid '+(isActive?'#4f60dc':'#e4e8ef'),borderLeft:'3px solid '+(isActive?'#4f60dc':e.flag==='alert'?'#f62470':e.flag==='watch'?'#f99f25':'transparent'),borderRadius:10,padding:'12px 14px',display:'grid',gridTemplateColumns:'12px 80px 130px 1fr 130px 60px',gap:14,alignItems:'center',cursor:'pointer',fontFamily:'Lexend'}}>
                <span style={{width:8,height:8,borderRadius:999,background:conf(e.conf),justifySelf:'center'}}/>
                <span style={{fontSize:12,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{e.t}</span>
                <span style={{padding:'3px 8px',background:'#1a1d38',color:'#fff',borderRadius:6,fontSize:11,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em',width:'fit-content'}}>{e.region} · {e.plate}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.color} {e.year} {e.make} {e.model}</div>
                  <div style={{fontSize:11,color:'#64708a'}}>{e.site} · {e.lane}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {flagBg && <span style={{padding:'2px 8px',borderRadius:999,background:flagBg,color:flagFg,fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>{e.flag==='alert'?'Alert':'Watchlist'}</span>}
                </div>
                <div style={{fontSize:11,color:'#64708a',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{e.conf.toFixed(2)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.AlprEventStream = EventStream;
