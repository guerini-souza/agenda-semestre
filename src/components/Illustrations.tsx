/** Ilustrações vetoriais autorais (SVG). Decorativas: usam as cores do tema atual via variáveis CSS. */
type Art = { className?: string };
const common = { 'aria-hidden': true, focusable: false, xmlns: 'http://www.w3.org/2000/svg' } as const;
const line = { stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function HeroScene({ className }: Art) {
  const cells: Array<[number, number, string]> = [[0, 0, 'var(--accent)'], [2, 0, 'var(--marker)'], [1, 1, 'var(--exam)'], [3, 1, 'var(--accent)'], [4, 1, 'var(--teal)'], [0, 2, 'var(--marker)'], [2, 2, 'var(--accent)'], [4, 3, 'var(--exam)'], [1, 3, 'var(--teal)']];
  return <svg {...common} className={className} viewBox="0 0 560 400">
    <ellipse cx="290" cy="360" rx="230" ry="22" fill="var(--paper-deep)" />
    <g transform="rotate(-3 220 190)">
      <rect x="60" y="48" width="340" height="276" rx="16" fill="var(--surface)" {...line} />
      <path d="M60 64a16 16 0 0 1 16-16h308a16 16 0 0 1 16 16v38H60z" fill="var(--accent)" {...line} />
      <rect x="120" y="32" width="14" height="32" rx="7" fill="var(--paper)" {...line} />
      <rect x="326" y="32" width="14" height="32" rx="7" fill="var(--paper)" {...line} />
      <g fill="#fff" fontFamily="inherit" fontSize="13" fontWeight="700">
        {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((d, i) => <text key={d} x={92 + i * 60} y={84}>{d}</text>)}
      </g>
      {[0, 1, 2, 3].map(r => <path key={r} d={`M60 ${134 + r * 48}H400`} stroke="var(--line)" strokeWidth="2" />)}
      {[1, 2, 3, 4].map(c => <path key={c} d={`M${60 + c * 68} 102V324`} stroke="var(--line)" strokeWidth="2" />)}
      {cells.map(([c, r, fill], i) => <rect key={i} x={68 + c * 68} y={110 + r * 48 + (i % 2) * 6} width="52" height={i % 3 === 0 ? 34 : 24} rx="6" fill={fill} opacity=".92" />)}
    </g>
    <g transform="rotate(7 470 210)">
      <path d="M402 96h96l32 32v168a10 10 0 0 1-10 10H402a10 10 0 0 1-10-10V106a10 10 0 0 1 10-10z" fill="var(--surface)" {...line} />
      <path d="M498 96v32h32" fill="var(--paper-deep)" {...line} />
      <rect x="410" y="150" width="76" height="22" rx="5" fill="var(--exam)" />
      <text x="422" y="166" fontSize="14" fontWeight="800" fill="#fff" fontFamily="inherit">PDF</text>
      {[196, 218, 240, 262].map((y, i) => <path key={y} d={`M410 ${y}h${i === 3 ? 44 : 96}`} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity=".28" />)}
    </g>
    <path d="M396 190c-26-6-34 14-18 30" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
    <path d="m374 214 6 8 9-5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <g transform="rotate(-10 120 330)">
      <rect x="40" y="318" width="170" height="22" rx="4" fill="var(--marker)" {...line} />
      <path d="M210 318l34 11-34 11z" fill="var(--paper)" {...line} />
      <path d="M238 326.500l6 2.500-6 2.500z" fill="var(--ink)" />
      <path d="M40 318v22" {...line} />
      <rect x="62" y="318" width="14" height="22" fill="var(--paper-deep)" />
    </g>
    <g transform="rotate(5 500 330)">
      <rect x="452" y="296" width="80" height="72" rx="6" fill="var(--marker)" {...line} />
      <path d="m474 332 12 12 22-26" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>;
}

export function StudentScene({ className }: Art) {
  return <svg {...common} className={className} viewBox="0 0 360 260">
    <ellipse cx="180" cy="236" rx="150" ry="14" fill="var(--paper-deep)" />
    <g>
      <rect x="44" y="190" width="130" height="22" rx="4" fill="var(--accent)" {...line} />
      <rect x="54" y="168" width="116" height="22" rx="4" fill="var(--marker)" {...line} />
      <rect x="40" y="146" width="122" height="22" rx="4" fill="var(--exam)" {...line} />
      <path d="M62 201h40M72 179h30M58 157h36" stroke="var(--paper)" strokeWidth="3" strokeLinecap="round" />
    </g>
    <g transform="rotate(4 250 120)">
      <rect x="190" y="30" width="116" height="190" rx="18" fill="var(--ink)" />
      <rect x="198" y="44" width="100" height="162" rx="10" fill="var(--surface)" />
      <rect x="198" y="44" width="100" height="30" rx="10" fill="var(--accent)" />
      <rect x="198" y="64" width="100" height="10" fill="var(--accent)" />
      {[0, 1, 2, 3].map(r => <g key={r}>{[0, 1, 2, 3, 4].map(c => <rect key={c} x={205 + c * 18} y={84 + r * 28} width="13" height="13" rx="3" fill={(r * 5 + c) % 7 === 2 ? 'var(--exam)' : (r * 5 + c) % 5 === 1 ? 'var(--accent)' : 'var(--paper-deep)'} />)}</g>)}
      <rect x="226" y="36" width="44" height="5" rx="2.500" fill="#fff" opacity=".7" />
    </g>
    <g transform="rotate(-8 130 70)">
      <rect x="86" y="30" width="82" height="62" rx="6" fill="var(--surface)" {...line} />
      <path d="M96 48h54M96 62h40M96 76h30" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity=".3" />
      <rect x="132" y="68" width="30" height="16" rx="4" fill="var(--exam)" />
      <text x="136" y="80" fontSize="11" fontWeight="800" fill="#fff" fontFamily="inherit">PDF</text>
    </g>
  </svg>;
}

export function TeacherScene({ className }: Art) {
  return <svg {...common} className={className} viewBox="0 0 360 260">
    <ellipse cx="180" cy="238" rx="150" ry="14" fill="var(--paper-deep)" />
    <rect x="34" y="28" width="236" height="150" rx="10" fill="var(--board)" stroke="var(--wood)" strokeWidth="9" />
    <path d="M58 62h120M58 88h92M58 114h140" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".82" />
    <g stroke="var(--marker)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <rect x="196" y="52" width="52" height="52" rx="4" />
      <path d="M196 70h52M214 52v52M232 52v52" strokeWidth="2.500" />
    </g>
    <path d="M200 134l12 12 22-26" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="46" y="188" width="212" height="9" rx="3" fill="var(--wood)" />
    <rect x="60" y="182" width="34" height="7" rx="3" fill="#fff" />
    <rect x="104" y="182" width="22" height="7" rx="3" fill="var(--marker)" />
    <g transform="rotate(5 300 150)">
      <rect x="250" y="64" width="86" height="136" rx="8" fill="var(--surface)" {...line} />
      <rect x="276" y="54" width="34" height="18" rx="5" fill="var(--accent)" {...line} />
      {[0, 1, 2].map(i => <g key={i}>
        <rect x="262" y={92 + i * 32} width="14" height="14" rx="3" fill={i < 2 ? 'var(--accent)' : 'var(--paper)'} stroke="var(--ink)" strokeWidth="2" />
        {i < 2 && <path d={`m265 ${99 + i * 32} 3 3 6-7`} fill="none" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" strokeLinejoin="round" />}
        <path d={`M284 ${99 + i * 32}h38`} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" opacity=".3" />
      </g>)}
    </g>
    <g>
      <path d="M96 214h44l-4 22a8 8 0 0 1-8 6h-20a8 8 0 0 1-8-6z" fill="var(--exam)" {...line} />
      <path d="M140 220c14-2 14 14 0 14" fill="none" {...line} />
    </g>
  </svg>;
}
