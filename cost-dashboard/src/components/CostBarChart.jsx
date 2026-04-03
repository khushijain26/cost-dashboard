import { BarChart, Bar, XAxis, YAxis, Tooltip,
         Legend, ResponsiveContainer } from 'recharts';

export function CostBarChart({ data }) {
  if (!data?.length) return null;

  const chartData = data.map(s => ({
    name: s.service,
    'This week': parseFloat(s.thisWeek.toFixed(2)),
    'Last week': parseFloat(s.lastWeek.toFixed(2)),
  }));

  return (
    <div style={{ background:'#f5f5f3', borderRadius:'12px',
                  padding:'20px', marginBottom:'24px' }}>
      <p style={{ fontSize:'14px', fontWeight:500, margin:'0 0 16px' }}>
        Spend by service
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="30%">
          <XAxis dataKey="name" tick={{ fontSize:12 }} />
          <YAxis tick={{ fontSize:12 }} tickFormatter={v => `$${v}`} />
          <Tooltip formatter={v => [`$${v}`, '']} />
          <Legend />
          <Bar dataKey="This week" fill="#378ADD" radius={[4,4,0,0]} />
          <Bar dataKey="Last week" fill="#B4B2A9" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}