import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import * as XLSX from 'xlsx'
import RAW_DATA from './data.js'
import KemenkeuLogo from './KemenkeuLogo.jsx'

/* ─── Theme ──────────────────────────────────────────────────── */
const T = {
  light: {
    bg:          '#F0F5FF',
    bgSub:       '#E4ECF9',
    surface:     '#FFFFFF',
    surface2:    '#EEF3FB',
    border:      'rgba(0,48,135,0.1)',
    text:        '#0A1628',
    textMuted:   '#4A6094',
    textDim:     '#2D4070',
    headerBg:    'rgba(255,255,255,0.98)',
    gold:        '#9B7A2A',
    goldLight:   'rgba(155,122,42,0.1)',
    blue:        '#1D4ED8',
    blueLight:   'rgba(29,78,216,0.1)',
    teal:        '#0891B2',
    tealLight:   'rgba(8,145,178,0.1)',
    primary:     '#003087',
    primaryBtn:  '#1D4ED8',
    shadow:      '0 2px 16px rgba(0,48,135,0.09)',
    shadowMd:    '0 6px 28px rgba(0,48,135,0.13)',
    scrollbar:   '#CBD5E1',
    inputBg:     '#EEF3FB',
    gridLine:    'rgba(0,48,135,0.06)',
    rowHover:    'rgba(0,48,135,0.025)',
    rowBorder:   'rgba(0,48,135,0.05)',
    peakBg:      'rgba(220,38,38,0.08)',
    lowBg:       'rgba(8,145,178,0.08)',
    badge: {
      Klasikal:    { bg:'rgba(29,78,216,0.1)',    color:'#1D4ED8' },
      PJJ:         { bg:'rgba(8,145,178,0.1)',    color:'#0891B2' },
      'E-Learning':{ bg:'rgba(155,122,42,0.12)',  color:'#9B7A2A' },
      Baru:        { bg:'rgba(8,145,178,0.08)',   color:'#0891B2' },
      Eksisting:   { bg:'rgba(0,48,135,0.06)',    color:'#4A6094' },
    },
  },
  dark: {
    bg:          '#0D1B3E',
    bgSub:       '#0A1428',
    surface:     '#132050',
    surface2:    '#1A2A60',
    border:      'rgba(255,255,255,0.08)',
    text:        '#F0F4FF',
    textMuted:   '#8A9BC4',
    textDim:     '#B0BFDF',
    headerBg:    'rgba(13,27,62,0.96)',
    gold:        '#C9A84C',
    goldLight:   'rgba(201,168,76,0.15)',
    blue:        '#60A5FA',
    blueLight:   'rgba(96,165,250,0.15)',
    teal:        '#22D3EE',
    tealLight:   'rgba(34,211,238,0.12)',
    primary:     '#3B82F6',
    primaryBtn:  '#2563EB',
    shadow:      '0 4px 24px rgba(0,0,0,0.35)',
    shadowMd:    '0 8px 32px rgba(0,0,0,0.45)',
    scrollbar:   '#1A2A60',
    inputBg:     '#1A2A60',
    gridLine:    'rgba(255,255,255,0.05)',
    rowHover:    'rgba(255,255,255,0.03)',
    rowBorder:   'rgba(255,255,255,0.04)',
    peakBg:      'rgba(248,113,113,0.1)',
    lowBg:       'rgba(34,211,238,0.08)',
    badge: {
      Klasikal:    { bg:'rgba(96,165,250,0.18)',  color:'#93C5FD' },
      PJJ:         { bg:'rgba(34,211,238,0.15)',  color:'#67E8F9' },
      'E-Learning':{ bg:'rgba(201,168,76,0.18)',  color:'#FCD34D' },
      Baru:        { bg:'rgba(34,211,238,0.12)',  color:'#67E8F9' },
      Eksisting:   { bg:'rgba(255,255,255,0.07)', color:'#8A9BC4' },
    },
  }
}

/* ─── Constants ──────────────────────────────────────────────── */
const BULAN_FULL  = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const BULAN_SHORT = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const PAL_L = ['#003087','#9B7A2A','#0891B2','#6366F1','#059669','#DC2626']
const PAL_D = ['#60A5FA','#C9A84C','#22D3EE','#A78BFA','#34D399','#F87171']
const PAGE_SIZE = 12

const fmtNum = n => {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'jt'
  if (n >= 1e3) return (n/1e3).toFixed(1)+'rb'
  return (n??0).toLocaleString('id')
}

/* ─── Hooks ──────────────────────────────────────────────────── */
function useAnimatedNumber(target, dur=700) {
  const [val, setVal] = useState(0)
  const raf = useRef(null), prev = useRef(0)
  useEffect(() => {
    const from = prev.current; prev.current = target
    const t0 = performance.now()
    cancelAnimationFrame(raf.current)
    const step = now => {
      const p = Math.min((now-t0)/dur, 1), e = 1-Math.pow(1-p,3)
      setVal(Math.round(from+(target-from)*e))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}

/* ─── Tooltip ────────────────────────────────────────────────── */
function CTip({ active, payload, label, theme }) {
  const th = T[theme]
  if (!active||!payload?.length) return null
  return (
    <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:10,padding:'10px 14px',boxShadow:th.shadowMd,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <p style={{color:th.text,fontSize:13,fontWeight:700,marginBottom:6}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color||th.textMuted,fontSize:12,margin:'2px 0'}}>
          {p.name}: <span style={{color:th.text,fontWeight:600}}>{typeof p.value==='number'?p.value.toLocaleString('id'):p.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KPICard({ label, value, colorKey, icon, bgChar, delay=0, theme }) {
  const th = T[theme]
  const v = useAnimatedNumber(value)
  const c = {
    gold: { accent:th.gold,  bg:th.goldLight, border: theme==='light'?'rgba(155,122,42,0.3)':'rgba(201,168,76,0.35)' },
    teal: { accent:th.teal,  bg:th.tealLight, border: theme==='light'?'rgba(8,145,178,0.25)':'rgba(34,211,238,0.3)'  },
    blue: { accent:th.blue,  bg:th.blueLight, border: theme==='light'?'rgba(29,78,216,0.2)':'rgba(96,165,250,0.3)'   },
  }[colorKey]
  return (
    <div style={{flex:1,minWidth:180,background:th.surface,border:`1px solid ${c.border}`,borderRadius:14,padding:'22px 24px 18px',position:'relative',overflow:'hidden',boxShadow:th.shadow,animation:`fadeUp .45s ease ${delay}s both`,transition:'transform .2s,box-shadow .2s',cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=th.shadowMd}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=th.shadow}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${c.accent},transparent)`,borderRadius:'14px 14px 0 0'}}/>
      <div style={{width:42,height:42,borderRadius:10,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:14}}>{icon}</div>
      <div style={{fontSize:34,fontWeight:800,color:c.accent,lineHeight:1,marginBottom:5,letterSpacing:'-1px'}}>{fmtNum(v)}</div>
      <div style={{fontSize:11,color:th.textMuted,textTransform:'uppercase',letterSpacing:'0.9px',fontWeight:600}}>{label}</div>
      <div style={{position:'absolute',bottom:-20,right:12,fontSize:80,fontWeight:900,opacity:.04,color:c.accent,lineHeight:1,pointerEvents:'none',userSelect:'none'}}>{bgChar}</div>
    </div>
  )
}

/* ─── Chart Card ─────────────────────────────────────────────── */
function ChartCard({ title, subtitle, wide, children, theme, accent }) {
  const th = T[theme]
  return (
    <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,padding:'20px 22px',gridColumn:wide?'1 / -1':undefined,boxShadow:th.shadow,animation:'fadeUp .5s ease .2s both',position:'relative',overflow:'hidden'}}>
      {accent && <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${th.primary},${th.gold})`}}/>}
      <div style={{paddingLeft:accent?10:0}}>
        <div style={{fontWeight:700,fontSize:14,color:th.text,marginBottom:2}}>{title}</div>
        <div style={{fontSize:11,color:th.textMuted,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>{subtitle}</div>
        {children}
      </div>
    </div>
  )
}

/* ─── Badge ──────────────────────────────────────────────────── */
function Badge({ text, theme }) {
  const s = T[theme].badge[text] || { bg:'rgba(0,0,0,0.05)', color:T[theme].textMuted }
  return <span style={{background:s.bg,color:s.color,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{text}</span>
}

/* ─── Icons ──────────────────────────────────────────────────── */
const SunIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const MoonIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>

/* ─── Filter Config ──────────────────────────────────────────── */
const FILTER_CONFIG = [
  { id:'bulan', options:[{v:'',l:'Semua Bulan'},...Array.from({length:12},(_,i)=>({v:String(i+1),l:BULAN_FULL[i+1]}))] },
  { id:'penyelenggara', options:[{v:'',l:'Semua Penyelenggara'},...['Pusdiklat AP','BDK Cimahi','BDK Yogyakarta','BDK Pontianak','BDK Makassar','BDK Medan','BDK Pekanbaru','BDK Palembang','BDK Malang','BDK Denpasar','BDK Manado','BDK Balikpapan'].map(v=>({v,l:v}))] },
  { id:'metode', options:[{v:'',l:'Semua Metode'},{v:'Klasikal',l:'Klasikal'},{v:'PJJ',l:'PJJ'},{v:'E-Learning',l:'E-Learning'}] },
  { id:'tim_kerja', options:[{v:'',l:'Semua Tim Kerja'},{v:'Tim Kerja AP01',l:'Tim Kerja AP01'},{v:'Tim Kerja AP02',l:'Tim Kerja AP02'},{v:'Tim Kerja AP03',l:'Tim Kerja AP03'},{v:'Tim Kerja AP04',l:'Tim Kerja AP04'}] },
]

/* ─── Peak Season Chart ──────────────────────────────────────── */
function PeakSeasonChart({ data, theme }) {
  const th = T[theme]
  const PAL = theme==='light'?PAL_L:PAL_D

  // compute avg & categorize
  const values = data.map(d=>d.frekuensi).filter(v=>v>0)
  const avg    = values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : 0
  const max    = Math.max(...values, 1)
  const high   = Math.round(avg * 1.2)
  const low    = Math.round(avg * 0.8)

  const colored = data.map(d => ({
    ...d,
    fill: d.frekuensi >= high ? (theme==='light'?'#DC2626':'#F87171')
        : d.frekuensi <= low && d.frekuensi > 0 ? (theme==='light'?'#0891B2':'#22D3EE')
        : (theme==='light'?'#1D4ED8':'#60A5FA'),
    season: d.frekuensi >= high ? 'peak'
          : d.frekuensi <= low && d.frekuensi > 0 ? 'low'
          : 'normal',
  }))

  const CustomBar = (props) => {
    const { x, y, width, height, index } = props
    const item = colored[index]
    if (!item || height <= 0) return null
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={item.fill} rx={5} ry={5}/>
        {item.season==='peak' && (
          <text x={x+width/2} y={y-6} textAnchor="middle" fontSize={9} fontWeight={700} fill={theme==='light'?'#DC2626':'#F87171'}>▲</text>
        )}
        {item.season==='low' && item.frekuensi>0 && (
          <text x={x+width/2} y={y-6} textAnchor="middle" fontSize={9} fontWeight={700} fill={theme==='light'?'#0891B2':'#22D3EE'}>▼</text>
        )}
      </g>
    )
  }

  const peakMonths = colored.filter(d=>d.season==='peak').map(d=>d.name)
  const lowMonths  = colored.filter(d=>d.season==='low').map(d=>d.name)

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={colored} margin={{top:16,right:8,left:-10,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke={th.gridLine}/>
          <XAxis dataKey="name" tick={{fill:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}} axisLine={false} tickLine={false}/>
          <Tooltip content={<CTip theme={theme}/>} cursor={{fill:theme==='light'?'rgba(0,48,135,0.04)':'rgba(255,255,255,0.04)'}}/>
          <ReferenceLine y={avg}  stroke={th.gold}  strokeDasharray="4 4" strokeWidth={1.5} label={{value:`Rata-rata: ${avg}`,position:'insideTopRight',fill:th.gold,fontSize:10,fontWeight:600}}/>
          <ReferenceLine y={high} stroke={theme==='light'?'#DC2626':'#F87171'} strokeDasharray="3 3" strokeWidth={1} label={{value:'Batas Peak',position:'insideTopRight',fill:theme==='light'?'#DC2626':'#F87171',fontSize:9}}/>
          <ReferenceLine y={low}  stroke={theme==='light'?'#0891B2':'#22D3EE'} strokeDasharray="3 3" strokeWidth={1} label={{value:'Batas Low',position:'insideBottomRight',fill:theme==='light'?'#0891B2':'#22D3EE',fontSize:9}}/>
          <Bar dataKey="frekuensi" name="Frekuensi" shape={<CustomBar/>}/>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12,padding:'10px 14px',background:theme==='light'?'rgba(0,48,135,0.03)':'rgba(255,255,255,0.03)',borderRadius:8,border:`1px solid ${th.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:theme==='light'?'#DC2626':'#F87171'}}/>
          <span style={{fontSize:11,color:th.textMuted,fontWeight:500}}>
            🔥 Peak Season {peakMonths.length>0?`(${peakMonths.join(', ')})`:'-'}
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:theme==='light'?'#1D4ED8':'#60A5FA'}}/>
          <span style={{fontSize:11,color:th.textMuted,fontWeight:500}}>Normal Season</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:theme==='light'?'#0891B2':'#22D3EE'}}/>
          <span style={{fontSize:11,color:th.textMuted,fontWeight:500}}>
            ❄️ Low Season {lowMonths.length>0?`(${lowMonths.join(', ')})`:'-'}
          </span>
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:24,height:2,background:th.gold,borderRadius:1}}/>
          <span style={{fontSize:11,color:th.textMuted}}>Rata-rata: {avg} pelatihan/bulan</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  // default: light mode
  const [theme, setTheme]   = useState('light')
  const [filters, setFilters] = useState({bulan:'',penyelenggara:'',metode:'',tim_kerja:''})
  const [page, setPage]       = useState(1)

  const th  = T[theme]
  const PAL = theme==='light' ? PAL_L : PAL_D

  /* Filtered data */
  const filtered = useMemo(() => RAW_DATA.filter(d => {
    if (filters.bulan         && String(d.bulan)!==filters.bulan)           return false
    if (filters.penyelenggara && d.penyelenggara!==filters.penyelenggara)   return false
    if (filters.metode        && d.metode!==filters.metode)                 return false
    if (filters.tim_kerja     && d.tim_kerja!==filters.tim_kerja)           return false
    return true
  }), [filters])

  /* KPIs */
  const totalPeserta   = useMemo(() => filtered.reduce((s,d)=>s+d.total_peserta,0),  [filtered])
  const totalJamlat    = useMemo(() => filtered.reduce((s,d)=>s+d.total_jamlator,0), [filtered])
  const totalPelatihan = filtered.length

  /* Monthly data for charts */
  const monthlyData = useMemo(() => Array.from({length:12},(_,i)=>{
    const m=i+1, rows=filtered.filter(d=>d.bulan===m)
    return {
      name:      BULAN_SHORT[m],
      bulanFull: BULAN_FULL[m],
      peserta:   rows.reduce((s,d)=>s+d.total_peserta,0),
      jamlat:    rows.reduce((s,d)=>s+d.total_jamlator,0),
      frekuensi: rows.length,
      baru:      rows.filter(d=>d.baru_eksisting==='Baru').length,
      eksisting: rows.filter(d=>d.baru_eksisting==='Eksisting').length,
    }
  }), [filtered])

  /* Pie data */
  const metodeData  = useMemo(()=>{ const g={}; filtered.forEach(d=>{g[d.metode]=(g[d.metode]||0)+d.total_peserta}); return Object.entries(g).map(([n,v])=>({name:n,value:v})) },[filtered])
  const rumpunData  = useMemo(()=>{ const g={}; filtered.forEach(d=>{const k=d.rumpun.trim();g[k]=(g[k]||0)+d.total_peserta}); return Object.entries(g).map(([n,v])=>({name:n,value:v})) },[filtered])
  const penyelData  = useMemo(()=>{ const g={}; filtered.forEach(d=>{g[d.penyelenggara]=(g[d.penyelenggara]||0)+d.total_peserta}); return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({name:n,value:v})) },[filtered])
  const timKerjaData= useMemo(()=>{ const g={}; filtered.forEach(d=>{if(d.tim_kerja){g[d.tim_kerja]=(g[d.tim_kerja]||0)+d.total_peserta}}); return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({name:n,value:v})) },[filtered])

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE))
  const pageData   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const setFilter  = (k,v) => { setFilters(p=>({...p,[k]:v})); setPage(1) }
  const resetAll   = () => { setFilters({bulan:'',penyelenggara:'',metode:'',tim_kerja:''}); setPage(1) }

  /* Exports */
  const exportCSV = () => {
    const rows = [['No','Nama Program','Bulan','Metode','Penyelenggara','Rumpun','Tim Kerja','Total Peserta','Total Jamlat','Status'],
      ...filtered.map((d,i)=>[i+1,d.nama,BULAN_FULL[d.bulan]||d.bulan,d.metode,d.penyelenggara,d.rumpun.trim(),d.tim_kerja,d.total_peserta,d.total_jamlator,d.baru_eksisting])]
    const csv  = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'),{href:url,download:'kalender_pembelajaran_2026.csv'}).click()
    URL.revokeObjectURL(url)
  }
  const exportExcel = () => {
    const wsData = [['No','Nama Program','Bulan','Metode','Penyelenggara','Rumpun','Tim Kerja','Total Peserta','Total Jamlat','Status'],
      ...filtered.map((d,i)=>[i+1,d.nama,BULAN_FULL[d.bulan]||d.bulan,d.metode,d.penyelenggara,d.rumpun.trim(),d.tim_kerja,d.total_peserta,d.total_jamlator,d.baru_eksisting])]
    const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols']=[{wch:5},{wch:60},{wch:12},{wch:12},{wch:20},{wch:20},{wch:16},{wch:14},{wch:14},{wch:12}]
    XLSX.utils.book_append_sheet(wb,ws,'Data Pelatihan')
    XLSX.writeFile(wb,'Kalender_Pembelajaran_2026.xlsx')
  }

  /* Shared styles */
  const axTick   = { fill:th.textMuted, fontSize:11, fontFamily:'Plus Jakarta Sans,sans-serif' }
  const gridSt   = { stroke:th.gridLine }
  const cr       = theme==='light'?'rgba(0,48,135,0.04)':'rgba(255,255,255,0.04)'
  const selStyle = { background:th.inputBg,border:`1px solid ${th.border}`,color:th.text,padding:'8px 12px',borderRadius:8,fontSize:13,cursor:'pointer',outline:'none',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'border-color .15s' }
  const btnBase  = { fontFamily:'Plus Jakarta Sans,sans-serif',cursor:'pointer',display:'flex',alignItems:'center',gap:6,borderRadius:8,fontSize:13,fontWeight:600,transition:'all .2s',border:'none' }
  const rowBd    = `1px solid ${th.rowBorder}`
  const CT = (props) => <CTip {...props} theme={theme}/>

  return (
    <div style={{background:th.bg,minHeight:'100vh',color:th.text,fontFamily:'Plus Jakarta Sans,sans-serif',transition:'background .3s,color .3s'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${th.bgSub}}
        ::-webkit-scrollbar-thumb{background:${th.scrollbar};border-radius:3px}
        *{box-sizing:border-box}
        select option{background:${th.surface}}
        select:focus{border-color:${th.primary}!important;outline:none}
        @media(max-width:900px){.cg{grid-template-columns:1fr!important}.cg>*{grid-column:1!important}.kr{flex-direction:column!important}.hdr{flex-wrap:wrap!important}}
        @media print{header{position:relative!important}.np{display:none!important}}
      `}</style>

      {/* Top bar */}
      <div style={{height:4,background:'linear-gradient(90deg,#003087 0%,#C9A84C 50%,#003087 100%)'}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:th.headerBg,backdropFilter:'blur(20px)',borderBottom:`1px solid ${th.border}`,boxShadow:theme==='light'?'0 2px 20px rgba(0,48,135,0.1)':'0 2px 24px rgba(0,0,0,0.5)'}}>
        <div className="hdr" style={{padding:'13px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <KemenkeuLogo size={52} mode={theme}/>
            <div>
              <div style={{fontSize:11,color:th.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:3}}>Kementerian Keuangan Republik Indonesia</div>
              <h1 style={{fontWeight:800,fontSize:19,letterSpacing:'-.3px',margin:0,color:th.text,lineHeight:1.2}}>Dashboard Kalender Pembelajaran 2026</h1>
              <div style={{fontSize:11,color:th.textMuted,marginTop:2}}>Pusat Pendidikan dan Pelatihan Anggaran &amp; Perbendaharaan · BPPK</div>
            </div>
          </div>
          <div className="np" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            {/* Theme toggle */}
            <button onClick={()=>setTheme(t=>t==='light'?'dark':'light')} style={{...btnBase,background:theme==='light'?'rgba(0,48,135,0.07)':'rgba(255,255,255,0.08)',border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontSize:12,fontWeight:500}}>
              {theme==='light'?<><MoonIcon/>Mode Gelap</>:<><SunIcon/>Mode Terang</>}
            </button>
            <div style={{width:1,height:28,background:th.border}}/>
            <button onClick={exportCSV}   style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontWeight:500}}>⬇ CSV</button>
            <button onClick={exportExcel} style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontWeight:500}}>⬇ Excel</button>
            <button onClick={()=>window.print()} style={{...btnBase,background:th.primary,color:'#fff',padding:'8px 18px',boxShadow:`0 2px 12px rgba(0,48,135,0.3)`}}>🖨 Print</button>
          </div>
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.gold}55,transparent)`}}/>
        <div style={{padding:'7px 28px',background:theme==='light'?'rgba(0,48,135,0.03)':'rgba(0,0,0,0.18)',display:'flex',alignItems:'center',gap:0,flexWrap:'wrap'}}>
          {['📅 Tahun Anggaran 2026','📍 Jakarta, Indonesia','🏛 Badan Pendidikan dan Pelatihan Keuangan (BPPK)'].map((item,i)=>(
            <span key={i} style={{display:'flex',alignItems:'center'}}>
              {i>0&&<span style={{color:th.border,margin:'0 14px'}}>|</span>}
              <span style={{fontSize:11,color:th.textMuted}}>{item}</span>
            </span>
          ))}
        </div>
      </header>

      <div style={{position:'relative',zIndex:1,padding:'24px 28px',maxWidth:1560,margin:'0 auto'}}>

        {/* FILTERS */}
        <div className="np" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:'14px 20px',marginBottom:24,boxShadow:th.shadow,animation:'fadeUp .4s ease both',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${th.primary},${th.gold})`}}/>
          <span style={{fontSize:11,fontWeight:700,color:th.textMuted,textTransform:'uppercase',letterSpacing:'1px',whiteSpace:'nowrap',marginLeft:8}}>🔍 Filter :</span>
          {FILTER_CONFIG.map(fc=>(
            <select key={fc.id} value={filters[fc.id]} onChange={e=>setFilter(fc.id,e.target.value)} style={selStyle}>
              {fc.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <div style={{width:1,height:28,background:th.border}}/>
          <button onClick={resetAll} style={{...btnBase,background:'transparent',border:`1px solid ${th.border}`,color:th.textMuted,padding:'7px 14px',fontSize:12,fontWeight:500}}>✕ Reset</button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:th.teal,animation:'pulse 2s ease infinite'}}/>
            <span style={{fontSize:12,color:th.textMuted,fontWeight:600}}>{filtered.length.toLocaleString('id')} hasil</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="kr" style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <KPICard label="Total Peserta"   value={totalPeserta}   colorKey="gold" icon="👥" bgChar="P" delay={0.05} theme={theme}/>
          <KPICard label="Total Jamlat"    value={totalJamlat}    colorKey="teal" icon="⏱" bgChar="J" delay={0.10} theme={theme}/>
          <KPICard label="Total Pelatihan" value={totalPelatihan} colorKey="blue" icon="📋" bgChar="T" delay={0.15} theme={theme}/>
        </div>

        {/* CHARTS ROW 1 */}
        <div className="cg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

          {/* Bar — Peserta per Bulan */}
          <ChartCard title="Peserta per Bulan" subtitle="Distribusi jumlah peserta per bulan" theme={theme}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Bar dataKey="peserta" name="Peserta" fill={th.primary} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Donut — Metode */}
          <ChartCard title="Distribusi Metode Pembelajaran" subtitle="Klasikal · PJJ · E-Learning" theme={theme}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={metodeData} cx="45%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {metodeData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:12,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        {/* PEAK SEASON CHART — full width */}
        <div style={{marginBottom:16}}>
          <ChartCard title="Peak Season & Low Season Pelatihan" subtitle="Frekuensi jumlah program per bulan — merah = peak · biru = low · abu = normal" wide theme={theme} accent>
            <PeakSeasonChart data={monthlyData} theme={theme}/>
          </ChartCard>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="cg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

          {/* Area — Tren Jamlat */}
          <ChartCard title="Tren Jam Latih per Bulan" subtitle="Total jam latih kumulatif bulanan" wide theme={theme}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={th.primary} stopOpacity={theme==='light'?0.2:0.35}/>
                    <stop offset="95%" stopColor={th.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>}/>
                <Area type="monotone" dataKey="jamlat" name="Jamlat" stroke={th.primary} strokeWidth={2.5} fill="url(#blueGrad)" dot={{fill:th.primary,r:3}} activeDot={{r:6,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Horizontal Bar — Penyelenggara */}
          <ChartCard title="Peserta per Penyelenggara" subtitle="Distribusi peserta antar lembaga" theme={theme}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={penyelData} layout="vertical" margin={{top:0,right:16,left:90,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt} horizontal={false}/>
                <XAxis type="number" tick={{...axTick,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:th.textDim,fontSize:10,fontFamily:'Plus Jakarta Sans'}} axisLine={false} tickLine={false} width={85}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Bar dataKey="value" name="Peserta" fill={th.gold} radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Pie — Rumpun */}
          <ChartCard title="Distribusi Rumpun" subtitle="Anggaran · Perbendaharaan · Perimbangan · Akuntansi" theme={theme}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={rumpunData} cx="45%" cy="50%" outerRadius={90} dataKey="value" paddingAngle={2}>
                  {rumpunData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Bar — Tim Kerja */}
          <ChartCard title="Peserta per Tim Kerja" subtitle="Distribusi peserta per tim kerja Pusdiklat AP" theme={theme}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timKerjaData} margin={{top:4,right:16,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={{...axTick,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Bar dataKey="value" name="Peserta" radius={[5,5,0,0]}>
                  {timKerjaData.map((_,i)=><Cell key={i} fill={PAL[i]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Stacked — Baru vs Eksisting */}
          <ChartCard title="Program Baru vs Eksisting per Bulan" subtitle="Komposisi status program pembelajaran" wide theme={theme}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:12,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
                <Bar dataKey="baru"      name="Baru"      stackId="a" fill={th.teal}/>
                <Bar dataKey="eksisting" name="Eksisting" stackId="a" fill={theme==='light'?'rgba(0,48,135,0.15)':'rgba(255,255,255,0.1)'} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        {/* TABLE */}
        <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,overflow:'hidden',boxShadow:th.shadow,animation:'fadeUp .5s ease .3s both',marginBottom:24}}>
          <div style={{padding:'16px 22px',borderBottom:`1px solid ${th.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:theme==='light'?'rgba(0,48,135,0.03)':'rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:4,height:32,background:`linear-gradient(180deg,${th.primary},${th.gold})`,borderRadius:2}}/>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:th.text}}>Data Program Pelatihan</div>
                <div style={{fontSize:11,color:th.textMuted,marginTop:1}}>Detail seluruh program pembelajaran Pusdiklat AP 2026</div>
              </div>
            </div>
            <span style={{fontSize:12,color:th.textMuted,background:th.surface2,padding:'4px 12px',borderRadius:20,border:`1px solid ${th.border}`}}>{filtered.length.toLocaleString('id')} entri</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>
                  {['No','Nama Program','Bulan','Metode','Penyelenggara','Tim Kerja','Peserta','Jamlat','Status'].map(h=>(
                    <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:'0.7px',color:th.textMuted,fontWeight:700,background:th.surface2,borderBottom:`1px solid ${th.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((d,i)=>(
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=th.rowHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{transition:'background .15s'}}>
                    <td style={{padding:'10px 16px',color:th.textMuted,borderBottom:rowBd}}>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td title={d.nama} style={{padding:'10px 16px',color:th.text,fontWeight:500,maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderBottom:rowBd}}>{d.nama}</td>
                    <td style={{padding:'10px 16px',color:th.textDim,borderBottom:rowBd,whiteSpace:'nowrap'}}>{BULAN_FULL[d.bulan]}</td>
                    <td style={{padding:'10px 16px',borderBottom:rowBd}}><Badge text={d.metode} theme={theme}/></td>
                    <td style={{padding:'10px 16px',color:th.textDim,borderBottom:rowBd,whiteSpace:'nowrap'}}>{d.penyelenggara}</td>
                    <td style={{padding:'10px 16px',color:th.textDim,borderBottom:rowBd,whiteSpace:'nowrap'}}>{d.tim_kerja||'-'}</td>
                    <td style={{padding:'10px 16px',textAlign:'right',color:th.gold,fontWeight:700,borderBottom:rowBd}}>{d.total_peserta.toLocaleString('id')}</td>
                    <td style={{padding:'10px 16px',textAlign:'right',color:th.teal,fontWeight:600,borderBottom:rowBd}}>{d.total_jamlator.toLocaleString('id')}</td>
                    <td style={{padding:'10px 16px',borderBottom:rowBd}}><Badge text={d.baru_eksisting} theme={theme}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 22px',borderTop:`1px solid ${th.border}`,background:theme==='light'?'rgba(0,48,135,0.02)':'rgba(0,0,0,0.1)'}}>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:page<=1?th.textMuted:th.text,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:page<=1?'default':'pointer',opacity:page<=1?0.4:1}}>← Sebelumnya</button>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:12,color:th.textMuted}}>Halaman</span>
              <span style={{fontSize:13,fontWeight:700,background:th.primary,color:'#fff',padding:'3px 10px',borderRadius:6}}>{page}</span>
              <span style={{fontSize:12,color:th.textMuted}}>dari {totalPages}</span>
            </div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:page>=totalPages?th.textMuted:th.text,padding:'7px 16px',fontSize:12,fontWeight:500,cursor:page>=totalPages?'default':'pointer',opacity:page>=totalPages?0.4:1}}>Berikutnya →</button>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'18px 24px',background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,boxShadow:th.shadow}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <KemenkeuLogo size={34} mode={theme}/>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:th.text}}>Kementerian Keuangan Republik Indonesia</div>
              <div style={{fontSize:11,color:th.textMuted}}>Pusdiklat Anggaran &amp; Perbendaharaan · BPPK · 2026</div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:th.textMuted}}>Dashboard Kalender Pembelajaran 2026</div>
            <div style={{fontSize:13,fontWeight:700,color:th.gold,fontStyle:'italic'}}>Nagara Dana Rakca</div>
          </div>
        </div>

      </div>
    </div>
  )
}
