function CustomerLogos() {
  const customers = ['Argonne Laboratory','Atea','Lotus','Zepcam','Garmin','SafeFleet','Bynet','Consilio','Bioclinica','LensLock'];
  return (
    <section style={{padding:'80px 32px',background:'#fff',textAlign:'center'}}>
      <div className="overline" style={{marginBottom:8}}>Trusted partners</div>
      <h2 style={{fontSize:36,marginBottom:48}}>Over 2,800 Customers & Partners</h2>
      <div style={{maxWidth:1080,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:24,rowGap:40}}>
        {customers.map(c => (
          <div key={c} style={{height:56,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Lexend',fontWeight:600,fontSize:16,color:'#9aa3b2',letterSpacing:'.02em',border:'1px dashed #e4e8ef',borderRadius:10}}>{c}</div>
        ))}
      </div>
    </section>
  );
}
window.CustomerLogos = CustomerLogos;
