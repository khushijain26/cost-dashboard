export function SpendSummary({ data }) {
  if (!data?.length) return null;

  const total     = data.reduce((s, d) => s + d.thisWeek, 0);
  const lastTotal = data.reduce((s, d) => s + d.lastWeek, 0);
  const mom       = ((total - lastTotal) / lastTotal * 100).toFixed(1);
  const top       = [...data].sort((a, b) => b.thisWeek - a.thisWeek)[0];
  const isUp      = parseFloat(mom) > 0;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
                  gap:'12px', marginBottom:'24px' }}>
      <Card label="Total spend (7d)" value={`$${total.toFixed(2)}`} />
      <Card label="Top service" value={top.service} sub={`$${top.thisWeek.toFixed(2)}`} />
      <Card label="Week-over-week" value={`${isUp?'+':''}${mom}%`}
            accent={isUp ? 'warn' : 'ok'} />
    </div>
  );
}

function Card({ label, value, sub, accent }) {
  const color = accent === 'warn' ? '#BA7517'
              : accent === 'ok'   ? '#3B6D11'
              : '#1a1a1a';
  return (
    <div style={{ background:'#f5f5f3', borderRadius:'8px', padding:'1rem' }}>
      <p style={{ fontSize:'13px', color:'#888', margin:'0 0 6px' }}>{label}</p>
      <p style={{ fontSize:'22px', fontWeight:500, margin:0, color }}>{value}</p>
      {sub && <p style={{ fontSize:'12px', color:'#aaa', margin:'4px 0 0' }}>{sub}</p>}
    </div>
  );
}