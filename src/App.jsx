import { useState, useMemo, useRef, useEffect } from 'react'
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
         CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import * as XLSX from 'xlsx'
import RAW_DATA from './data.js'
import KemenkeuLogo from './KemenkeuLogo.jsx'

/* ─── THEMES ──────────────────────────────────────────────── */
const TH = {
  light: {
    bg:'#F0F5FF', bgSub:'#E4ECF9', surface:'#FFFFFF', surface2:'#EEF3FB',
    border:'rgba(0,48,135,0.1)', text:'#0A1628', textMuted:'#4A6094', textDim:'#2D4070',
    headerBg:'rgba(255,255,255,0.98)',
    gold:'#9B7A2A', goldLight:'rgba(155,122,42,0.1)',
    blue:'#1D4ED8', blueLight:'rgba(29,78,216,0.1)',
    teal:'#0891B2', tealLight:'rgba(8,145,178,0.1)',
    primary:'#003087',
    shadow:'0 2px 16px rgba(0,48,135,0.09)', shadowMd:'0 6px 28px rgba(0,48,135,0.13)',
    scrollbar:'#CBD5E1', inputBg:'#EEF3FB', gridLine:'rgba(0,48,135,0.06)',
    rowHover:'rgba(0,48,135,0.025)', rowBorder:'rgba(0,48,135,0.05)',
    peakColor:'#DC2626', lowColor:'#0891B2', normColor:'#1D4ED8',
    placeholder:'rgba(0,48,135,0.08)',
    badge:{
      Klasikal:    {bg:'rgba(29,78,216,0.1)',   color:'#1D4ED8'},
      PJJ:         {bg:'rgba(8,145,178,0.1)',   color:'#0891B2'},
      'E-Learning':{bg:'rgba(155,122,42,0.12)', color:'#9B7A2A'},
      Baru:        {bg:'rgba(8,145,178,0.08)',  color:'#0891B2'},
      Eksisting:   {bg:'rgba(0,48,135,0.06)',   color:'#4A6094'},
    },
  },
  dark: {
    bg:'#0D1B3E', bgSub:'#0A1428', surface:'#132050', surface2:'#1A2A60',
    border:'rgba(255,255,255,0.08)', text:'#F0F4FF', textMuted:'#8A9BC4', textDim:'#B0BFDF',
    headerBg:'rgba(13,27,62,0.96)',
    gold:'#C9A84C', goldLight:'rgba(201,168,76,0.15)',
    blue:'#60A5FA', blueLight:'rgba(96,165,250,0.15)',
    teal:'#22D3EE', tealLight:'rgba(34,211,238,0.12)',
    primary:'#3B82F6',
    shadow:'0 4px 24px rgba(0,0,0,0.35)', shadowMd:'0 8px 32px rgba(0,0,0,0.45)',
    scrollbar:'#1A2A60', inputBg:'#1A2A60', gridLine:'rgba(255,255,255,0.05)',
    rowHover:'rgba(255,255,255,0.03)', rowBorder:'rgba(255,255,255,0.04)',
    peakColor:'#F87171', lowColor:'#22D3EE', normColor:'#60A5FA',
    placeholder:'rgba(255,255,255,0.06)',
    badge:{
      Klasikal:    {bg:'rgba(96,165,250,0.18)', color:'#93C5FD'},
      PJJ:         {bg:'rgba(34,211,238,0.15)', color:'#67E8F9'},
      'E-Learning':{bg:'rgba(201,168,76,0.18)', color:'#FCD34D'},
      Baru:        {bg:'rgba(34,211,238,0.12)', color:'#67E8F9'},
      Eksisting:   {bg:'rgba(255,255,255,0.07)',color:'#8A9BC4'},
    },
  }
}

const BULAN_FULL  = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const BULAN_SHORT = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const PAL_L = ['#003087','#9B7A2A','#0891B2','#6366F1','#059669','#DC2626']
const PAL_D = ['#60A5FA','#C9A84C','#22D3EE','#A78BFA','#34D399','#F87171']
const PAGE_SIZE = 12

const fmtNum = n => n>=1e6?(n/1e6).toFixed(1)+'jt':n>=1e3?(n/1e3).toFixed(1)+'rb':(n??0).toLocaleString('id')

/* ─── Animated number ─────────────────────────────────────── */
function useAnimatedNumber(target, dur=700) {
  const [val,setVal]=useState(0), raf=useRef(null), prev=useRef(0)
  useEffect(()=>{
    const from=prev.current; prev.current=target
    const t0=performance.now(); cancelAnimationFrame(raf.current)
    const step=now=>{ const p=Math.min((now-t0)/dur,1),e=1-Math.pow(1-p,3); setVal(Math.round(from+(target-from)*e)); if(p<1) raf.current=requestAnimationFrame(step) }
    raf.current=requestAnimationFrame(step)
    return ()=>cancelAnimationFrame(raf.current)
  },[target])
  return val
}

/* ─── Tooltip ─────────────────────────────────────────────── */
function CTip({active,payload,label,th}){
  if(!active||!payload?.length) return null
  return(
    <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:10,padding:'10px 14px',boxShadow:th.shadowMd,fontFamily:'Plus Jakarta Sans,sans-serif'}}>
      <p style={{color:th.text,fontSize:13,fontWeight:700,marginBottom:6}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||th.textMuted,fontSize:12,margin:'2px 0'}}>{p.name}: <span style={{color:th.text,fontWeight:600}}>{typeof p.value==='number'?p.value.toLocaleString('id'):p.value}</span></p>)}
    </div>
  )
}

/* ─── KPI Card ────────────────────────────────────────────── */
function KPICard({label,value,colorKey,icon,bgChar,delay=0,th}){
  const v=useAnimatedNumber(value)
  const c={
    gold:{accent:th.gold,  bg:th.goldLight, bd:'rgba(155,122,42,0.3)'},
    teal:{accent:th.teal,  bg:th.tealLight, bd:'rgba(8,145,178,0.25)'},
    blue:{accent:th.blue,  bg:th.blueLight, bd:'rgba(29,78,216,0.2)'},
  }[colorKey]
  return(
    <div style={{flex:1,minWidth:180,background:th.surface,border:`1px solid ${c.bd}`,borderRadius:14,padding:'22px 24px 18px',position:'relative',overflow:'hidden',boxShadow:th.shadow,animation:`fadeUp .45s ease ${delay}s both`,transition:'transform .2s,box-shadow .2s',cursor:'default'}}
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

/* ─── Chart Card ──────────────────────────────────────────── */
function ChartCard({title,subtitle,wide,accent,children,th}){
  return(
    <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,padding:'20px 22px',gridColumn:wide?'1/-1':undefined,boxShadow:th.shadow,position:'relative',overflow:'hidden',animation:'fadeUp .5s ease .2s both'}}>
      {accent&&<div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${th.primary},${th.gold})`}}/>}
      <div style={{paddingLeft:accent?10:0}}>
        <div style={{fontWeight:700,fontSize:14,color:th.text,marginBottom:2}}>{title}</div>
        <div style={{fontSize:11,color:th.textMuted,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>{subtitle}</div>
        {children}
      </div>
    </div>
  )
}

/* ─── Badge ───────────────────────────────────────────────── */
function Badge({text,th}){
  const s=th.badge[text]||{bg:'rgba(0,0,0,0.05)',color:th.textMuted}
  return <span style={{background:s.bg,color:s.color,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{text}</span>
}

/* ─── Placeholder Cell ────────────────────────────────────── */
function PlaceholderCell({th}){
  return(
    <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:36,height:22,borderRadius:6,background:th.placeholder,fontSize:11,color:th.textMuted,fontStyle:'italic',letterSpacing:'0.3px'}}>
      —
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────── */
const SunIcon  = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const MoonIcon = ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>

/* ─── Peak Season Chart ───────────────────────────────────── */
function PeakSeasonChart({data,th}){
  const vals=data.map(d=>d.frekuensi).filter(v=>v>0)
  const avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0
  const high=Math.round(avg*1.2), low=Math.round(avg*0.8)
  const colored=data.map(d=>({...d,
    fill:d.frekuensi>=high?th.peakColor:d.frekuensi<=low&&d.frekuensi>0?th.lowColor:th.normColor,
    season:d.frekuensi>=high?'peak':d.frekuensi<=low&&d.frekuensi>0?'low':'normal',
  }))
  const CustomBar=({x,y,width,height,index})=>{
    const item=colored[index]; if(!item||height<=0) return null
    return(<g>
      <rect x={x} y={y} width={width} height={height} fill={item.fill} rx={5} ry={5}/>
      {item.season==='peak'&&<text x={x+width/2} y={y-6} textAnchor="middle" fontSize={9} fontWeight={700} fill={th.peakColor}>▲</text>}
      {item.season==='low'&&item.frekuensi>0&&<text x={x+width/2} y={y-6} textAnchor="middle" fontSize={9} fontWeight={700} fill={th.lowColor}>▼</text>}
    </g>)
  }
  const peakM=colored.filter(d=>d.season==='peak').map(d=>d.name)
  const lowM =colored.filter(d=>d.season==='low').map(d=>d.name)
  return(<div>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={colored} margin={{top:18,right:8,left:-10,bottom:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke={th.gridLine}/>
        <XAxis dataKey="name" tick={{fill:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}} axisLine={false} tickLine={false}/>
        <Tooltip content={<CTip th={th}/>} cursor={{fill:'rgba(0,0,0,0.03)'}}/>
        <ReferenceLine y={avg}  stroke={th.gold}      strokeDasharray="4 4" strokeWidth={1.5} label={{value:`Rata-rata: ${avg}`,position:'insideTopRight',fill:th.gold,fontSize:10,fontWeight:600}}/>
        <ReferenceLine y={high} stroke={th.peakColor} strokeDasharray="3 3" strokeWidth={1}   label={{value:'Batas Peak',position:'insideTopRight',fill:th.peakColor,fontSize:9}}/>
        <ReferenceLine y={low}  stroke={th.lowColor}  strokeDasharray="3 3" strokeWidth={1}   label={{value:'Batas Low',position:'insideBottomRight',fill:th.lowColor,fontSize:9}}/>
        <Bar dataKey="frekuensi" name="Frekuensi" shape={<CustomBar/>}/>
      </BarChart>
    </ResponsiveContainer>
    <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12,padding:'10px 14px',background:'rgba(0,48,135,0.025)',borderRadius:8,border:`1px solid ${th.border}`}}>
      {[{c:th.peakColor,l:`🔥 Peak Season${peakM.length?` (${peakM.join(', ')})`:': -'}`},{c:th.normColor,l:'Normal Season'},{c:th.lowColor,l:`❄️ Low Season${lowM.length?` (${lowM.join(', ')})`:': -'}`}].map((item,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:12,borderRadius:3,background:item.c,flexShrink:0}}/>
          <span style={{fontSize:11,color:th.textMuted,fontWeight:500}}>{item.l}</span>
        </div>
      ))}
      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
        <div style={{width:24,height:2,background:th.gold,borderRadius:1}}/>
        <span style={{fontSize:11,color:th.textMuted}}>Rata-rata: {avg} pelatihan/bulan</span>
      </div>
    </div>
  </div>)
}

/* ─── Filter Config ───────────────────────────────────────── */
const FILTER_CONFIG = [
  {id:'bulan',        options:[{v:'',l:'Semua Bulan'},        ...Array.from({length:12},(_,i)=>({v:String(i+1),l:BULAN_FULL[i+1]}))]},
  {id:'penyelenggara',options:[{v:'',l:'Semua Penyelenggara'},...['Pusdiklat AP','BDK Cimahi','BDK Yogyakarta','BDK Pontianak','BDK Makassar','BDK Medan','BDK Pekanbaru','BDK Palembang','BDK Malang','BDK Denpasar','BDK Manado','BDK Balikpapan'].map(v=>({v,l:v}))]},
  {id:'metode',       options:[{v:'',l:'Semua Metode'},{v:'Klasikal',l:'Klasikal'},{v:'PJJ',l:'PJJ'},{v:'E-Learning',l:'E-Learning'}]},
  {id:'tim_kerja',    options:[{v:'',l:'Semua Tim Kerja'},{v:'Tim Kerja AP01',l:'AP01'},{v:'Tim Kerja AP02',l:'AP02'},{v:'Tim Kerja AP03',l:'AP03'},{v:'Tim Kerja AP04',l:'AP04'}]},
]

/* ─── Table column definitions ────────────────────────────── */
const TABLE_COLS = [
  { key:'no',                label:'No',              align:'left',   w:48  },
  { key:'nama',              label:'Nama Program',    align:'left',   w:220 },
  { key:'bulan',             label:'Bulan',           align:'left',   w:90  },
  { key:'metode',            label:'Metode',          align:'left',   w:100 },
  { key:'penyelenggara',     label:'Penyelenggara',   align:'left',   w:120 },
  { key:'akt',               label:'Akt',             align:'center', w:50  },
  { key:'waktu_diklat',      label:'Waktu Diklat',    align:'left',   w:160 },
  { key:'tim_kerja',         label:'Tim Kerja',       align:'left',   w:100 },
  { key:'total_peserta',     label:'Peserta',         align:'right',  w:72  },
  { key:'realisasi_peserta', label:'Realisasi',       align:'right',  w:80  },
  { key:'lulus',             label:'L',               align:'right',  w:54  },
  { key:'tidak_lulus',       label:'TL',              align:'right',  w:54  },
  { key:'tms',               label:'TMS',             align:'right',  w:54  },
  { key:'baru_eksisting',    label:'Status',          align:'left',   w:80  },
]

/* ─── MAIN APP ────────────────────────────────────────────── */
export default function App(){
  const [theme, setTheme]    = useState('light')
  const [filters, setFilters]= useState({bulan:'',penyelenggara:'',metode:'',tim_kerja:''})
  const [page, setPage]      = useState(1)

  const th  = TH[theme]
  const PAL = theme==='light'?PAL_L:PAL_D

  const filtered = useMemo(()=>RAW_DATA.filter(d=>{
    if(filters.bulan         && String(d.bulan)!==filters.bulan)         return false
    if(filters.penyelenggara && d.penyelenggara!==filters.penyelenggara) return false
    if(filters.metode        && d.metode!==filters.metode)               return false
    if(filters.tim_kerja     && d.tim_kerja!==filters.tim_kerja)         return false
    return true
  }),[filters])

  const totalPeserta   = useMemo(()=>filtered.reduce((s,d)=>s+d.total_peserta,0),  [filtered])
  const totalJamlat    = useMemo(()=>filtered.reduce((s,d)=>s+d.total_jamlator,0), [filtered])
  const totalPelatihan = filtered.length

  const monthlyData = useMemo(()=>Array.from({length:12},(_,i)=>{
    const m=i+1, rows=filtered.filter(d=>d.bulan===m)
    return{name:BULAN_SHORT[m],peserta:rows.reduce((s,d)=>s+d.total_peserta,0),jamlat:rows.reduce((s,d)=>s+d.total_jamlator,0),frekuensi:rows.length,baru:rows.filter(d=>d.baru_eksisting==='Baru').length,eksisting:rows.filter(d=>d.baru_eksisting==='Eksisting').length}
  }),[filtered])

  const metodeData  = useMemo(()=>{const g={};filtered.forEach(d=>{g[d.metode]=(g[d.metode]||0)+d.total_peserta});return Object.entries(g).map(([n,v])=>({name:n,value:v}))},[filtered])
  const rumpunData  = useMemo(()=>{const g={};filtered.forEach(d=>{const k=d.rumpun.trim();g[k]=(g[k]||0)+d.total_peserta});return Object.entries(g).map(([n,v])=>({name:n,value:v}))},[filtered])
  const penyelData  = useMemo(()=>{const g={};filtered.forEach(d=>{g[d.penyelenggara]=(g[d.penyelenggara]||0)+d.total_peserta});return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({name:n,value:v}))},[filtered])
  const timKerjaData= useMemo(()=>{const g={};filtered.forEach(d=>{if(d.tim_kerja){g[d.tim_kerja]=(g[d.tim_kerja]||0)+d.total_peserta}});return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({name:n,value:v}))},[filtered])

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const pageData   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const setFilter  = (k,v)=>{setFilters(p=>({...p,[k]:v}));setPage(1)}
  const resetAll   = ()=>{setFilters({bulan:'',penyelenggara:'',metode:'',tim_kerja:''});setPage(1)}

  const exportExcel = ()=>{
    const wsData=[TABLE_COLS.map(c=>c.label),
      ...filtered.map((d,i)=>TABLE_COLS.map(c=>{
        if(c.key==='no')           return i+1
        if(c.key==='bulan')        return BULAN_FULL[d.bulan]||d.bulan
        if(c.key==='waktu_diklat') return d.mulai&&d.akhir?`${d.mulai} – ${d.akhir}`:''
        return d[c.key]??''
      }))]
    const wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols']=TABLE_COLS.map(c=>({wch:Math.round(c.w/6)}))
    XLSX.utils.book_append_sheet(wb,ws,'Data Pelatihan')
    XLSX.writeFile(wb,'Kalender_Pembelajaran_2026.xlsx')
  }
  const exportCSV = ()=>{
    const rows=[TABLE_COLS.map(c=>c.label),
      ...filtered.map((d,i)=>TABLE_COLS.map(c=>{
        if(c.key==='no')           return i+1
        if(c.key==='bulan')        return BULAN_FULL[d.bulan]||d.bulan
        if(c.key==='waktu_diklat') return d.mulai&&d.akhir?`${d.mulai} – ${d.akhir}`:''
        return d[c.key]??''
      }))]
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}))
    Object.assign(document.createElement('a'),{href:url,download:'kalender_pembelajaran_2026.csv'}).click()
    URL.revokeObjectURL(url)
  }

  const axTick   = {fill:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}
  const gridSt   = {stroke:th.gridLine}
  const cr       = 'rgba(0,48,135,0.04)'
  const selStyle = {background:th.inputBg,border:`1px solid ${th.border}`,color:th.text,padding:'8px 12px',borderRadius:8,fontSize:13,cursor:'pointer',outline:'none',fontFamily:'Plus Jakarta Sans,sans-serif'}
  const btnBase  = {fontFamily:'Plus Jakarta Sans,sans-serif',cursor:'pointer',display:'flex',alignItems:'center',gap:6,borderRadius:8,fontSize:13,fontWeight:600,transition:'all .2s',border:'none'}
  const rowBd    = `1px solid ${th.rowBorder}`
  const thStyle  = {padding:'10px 12px',textAlign:'left',fontSize:10,textTransform:'uppercase',letterSpacing:'0.7px',color:th.textMuted,fontWeight:700,background:th.surface2,borderBottom:`1px solid ${th.border}`,whiteSpace:'nowrap'}

  // Render a single table cell value
  const renderCell = (d, col, rowIdx) => {
    const isPlaceholder = (v) => v===null||v===undefined||v===''
    switch(col.key){
      case 'no':
        return <span style={{color:th.textMuted}}>{(page-1)*PAGE_SIZE+rowIdx+1}</span>
      case 'nama':
        return <span title={d.nama} style={{color:th.text,fontWeight:500,display:'block',maxWidth:210,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.nama}</span>
      case 'bulan':
        return <span style={{color:th.textDim,whiteSpace:'nowrap'}}>{BULAN_FULL[d.bulan]||'—'}</span>
      case 'metode':
        return <Badge text={d.metode} th={th}/>
      case 'penyelenggara':
        return <span style={{color:th.textDim,fontSize:12,whiteSpace:'nowrap'}}>{d.penyelenggara}</span>
      case 'akt':
        return <span style={{color:th.textDim,fontWeight:600,textAlign:'center',display:'block'}}>{d.akt||'—'}</span>
      case 'waktu_diklat':
        return d.mulai?(
          <div>
            <div style={{fontSize:12,color:th.primary,fontWeight:600,lineHeight:1.4,whiteSpace:'nowrap'}}>{d.mulai}</div>
            <div style={{fontSize:11,color:th.textMuted,lineHeight:1.4,whiteSpace:'nowrap'}}>s.d. {d.akhir}</div>
          </div>
        ):<span style={{color:th.textMuted}}>—</span>
      case 'tim_kerja':
        return <span style={{color:th.textDim,fontSize:12,whiteSpace:'nowrap'}}>{d.tim_kerja||'—'}</span>
      case 'total_peserta':
        return <span style={{color:th.gold,fontWeight:700}}>{d.total_peserta.toLocaleString('id')}</span>
      case 'realisasi_peserta':
        return isPlaceholder(d.realisasi_peserta)?<PlaceholderCell th={th}/>:<span style={{color:th.text,fontWeight:600}}>{d.realisasi_peserta}</span>
      case 'lulus':
        return isPlaceholder(d.lulus)?<PlaceholderCell th={th}/>:<span style={{color:'#059669',fontWeight:700}}>{d.lulus}</span>
      case 'tidak_lulus':
        return isPlaceholder(d.tidak_lulus)?<PlaceholderCell th={th}/>:<span style={{color:th.peakColor,fontWeight:700}}>{d.tidak_lulus}</span>
      case 'tms':
        return isPlaceholder(d.tms)?<PlaceholderCell th={th}/>:<span style={{color:th.gold,fontWeight:700}}>{d.tms}</span>
      case 'baru_eksisting':
        return <Badge text={d.baru_eksisting} th={th}/>
      default:
        return <span style={{color:th.textDim}}>{d[col.key]||'—'}</span>
    }
  }

  return(
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
        @media(max-width:900px){.cg{grid-template-columns:1fr!important}.cg>*{grid-column:1!important}.kr{flex-direction:column!important}}
        @media print{header{position:relative!important}.np{display:none!important}}
      `}</style>

      {/* Top gold-blue bar */}
      <div style={{height:4,background:'linear-gradient(90deg,#003087 0%,#C9A84C 50%,#003087 100%)'}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:th.headerBg,backdropFilter:'blur(20px)',borderBottom:`1px solid ${th.border}`,boxShadow:theme==='light'?'0 2px 20px rgba(0,48,135,0.1)':'0 2px 24px rgba(0,0,0,0.5)'}}>
        <div style={{padding:'13px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <KemenkeuLogo size={52}/>
            <div>
              <div style={{fontSize:11,color:th.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:3}}>Kementerian Keuangan Republik Indonesia</div>
              <h1 style={{fontWeight:800,fontSize:19,letterSpacing:'-.3px',margin:0,color:th.text,lineHeight:1.2}}>Dashboard Kalender Pembelajaran 2026</h1>
              <div style={{fontSize:11,color:th.textMuted,marginTop:2}}>Pusat Pendidikan dan Pelatihan Anggaran &amp; Perbendaharaan · BPPK</div>
            </div>
          </div>
          <div className="np" style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={()=>setTheme(t=>t==='light'?'dark':'light')} style={{...btnBase,background:theme==='light'?'rgba(0,48,135,0.07)':'rgba(255,255,255,0.08)',border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontSize:12,fontWeight:500}}>
              {theme==='light'?<><MoonIcon/>Mode Gelap</>:<><SunIcon/>Mode Terang</>}
            </button>
            <div style={{width:1,height:28,background:th.border}}/>
            <button onClick={exportCSV}          style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontWeight:500}}>⬇ CSV</button>
            <button onClick={exportExcel}        style={{...btnBase,background:th.surface2,border:`1px solid ${th.border}`,color:th.textDim,padding:'8px 14px',fontWeight:500}}>⬇ Excel</button>
            <button onClick={()=>window.print()} style={{...btnBase,background:th.primary,color:'#fff',padding:'8px 18px',boxShadow:'0 2px 12px rgba(0,48,135,0.3)'}}>🖨 Print</button>
          </div>
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.gold}55,transparent)`}}/>
        <div style={{padding:'7px 28px',background:theme==='light'?'rgba(0,48,135,0.03)':'rgba(0,0,0,0.18)',display:'flex',alignItems:'center',flexWrap:'wrap'}}>
          {['📅 Tahun Anggaran 2026','📍 Jakarta, Indonesia','🏛 Badan Pendidikan dan Pelatihan Keuangan (BPPK)'].map((item,i)=>(
            <span key={i} style={{display:'flex',alignItems:'center'}}>
              {i>0&&<span style={{color:th.border,margin:'0 14px'}}>|</span>}
              <span style={{fontSize:11,color:th.textMuted}}>{item}</span>
            </span>
          ))}
        </div>
      </header>

      <div style={{padding:'24px 28px',maxWidth:1600,margin:'0 auto'}}>

        {/* ── FILTERS ── */}
        <div className="np" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,padding:'14px 20px',marginBottom:24,boxShadow:th.shadow,animation:'fadeUp .4s ease both',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${th.primary},${th.gold})`}}/>
          <span style={{fontSize:11,fontWeight:700,color:th.textMuted,textTransform:'uppercase',letterSpacing:'1px',whiteSpace:'nowrap',marginLeft:8}}>🔍 Filter:</span>
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

        {/* ── KPIs ── */}
        <div className="kr" style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <KPICard label="Total Peserta"   value={totalPeserta}   colorKey="gold" icon="👥" bgChar="P" delay={0.05} th={th}/>
          <KPICard label="Total Jamlat"    value={totalJamlat}    colorKey="teal" icon="⏱" bgChar="J" delay={0.10} th={th}/>
          <KPICard label="Total Pelatihan" value={totalPelatihan} colorKey="blue" icon="📋" bgChar="T" delay={0.15} th={th}/>
        </div>

        {/* ── TABLE — posisi di bawah KPI ── */}
        <div style={{background:th.surface,border:`1px solid ${th.border}`,borderRadius:14,overflow:'hidden',boxShadow:th.shadow,marginBottom:24,animation:'fadeUp .5s ease .2s both'}}>

          {/* Table header bar */}
          <div style={{padding:'16px 22px',borderBottom:`1px solid ${th.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:theme==='light'?'rgba(0,48,135,0.03)':'rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:4,height:32,background:`linear-gradient(180deg,${th.primary},${th.gold})`,borderRadius:2}}/>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:th.text}}>Data Program Pelatihan</div>
                <div style={{fontSize:11,color:th.textMuted,marginTop:1}}>
                  Detail program pembelajaran Pusdiklat AP 2026 &nbsp;·&nbsp;
                  <span style={{color:th.gold,fontWeight:600}}>L/TL/TMS akan diupdate setelah pelaksanaan</span>
                </div>
              </div>
            </div>
            <span style={{fontSize:12,color:th.textMuted,background:th.surface2,padding:'4px 12px',borderRadius:20,border:`1px solid ${th.border}`}}>{filtered.length.toLocaleString('id')} entri</span>
          </div>

          {/* Column group header: realisasi section */}
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                {/* Group row */}
                <tr>
                  <th colSpan={9} style={{...thStyle,borderRight:`2px solid ${th.border}`}}></th>
                  <th colSpan={4} style={{...thStyle,textAlign:'center',background:theme==='light'?'rgba(0,48,135,0.06)':'rgba(255,255,255,0.05)',borderRight:`2px solid ${th.border}`,color:th.primary,fontSize:10}}>
                    Realisasi Peserta
                  </th>
                  <th colSpan={1} style={thStyle}></th>
                </tr>
                {/* Column labels */}
                <tr>
                  {TABLE_COLS.map((col,i)=>(
                    <th key={col.key} style={{
                      ...thStyle,
                      textAlign: col.align,
                      minWidth: col.w,
                      background: (i>=9&&i<=12) ? (theme==='light'?'rgba(0,48,135,0.04)':'rgba(255,255,255,0.04)') : th.surface2,
                      borderRight: i===8||i===12 ? `2px solid ${th.border}` : undefined,
                      // Color L=green, TL=red, TMS=gold
                      color: col.key==='lulus'?'#059669':col.key==='tidak_lulus'?th.peakColor:col.key==='tms'?th.gold:th.textMuted,
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((d,i)=>(
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=th.rowHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{transition:'background .15s'}}>
                    {TABLE_COLS.map((col,ci)=>(
                      <td key={col.key} style={{
                        padding:'10px 12px',
                        textAlign: col.align,
                        borderBottom: rowBd,
                        verticalAlign:'middle',
                        background: (ci>=9&&ci<=12) ? (theme==='light'?'rgba(0,48,135,0.015)':'rgba(255,255,255,0.015)') : undefined,
                        borderRight: ci===8||ci===12 ? `2px solid ${th.border}` : undefined,
                      }}>
                        {renderCell(d, col, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

        {/* ── CHARTS ── */}
        <div className="cg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

          <ChartCard title="Peserta per Bulan" subtitle="Distribusi jumlah peserta per bulan" th={th}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/><XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/><YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip th={th}/>} cursor={{fill:cr}}/><Bar dataKey="peserta" name="Peserta" fill={th.primary} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribusi Metode Pembelajaran" subtitle="Klasikal · PJJ · E-Learning" th={th}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={metodeData} cx="45%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {metodeData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CTip th={th}/>}/><Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:12,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peak Season & Low Season Pelatihan" subtitle="Frekuensi program per bulan — 🔥 peak  ·  ❄️ low  ·  normal" wide accent th={th}>
            <PeakSeasonChart data={monthlyData} th={th}/>
          </ChartCard>

          <ChartCard title="Tren Jam Latih per Bulan" subtitle="Total jam latih kumulatif bulanan" wide th={th}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <defs><linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={th.primary} stopOpacity={0.2}/><stop offset="95%" stopColor={th.primary} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/><XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/><YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip th={th}/>}/><Area type="monotone" dataKey="jamlat" name="Jamlat" stroke={th.primary} strokeWidth={2.5} fill="url(#blueGrad)" dot={{fill:th.primary,r:3}} activeDot={{r:6,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peserta per Penyelenggara" subtitle="Distribusi peserta antar lembaga" th={th}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={penyelData} layout="vertical" margin={{top:0,right:16,left:90,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt} horizontal={false}/><XAxis type="number" tick={{...axTick,fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={{fill:th.textDim,fontSize:10,fontFamily:'Plus Jakarta Sans'}} axisLine={false} tickLine={false} width={85}/>
                <Tooltip content={<CTip th={th}/>} cursor={{fill:cr}}/><Bar dataKey="value" name="Peserta" fill={th.gold} radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribusi Rumpun" subtitle="Anggaran · Perbendaharaan · Perimbangan · Akuntansi" th={th}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rumpunData} cx="45%" cy="50%" outerRadius={95} dataKey="value" paddingAngle={2}>
                  {rumpunData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CTip th={th}/>}/><Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peserta per Tim Kerja" subtitle="Distribusi peserta per tim kerja Pusdiklat AP" th={th}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timKerjaData} margin={{top:4,right:16,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/><XAxis dataKey="name" tick={{...axTick,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip th={th}/>} cursor={{fill:cr}}/>
                <Bar dataKey="value" name="Peserta" radius={[5,5,0,0]}>{timKerjaData.map((_,i)=><Cell key={i} fill={PAL[i]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Program Baru vs Eksisting per Bulan" subtitle="Komposisi status program pembelajaran" wide th={th}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/><XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/><YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip th={th}/>} cursor={{fill:cr}}/><Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:th.textMuted,fontSize:12,fontFamily:'Plus Jakarta Sans'}}>{v}</span>}/>
                <Bar dataKey="baru" name="Baru" stackId="a" fill={th.teal}/>
                <Bar dataKey="eksisting" name="Eksisting" stackId="a" fill={theme==='light'?'rgba(0,48,135,0.15)':'rgba(255,255,255,0.1)'} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        {/* ── FOOTER ── */}
        <div style={{padding:'18px 24px',background:th.surface,border:`1px solid ${th.border}`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,boxShadow:th.shadow}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <KemenkeuLogo size={34}/>
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
