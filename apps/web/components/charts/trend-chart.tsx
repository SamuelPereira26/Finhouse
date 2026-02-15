'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function TrendChart({ data }: { data: Array<{ date: string; balance: number }> }) {
  if (data.length === 0) {
    return <p className="text-sm text-amber-900/70">Sin datos para la tendencia.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4D6B57" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#4D6B57" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#d6c9b4" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="balance" stroke="#4D6B57" fill="url(#balanceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
