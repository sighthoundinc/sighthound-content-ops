function Footer() {
  const cols = [
    { h:'Solutions', items:['Retail & QSR','Law Enforcement','Parking & EV','Legal, FOIA & Evidence Review'] },
    { h:'Products', items:['Sighthound ALPR+','Sighthound Redactor','Sighthound Hardware','Sighthound Video'] },
    { h:'Support', items:['Frequently Asked Questions','Contact Sales','Create Support Ticket'] },
    { h:'About', items:['Blog','Team','Technology','Partners'] },
  ];
  return (
    <footer style={{background:'#1a1d38',color:'#fff',padding:'80px 32px 32px'}}>
      <div style={{maxWidth:1240,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:40,paddingBottom:48}}>
        {cols.map(c => (
          <div key={c.h}>
            <div style={{fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:18}}>{c.h}</div>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
              {c.items.map(i => <li key={i}><a href="#" style={{color:'#dee2f8',fontSize:14,fontWeight:300,textDecoration:'none'}}>{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{maxWidth:1240,margin:'0 auto',borderTop:'1px solid #2a2e56',paddingTop:32,display:'flex',justifyContent:'space-between',alignItems:'center',color:'#8792e8',fontSize:13}}>
        <img src="../../assets/sighthound-logo-white.png" style={{height:32}}/>
        <div>© 2026 Sighthound, Inc. &nbsp;·&nbsp; Privacy Policy &nbsp;·&nbsp; Terms of Use</div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
