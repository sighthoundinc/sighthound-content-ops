const { useState } = React;

function Nav() {
  const [open, setOpen] = useState(null);
  const menus = {
    Products: ['Sighthound ALPR+', 'Sighthound Redactor', 'Sighthound Hardware', 'Sighthound Video'],
    Solutions: ['Parking & EV', 'Law Enforcement', 'Retail & QSR', 'Education & Campus Security', 'Legal & FOIA', 'Transportation & Logistics'],
    Support: ['Frequently Asked Questions', 'Developer Resources'],
    About: ['Team', 'Technology', 'Partners', 'Careers', 'News', 'Blog'],
  };
  return (
    <nav style={{position:'sticky',top:0,zIndex:50,background:'#fff',borderBottom:'1px solid #e4e8ef'}}>
      <div style={{maxWidth:1240,margin:'0 auto',padding:'16px 32px',display:'flex',alignItems:'center',gap:32}}>
        <img src="../../assets/sighthound-logo-horizontal.jpg" style={{height:40}} alt="Sighthound"/>
        <div style={{display:'flex',gap:4,flex:1}} onMouseLeave={()=>setOpen(null)}>
          {Object.keys(menus).map(k => (
            <div key={k} style={{position:'relative'}} onMouseEnter={()=>setOpen(k)}>
              <button style={{background:'none',border:0,padding:'10px 14px',fontFamily:'Lexend',fontWeight:300,fontSize:15,color:'#1a1d38',cursor:'pointer'}}>{k}</button>
              {open===k && (
                <div style={{position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid #e4e8ef',borderRadius:12,boxShadow:'0 8px 20px rgba(26,29,56,.10)',padding:8,minWidth:240}}>
                  {menus[k].map(i => <a key={i} href="#" style={{display:'block',padding:'10px 14px',fontSize:14,color:'#1a1d38',textDecoration:'none',borderRadius:8,fontWeight:300}} onMouseEnter={e=>e.currentTarget.style.background='#eff3f7'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{i}</a>)}
                </div>
              )}
            </div>
          ))}
        </div>
        <a href="#" style={{fontFamily:'Lexend',fontWeight:300,fontSize:15,color:'#1a1d38',textDecoration:'none'}}>Contact</a>
        <button className="btn btn-primary" style={{padding:'12px 22px'}}>Talk to our team</button>
      </div>
    </nav>
  );
}
window.Nav = Nav;
