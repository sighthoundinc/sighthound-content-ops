function CustomerLogos() {
  const customers = ['Argonne Lab','Atea','Lotus','Zepcam','Garmin','SafeFleet','Bynet','Consilio','Bioclinica','LensLock','Triumph','Transport Malta'];
  return (
    <section style={{padding:'96px 32px',background:'#fff',textAlign:'center'}}>
      <div className="overline" style={{marginBottom:12}}>Trusted partners</div>
      <h2 style={{fontSize:36,marginBottom:48,fontWeight:500}}>Over 2,800 customers & partners — in 47 countries.</h2>
      <div style={{maxWidth:1080,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:1,background:'#e4e8ef',border:'1px solid #e4e8ef',borderRadius:14,overflow:'hidden'}}>
        {customers.map(c => (
          <div key={c} style={{height:84,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Lexend',fontWeight:500,fontSize:14,color:'#9aa3b2',letterSpacing:'.02em',padding:'0 12px',textAlign:'center'}}>{c}</div>
        ))}
      </div>
    </section>
  );
}
window.CustomerLogos = CustomerLogos;
