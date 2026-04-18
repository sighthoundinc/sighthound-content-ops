function MediaList({ items, activeId, onSelect }) {
  return (
    <div style={{width:280,background:'#fff',borderRight:'1px solid #e4e8ef',padding:16,overflow:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div className="overline">Project files</div>
        <button style={{border:0,background:'#eef1fc',color:'#4f60dc',padding:'4px 10px',borderRadius:999,fontSize:11,fontWeight:500,cursor:'pointer'}}>+ Upload</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {items.map(it=>{
          const isActive = it.id===activeId;
          const sColor = it.status==='Redacted'?'#1f9d55':it.status==='Processing'?'#f99f25':'#64708a';
          const sBg    = it.status==='Redacted'?'#e7f4ed':it.status==='Processing'?'#fff4e0':'#eff3f7';
          return (
            <button key={it.id} onClick={()=>onSelect?.(it.id)} style={{textAlign:'left',background:isActive?'#eef1fc':'#fff',border:'1px solid '+(isActive?'#4f60dc':'#e4e8ef'),borderRadius:10,padding:10,display:'flex',gap:10,cursor:'pointer',fontFamily:'Lexend'}}>
              <div style={{width:56,height:40,borderRadius:6,background:'#1a1d38',overflow:'hidden',flexShrink:0}}>
                {it.thumb && <img src={it.thumb} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.name}</div>
                <div style={{fontSize:11,color:'#64708a',marginTop:2}}>{it.duration} · {it.size}</div>
                <span style={{display:'inline-block',marginTop:5,fontSize:10,fontWeight:500,color:sColor,background:sBg,padding:'2px 8px',borderRadius:999}}>{it.status}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.MediaList = MediaList;
