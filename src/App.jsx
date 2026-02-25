import { useState, useMemo, useEffect, useRef } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import * as XLSX from 'xlsx'
import RAW_DATA from './data.js'
import KemenkeuLogo from './KemenkeuLogo.jsx'

const THEMES = {
  dark: {
    bg:'#0D1B3E', bgSub:'#0A1428', surface:'#132050', surface2:'#1A2A60',
    border:'rgba(255,255,255,0.08)', borderAccent:'rgba(201,168,76,0.35)',
    text:'#F0F4FF', textMuted:'#8A9BC4', textDim:'#B0BFDF',
    headerBg:'rgba(13,27,62,0.95)',
    gold:'#C9A84C', goldDim:'rgba(201,168,76,0.15)',
    blue:'#3B82F6', blueDim:'rgba(59,130,246,0.15)',
    teal:'#22D3EE', tealDim:'rgba(34,211,238,0.12)',
    primary:'#1D4ED8', primaryHover:'#2563EB',
    tableHover:'rgba(255,255,255,0.03)',
    shadow:'0 4px 24px rgba(0,0,0,0.35)',
    scrollbar:'#1A2A60', inputBg:'#1A2A60',
    badgeBg:{
      Klasikal:{bg:'rgba(59,130,246,0.18)',color:'#93C5FD'},
      PJJ:{bg:'rgba(34,211,238,0.15)',color:'#67E8F9'},
      'E-Learning':{bg:'rgba(201,168,76,0.18)',color:'#FCD34D'},
      Baru:{bg:'rgba(34,211,238,0.12)',color:'#67E8F9'},
      Eksisting:{bg:'rgba(255,255,255,0.07)',color:'#8A9BC4'},
    },
  },
  light: {
    bg:'#EEF3FB', bgSub:'#E3EBF7', surface:'#FFFFFF', surface2:'#EEF3FB',
    border:'rgba(0,48,135,0.1)', borderAccent:'rgba(201,168,76,0.5)',
    text:'#0D1B3E', textMuted:'#4A6094', textDim:'#2D4070',
    headerBg:'rgba(255,255,255,0.97)',
    gold:'#9B7A2A', goldDim:'rgba(155,122,42,0.1)',
    blue:'#1D4ED8', blueDim:'rgba(29,78,216,0.1)',
    teal:'#0891B2', tealDim:'rgba(8,145,178,0.1)',
    primary:'#003087', primaryHover:'#1D4ED8',
    tableHover:'rgba(0,48,135,0.025)',
    shadow:'0 2px 16px rgba(0,48,135,0.08)',
    scrollbar:'#CBD5E1', inputBg:'#EEF3FB',
    badgeBg:{
      Klasikal:{bg:'rgba(29,78,216,0.1)',color:'#1D4ED8'},
      PJJ:{bg:'rgba(8,145,178,0.1)',color:'#0891B2'},
      'E-Learning':{bg:'rgba(155,122,42,0.12)',color:'#9B7A2A'},
      Baru:{bg:'rgba(8,145,178,0.08)',color:'#0891B2'},
      Eksisting:{bg:'rgba(0,48,135,0.06)',color:'#4A6094'},
    },
  }
}

const BULAN_FULL=['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const BULAN_SHORT=['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const PAL_D=['#3B82F6','#C9A84C','#22D3EE','#818CF8','#34D399','#F87171']
const PAL_L=['#1D4ED8','#9B7A2A','#0891B2','#6366F1','#059669','#DC2626']
const PAGE_SIZE=12

const fmtNum=(n)=>{
  if(n>=1e6)return(n/1e6).toFixed(1)+'jt'
  if(n>=1e3)return(n/1e3).toFixed(1)+'rb'
  return(n??0).toLocaleString('id')
}

function useAnimatedNumber(target,duration=700){
  const[display,setDisplay]=useState(0)
  const rafRef=useRef(null),prevRef=useRef(0)
  useEffect(()=>{
    const from=prevRef.current;prevRef.current=target
    const start=performance.now()
    if(rafRef.current)cancelAnimationFrame(rafRef.current)
    const step=(now)=>{
      const p=Math.min((now-start)/duration,1),eased=1-Math.pow(1-p,3)
      setDisplay(Math.round(from+(target-from)*eased))
      if(p<1)rafRef.current=requestAnimationFrame(step)
    }
    rafRef.current=requestAnimationFrame(step)
    return()=>cancelAnimationFrame(rafRef.current)
  },[target,duration])
  return display
}

function CTip({active,payload,label,T}){
  if(!active||!payload?.length)return null
  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 14px',boxShadow:T.shadow}}>
      <p style={{color:T.text,fontSize:13,fontWeight:700,marginBottom:6}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color||T.textMuted,fontSize:12,margin:'2px 0'}}>
          {p.name}: <span style={{color:T.text,fontWeight:600}}>{typeof p.value==='number'?p.value.toLocaleString('id'):p.value}</span>
        </p>
      ))}
    </div>
  )
}

function KPICard({label,value,colorKey,icon,bgChar,delay=0,T,isDark}){
  const animated=useAnimatedNumber(value)
  const cfg={
    gold:{accent:T.gold,bg:T.goldDim,border:T.borderAccent},
    blue:{accent:T.blue,bg:T.blueDim,border:isDark?'rgba(59,130,246,0.35)':'rgba(29,78,216,0.2)'},
    teal:{accent:T.teal,bg:T.tealDim,border:isDark?'rgba(34,211,238,0.3)':'rgba(8,145,178,0.2)'},
  }[colorKey]
  return(
    <div style={{flex:1,minWidth:180,background:T.surface,border:`1px solid ${cfg.border}`,borderRadius:14,padding:'22px 24px 18px',position:'relative',overflow:'hidden',boxShadow:T.shadow,animation:`fadeUp .45s ease ${delay}s both`,transition:'transform .2s,box-shadow .2s',cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 32px rgba(0,48,135,${isDark?0.4:0.15})`}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=T.shadow}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${cfg.accent},transparent)`,borderRadius:'14px 14px 0 0'}}/>
      <div style={{width:42,height:42,borderRadius:10,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:14}}>{icon}</div>
      <div style={{fontSize:34,fontWeight:800,color:cfg.accent,lineHeight:1,marginBottom:5,letterSpacing:'-1px'}}>{fmtNum(animated)}</div>
      <div style={{fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.9px',fontWeight:600}}>{label}</div>
      <div style={{position:'absolute',bottom:-20,right:12,fontSize:80,fontWeight:900,opacity:.04,color:cfg.accent,lineHeight:1,pointerEvents:'none',userSelect:'none'}}>{bgChar}</div>
    </div>
  )
}

function ChartCard({title,subtitle,wide,children,T}){
  return(
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',gridColumn:wide?'1 / -1':undefined,boxShadow:T.shadow,animation:'fadeUp .5s ease .2s both'}}>
      <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:2}}>{title}</div>
      <div style={{fontSize:11,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:16}}>{subtitle}</div>
      {children}
    </div>
  )
}

function Badge({text,T}){
  const s=T.badgeBg[text]||{bg:'rgba(0,0,0,0.05)',color:T.textMuted}
  return <span style={{background:s.bg,color:s.color,padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{text}</span>
}

const FILTER_CONFIG=[
  {id:'bulan',options:[{v:'',l:'Semua Bulan'},...Array.from({length:12},(_,i)=>({v:String(i+1),l:BULAN_FULL[i+1]}))]},
  {id:'penyelenggara',options:[{v:'',l:'Semua Penyelenggara'},...['Pusdiklat AP','BDK Cimahi','BDK Yogyakarta','BDK Pontianak','BDK Makassar','BDK Medan','BDK Pekanbaru','BDK Palembang','BDK Malang','BDK Denpasar','BDK Manado','BDK Balikpapan'].map(v=>({v,l:v}))]},
  {id:'metode',options:[{v:'',l:'Semua Metode'},{v:'Klasikal',l:'Klasikal'},{v:'PJJ',l:'PJJ'},{v:'E-Learning',l:'E-Learning'}]},
  {id:'rumpun',options:[{v:'',l:'Semua Rumpun'},{v:'Anggaran',l:'Anggaran'},{v:'Perbendaharaan',l:'Perbendaharaan'},{v:'Perimbangan Keuangan',l:'Perimbangan Keuangan'},{v:'Akuntansi',l:'Akuntansi'}]},
]

function SunIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
function MoonIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}

export default function App(){
  const[isDark,setIsDark]=useState(true)
  const[filters,setFilters]=useState({bulan:'',penyelenggara:'',metode:'',rumpun:''})
  const[page,setPage]=useState(1)
  const T=isDark?THEMES.dark:THEMES.light
  const PAL=isDark?PAL_D:PAL_L

  const filtered=useMemo(()=>RAW_DATA.filter(d=>{
    if(filters.bulan&&String(d.bulan)!==filters.bulan)return false
    if(filters.penyelenggara&&d.penyelenggara!==filters.penyelenggara)return false
    if(filters.metode&&d.metode!==filters.metode)return false
    if(filters.rumpun&&d.rumpun.trim()!==filters.rumpun)return false
    return true
  }),[filters])

  const totalPeserta=useMemo(()=>filtered.reduce((s,d)=>s+d.total_peserta,0),[filtered])
  const totalJamlat=useMemo(()=>filtered.reduce((s,d)=>s+d.total_jamlator,0),[filtered])
  const totalPelatihan=filtered.length

  const monthlyData=useMemo(()=>Array.from({length:12},(_,i)=>{
    const m=i+1,rows=filtered.filter(d=>d.bulan===m)
    return{name:BULAN_SHORT[m],peserta:rows.reduce((s,d)=>s+d.total_peserta,0),jamlat:rows.reduce((s,d)=>s+d.total_jamlator,0),baru:rows.filter(d=>d.baru_eksisting==='Baru').length,eksisting:rows.filter(d=>d.baru_eksisting==='Eksisting').length}
  }),[filtered])

  const metodeData=useMemo(()=>{const g={};filtered.forEach(d=>{g[d.metode]=(g[d.metode]||0)+d.total_peserta});return Object.entries(g).map(([name,value])=>({name,value}))},[filtered])
  const rumpunData=useMemo(()=>{const g={};filtered.forEach(d=>{const k=d.rumpun.trim();g[k]=(g[k]||0)+d.total_peserta});return Object.entries(g).map(([name,value])=>({name,value}))},[filtered])
  const penyelData=useMemo(()=>{const g={};filtered.forEach(d=>{g[d.penyelenggara]=(g[d.penyelenggara]||0)+d.total_peserta});return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))},[filtered])

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
  const pageData=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const setFilter=(key,val)=>{setFilters(p=>({...p,[key]:val}));setPage(1)}
  const resetFilters=()=>{setFilters({bulan:'',penyelenggara:'',metode:'',rumpun:''});setPage(1)}

  const exportCSV=()=>{
    const rows=[['No','Nama Program','Bulan','Metode','Penyelenggara','Rumpun','Total Peserta','Total Jamlat','Status'],...filtered.map((d,i)=>[i+1,d.nama,BULAN_FULL[d.bulan]||d.bulan,d.metode,d.penyelenggara,d.rumpun.trim(),d.total_peserta,d.total_jamlator,d.baru_eksisting])]
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    Object.assign(document.createElement('a'),{href:url,download:'kalender_pembelajaran_2026.csv'}).click()
    URL.revokeObjectURL(url)
  }
  const exportExcel=()=>{
    const wsData=[['No','Nama Program','Bulan','Metode','Penyelenggara','Rumpun','Total Peserta','Total Jamlat','Status'],...filtered.map((d,i)=>[i+1,d.nama,BULAN_FULL[d.bulan]||d.bulan,d.metode,d.penyelenggara,d.rumpun.trim(),d.total_peserta,d.total_jamlator,d.baru_eksisting])]
    const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols']=[{wch:5},{wch:60},{wch:12},{wch:12},{wch:20},{wch:22},{wch:14},{wch:14},{wch:12}]
    XLSX.utils.book_append_sheet(wb,ws,'Data Pelatihan')
    XLSX.writeFile(wb,'Kalender_Pembelajaran_2026.xlsx')
  }

  const axTick={fill:T.textMuted,fontSize:11,fontFamily:'Plus Jakarta Sans,sans-serif'}
  const gridSt={stroke:isDark?'rgba(255,255,255,0.05)':'rgba(0,48,135,0.06)'}
  const selStyle={background:T.inputBg,border:`1px solid ${T.border}`,color:T.text,padding:'8px 12px',borderRadius:8,fontSize:13,cursor:'pointer',outline:'none',fontFamily:'Plus Jakarta Sans,sans-serif',transition:'border-color .2s'}
  const btnBase={fontFamily:'Plus Jakarta Sans,sans-serif',cursor:'pointer',display:'flex',alignItems:'center',gap:6,borderRadius:8,fontSize:13,fontWeight:600,transition:'all .2s'}
  const CT=(props)=><CTip {...props} T={T}/>
  const cr=isDark?'rgba(255,255,255,0.04)':'rgba(0,48,135,0.04)'
  const rowBorder=`1px solid ${isDark?'rgba(255,255,255,0.04)':'rgba(0,48,135,0.05)'}`

  return(
    <div style={{background:T.bg,minHeight:'100vh',color:T.text,fontFamily:'Plus Jakarta Sans,sans-serif',transition:'background .3s,color .3s'}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${T.bgSub}}
        ::-webkit-scrollbar-thumb{background:${T.scrollbar};border-radius:3px}
        *{box-sizing:border-box}
        select option{background:${T.surface}}
        select:focus{border-color:${T.primary}!important}
        @media(max-width:900px){.cg{grid-template-columns:1fr!important}.cg>*{grid-column:1!important}.kr{flex-direction:column!important}}
        @media print{header{position:relative!important}.np{display:none!important}}
      `}</style>

      {/* Top accent bar */}
      <div style={{height:4,background:'linear-gradient(90deg,#003087 0%,#C9A84C 50%,#003087 100%)'}}/>

      {/* HEADER */}
      <header style={{position:'sticky',top:0,zIndex:200,background:T.headerBg,backdropFilter:'blur(20px)',borderBottom:`1px solid ${T.border}`,boxShadow:isDark?'0 2px 24px rgba(0,0,0,0.5)':'0 2px 20px rgba(0,48,135,0.12)'}}>
        <div style={{padding:'14px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <KemenkeuLogo size={52} mode={isDark?'dark':'light'}/>
            <div>
              <div style={{fontSize:11,color:T.gold,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:3}}>Kementerian Keuangan Republik Indonesia</div>
              <h1 style={{fontWeight:800,fontSize:19,letterSpacing:'-.3px',margin:0,color:T.text,lineHeight:1.2}}>Dashboard Kalender Pembelajaran 2026</h1>
              <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>Pusat Pendidikan dan Pelatihan Anggaran &amp; Perbendaharaan </div>
            </div>
          </div>
          <div className="np" style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={()=>setIsDark(!isDark)} style={{...btnBase,background:isDark?'rgba(255,255,255,0.08)':'rgba(0,48,135,0.08)',border:`1px solid ${T.border}`,color:T.textDim,padding:'8px 14px',fontSize:12,fontWeight:500}}>
              {isDark?<><SunIcon/> Mode Terang</>:<><MoonIcon/> Mode Gelap</>}
            </button>
            <div style={{width:1,height:28,background:T.border}}/>
            <button onClick={exportCSV} style={{...btnBase,background:T.surface2,border:`1px solid ${T.border}`,color:T.textDim,padding:'8px 14px'}}>⬇ CSV</button>
            <button onClick={exportExcel} style={{...btnBase,background:T.surface2,border:`1px solid ${T.border}`,color:T.textDim,padding:'8px 14px'}}>⬇ Excel</button>
            <button onClick={()=>window.print()} style={{...btnBase,background:T.primary,color:'#fff',padding:'8px 18px',border:'none',boxShadow:'0 2px 12px rgba(0,48,135,0.35)'}}>🖨 Print</button>
          </div>
        </div>
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${T.gold}50,transparent)`}}/>
        <div style={{padding:'7px 28px',background:isDark?'rgba(0,0,0,0.18)':'rgba(0,48,135,0.03)',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          {['📅 Tahun Anggaran 2026',].map((item,i)=>(
            <span key={i} style={{display:'flex',alignItems:'center',gap:i>0?16:0}}>
              {i>0&&<span style={{color:T.border,marginRight:16}}>|</span>}
              <span style={{fontSize:11,color:T.textMuted}}>{item}</span>
            </span>
          ))}
        </div>
      </header>

      <div style={{position:'relative',zIndex:1,padding:'24px 28px',maxWidth:1560,margin:'0 auto'}}>

        {/* FILTERS */}
        <div className="np" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 20px',marginBottom:24,boxShadow:T.shadow,animation:'fadeUp .4s ease both',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,${T.primary},${T.gold})`}}/>
          <span style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'1px',whiteSpace:'nowrap',marginLeft:8}}>🔍 Filter :</span>
          {FILTER_CONFIG.map(fc=>(
            <select key={fc.id} value={filters[fc.id]} onChange={e=>setFilter(fc.id,e.target.value)} style={selStyle}>
              {fc.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <div style={{width:1,height:28,background:T.border}}/>
          <button onClick={resetFilters} style={{...btnBase,background:'transparent',border:`1px solid ${T.border}`,color:T.textMuted,padding:'8px 14px',fontSize:12,fontWeight:500}}>✕ Reset</button>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:T.teal,animation:'shimmer 2s ease infinite'}}/>
            <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{filtered.length.toLocaleString('id')} hasil</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="kr" style={{display:'flex',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <KPICard label="Total Peserta" value={totalPeserta} colorKey="gold" icon="👥" bgChar="P" delay={0.05} T={T} isDark={isDark}/>
          <KPICard label="Total Jamlator" value={totalJamlat} colorKey="teal" icon="⏱" bgChar="J" delay={0.10} T={T} isDark={isDark}/>
          <KPICard label="Total Pelatihan" value={totalPelatihan} colorKey="blue" icon="📋" bgChar="T" delay={0.15} T={T} isDark={isDark}/>
        </div>

        {/* CHARTS */}
        <div className="cg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>

          <ChartCard title="Peserta per Bulan" subtitle="Distribusi jumlah peserta per bulan" T={T}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Bar dataKey="peserta" name="Peserta" fill={T.primary} radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribusi Metode Pembelajaran" subtitle="Klasikal · PJJ · E-Learning" T={T}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={metodeData} cx="45%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {metodeData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:T.textMuted,fontSize:12}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tren Jam Latih (Jamlat) per Bulan" subtitle="Total jam latih kumulatif bulanan" wide T={T}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.primary} stopOpacity={isDark?0.35:0.2}/>
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>}/>
                <Area type="monotone" dataKey="jamlat" name="Jamlat" stroke={T.primary} strokeWidth={2.5} fill="url(#blueGrad)" dot={{fill:T.primary,r:3}} activeDot={{r:6,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peserta per Penyelenggara" subtitle="Distribusi peserta antar lembaga" T={T}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={penyelData} layout="vertical" margin={{top:0,right:16,left:90,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt} horizontal={false}/>
                <XAxis type="number" tick={{...axTick,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false} width={85}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Bar dataKey="value" name="Peserta" fill={T.gold} radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribusi Rumpun Pelatihan" subtitle="Anggaran · Perbendaharaan · Perimbangan · Akuntansi" T={T}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rumpunData} cx="45%" cy="50%" outerRadius={100} dataKey="value" paddingAngle={2}>
                  {rumpunData.map((_,i)=><Cell key={i} fill={PAL[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:T.textMuted,fontSize:11}}>{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Komposisi Program Baru vs Eksisting" subtitle="Jumlah program per bulan berdasarkan status" wide T={T}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{top:4,right:4,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" {...gridSt}/>
                <XAxis dataKey="name" tick={axTick} axisLine={false} tickLine={false}/>
                <YAxis tick={axTick} axisLine={false} tickLine={false}/>
                <Tooltip content={<CT/>} cursor={{fill:cr}}/>
                <Legend iconType="circle" iconSize={10} formatter={v=><span style={{color:T.textMuted,fontSize:12}}>{v}</span>}/>
                <Bar dataKey="baru" name="Baru" stackId="a" fill={T.teal}/>
                <Bar dataKey="eksisting" name="Eksisting" stackId="a" fill={isDark?'rgba(255,255,255,0.1)':'rgba(0,48,135,0.12)'} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* TABLE */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,overflow:'hidden',boxShadow:T.shadow,animation:'fadeUp .5s ease .3s both'}}>
          <div style={{padding:'16px 22px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:isDark?'rgba(0,0,0,0.15)':'rgba(0,48,135,0.03)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:4,height:32,background:`linear-gradient(180deg,${T.primary},${T.gold})`,borderRadius:2}}/>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:T.text}}>Data Program Pelatihan</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>Detail seluruh program pembelajaran Pusdiklat AP 2026</div>
              </div>
            </div>
            <span style={{fontSize:12,color:T.textMuted,background:T.surface2,padding:'4px 12px',borderRadius:20,border:`1px solid ${T.border}`}}>{filtered.length.toLocaleString('id')} entri</span>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>
                  {['No','Nama Program','Bulan','Metode','Penyelenggara','Rumpun','Peserta','Jamlat','Status'].map(h=>(
                    <th key={h} style={{padding:'11px 16px',textAlign:'left',fontSize:11,textTransform:'uppercase',letterSpacing:'0.7px',color:T.textMuted,fontWeight:700,background:T.surface2,borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((d,i)=>(
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background=T.tableHover} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{transition:'background .15s'}}>
                    <td style={{padding:'10px 16px',color:T.textMuted,borderBottom:rowBorder}}>{(page-1)*PAGE_SIZE+i+1}</td>
                    <td title={d.nama} style={{padding:'10px 16px',color:T.text,fontWeight:500,maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderBottom:rowBorder}}>{d.nama}</td>
                    <td style={{padding:'10px 16px',color:T.textDim,borderBottom:rowBorder,whiteSpace:'nowrap'}}>{BULAN_FULL[d.bulan]}</td>
                    <td style={{padding:'10px 16px',borderBottom:rowBorder}}><Badge text={d.metode} T={T}/></td>
                    <td style={{padding:'10px 16px',color:T.textDim,borderBottom:rowBorder,whiteSpace:'nowrap'}}>{d.penyelenggara}</td>
                    <td style={{padding:'10px 16px',color:T.textDim,borderBottom:rowBorder,whiteSpace:'nowrap'}}>{d.rumpun.trim()}</td>
                    <td style={{padding:'10px 16px',textAlign:'right',color:T.gold,fontWeight:700,borderBottom:rowBorder}}>{d.total_peserta.toLocaleString('id')}</td>
                    <td style={{padding:'10px 16px',textAlign:'right',color:T.teal,fontWeight:600,borderBottom:rowBorder}}>{d.total_jamlator.toLocaleString('id')}</td>
                    <td style={{padding:'10px 16px',borderBottom:rowBorder}}><Badge text={d.baru_eksisting} T={T}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 22px',borderTop:`1px solid ${T.border}`,background:isDark?'rgba(0,0,0,0.1)':'rgba(0,48,135,0.02)'}}>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} style={{...btnBase,background:T.surface2,border:`1px solid ${T.border}`,color:T.textDim,padding:'7px 16px',fontSize:12,cursor:page<=1?'default':'pointer',opacity:page<=1?0.4:1}}>← Sebelumnya</button>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:12,color:T.textMuted}}>Halaman</span>
              <span style={{fontSize:13,fontWeight:700,background:T.primary,color:'#fff',padding:'3px 10px',borderRadius:6}}>{page}</span>
              <span style={{fontSize:12,color:T.textMuted}}>dari {totalPages}</span>
            </div>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} style={{...btnBase,background:T.surface2,border:`1px solid ${T.border}`,color:T.textDim,padding:'7px 16px',fontSize:12,cursor:page>=totalPages?'default':'pointer',opacity:page>=totalPages?0.4:1}}>Berikutnya →</button>
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:28,padding:'18px 24px',background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,boxShadow:T.shadow}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <KemenkeuLogo size={34} mode={isDark?'dark':'light'}/>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:T.text}}>Kementerian Keuangan Republik Indonesia</div>
              <div style={{fontSize:11,color:T.textMuted}}>Pusdiklat Anggaran &amp; Perbendaharaan · BPPK · 2026</div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12,color:T.textMuted}}>Dashboard Kalender Pembelajaran 2026</div>
            <div style={{fontSize:12,fontWeight:600,color:T.gold,fontStyle:'italic'}}>Nagara Dana Rakca</div>
          </div>
        </div>

      </div>
    </div>
  )
}
