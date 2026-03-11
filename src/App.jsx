import React, { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";

const ThemeCtx=React.createContext({dark:false,T:{},setDark:()=>{}});
const useT=()=>React.useContext(ThemeCtx).T;
const useDark=()=>({dark:React.useContext(ThemeCtx).dark,setDark:React.useContext(ThemeCtx).setDark});
const useMobile=()=>{const[m,setM]=useState(()=>window.innerWidth<768);useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[]);return m;};

const THEMES={
  light:{
    bg:'#F5F3EF',card:'#fff',cardHover:'#FAFAF8',cardAlt:'#FAFAF8',
    border:'#EAE8E2',borderLight:'#F2EFE8',borderDash:'#D8D4CD',
    text:'#1A1A1A',textSec:'#6B6B6B',textMuted:'#9B9590',textFaint:'#B0ABA4',
    input:'#fff',inputBorder:'#E0DDD7',
    tableHead:'#FAFAF8',calToday:'#FAFAFF',calTodayOver:'#EDEEFF',
    sidebarBg:'#1E1B4B',progressBg:'#F0EDE8',
  },
  dark:{
    bg:'#0D0B2E',card:'#1A1845',cardHover:'#221F55',cardAlt:'#161440',
    border:'#2D2A6E',borderLight:'#1F1C5A',borderDash:'#2D2A6E',
    text:'#E2DDD4',textSec:'#8A9E90',textMuted:'#5A58A0',textFaint:'#4A4890',
    input:'#1A1845',inputBorder:'#3A3880',
    tableHead:'#131045',calToday:'#1A1850',calTodayOver:'#1E1C58',
    sidebarBg:'#13114A',progressBg:'#2A2870',
  },
};

const PM = {
  instagram:{ label:'Instagram', color:'#E1306C', bg:'#FFF0F5', formats:['Post','Reel','Story','Carousel'] },
  facebook: { label:'Facebook',  color:'#1877F2', bg:'#EEF4FF', formats:['Post','Story','Video','Reel'] },
  linkedin: { label:'LinkedIn',  color:'#0A66C2', bg:'#EEF6FF', formats:['Post','Article','Video'] },
  telegram: { label:'Telegram',  color:'#26A5E4', bg:'#EEF9FF', formats:['Post','Video','Poll'] },
  tiktok:   { label:'TikTok',    color:'#161823', bg:'#F3F3F3', formats:['Video','Story'] },
  vk:       { label:'VK',        color:'#0077FF', bg:'#EEF4FF', formats:['Post','Story','Video','Article'] },
  dzen:     { label:'Дзен',      color:'#FF6600', bg:'#FFF4EE', formats:['Article','Post','Video'] },
  max:      { label:'Max',       color:'#7C3AED', bg:'#F5F0FF', formats:['Post','Video'] },
};
const STATUSES = [
  { id:'idea',      label:'Идея',          color:'#94A3B8', bg:'#F1F5F9' },
  { id:'draft',     label:'Черновик',      color:'#D97706', bg:'#FFFBEB' },
  { id:'ready',     label:'Готово',        color:'#6366F1', bg:'#EDEDFF' },
  { id:'scheduled', label:'Запланировано', color:'#6366F1', bg:'#EEF2FF' },
  { id:'published', label:'Опубликовано',  color:'#64748B', bg:'#F8FAFC' },
];
const SM = Object.fromEntries(STATUSES.map(s=>[s.id,s]));
const CONTENT_TYPES=[
  {id:'entertainment',label:'Юмор',            color:'#D946A8',bg:'#FDF4FF'},
  {id:'expert',       label:'Экспертный',     color:'#0A66C2',bg:'#EEF6FF'},
  {id:'sales',        label:'Продающий',      color:'#D97706',bg:'#FFFBEB'},
  {id:'personal',     label:'Личное',         color:'#7C3AED',bg:'#F5F0FF'},
  {id:'cases',        label:'Кейсы',          color:'#6366F1',bg:'#EDEDFF'},
  {id:'reviews',      label:'Отзывы',         color:'#0891B2',bg:'#ECFEFF'},
];
const CTM=Object.fromEntries(CONTENT_TYPES.map(t=>[t.id,t]));
const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MN = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MG = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DEF_ACCOUNTS = [
  {id:'ig-ru',platform:'instagram',label:'Instagram RU',language:'ru',active:true},
  {id:'ig-fr',platform:'instagram',label:'Instagram FR',language:'fr',active:true},
  {id:'fb-ru',platform:'facebook', label:'Facebook RU', language:'ru',active:true},
  {id:'fb-fr',platform:'facebook', label:'Facebook FR', language:'fr',active:true},
  {id:'li-ru',platform:'linkedin', label:'LinkedIn RU', language:'ru',active:true},
  {id:'li-fr',platform:'linkedin', label:'LinkedIn FR', language:'fr',active:true},
  {id:'tg',   platform:'telegram', label:'Telegram',    language:'ru',active:true},
  {id:'tt',   platform:'tiktok',   label:'TikTok',      language:'ru',active:true},
];

const sameDay=(a,b)=>{const da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate()};
const isToday=d=>sameDay(d,new Date());
const addD=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
function getWeekDays(ref){const d=new Date(ref),dow=d.getDay(),off=dow===0?-6:1-dow,mon=addD(d,off);mon.setHours(0,0,0,0);return Array.from({length:7},(_,i)=>addD(mon,i))}
function getMonthGrid(ref){const y=ref.getFullYear(),m=ref.getMonth(),first=new Date(y,m,1),dow=first.getDay(),off=dow===0?6:dow-1,start=addD(first,-off);return Array.from({length:42},(_,i)=>addD(start,i))}
function toInputDate(d){if(!d)return'';const date=new Date(d);if(isNaN(date.getTime()))return'';return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function displayDate(d){if(!d)return'—';const date=new Date(d);return`${date.getDate()} ${MG[date.getMonth()]}`}
function makeSamples(){
  const n=new Date();
  return[
    {id:'s1',title:'Утренняя рутина',accountId:'ig-ru',format:'Reel',contentType:'entertainment',status:'scheduled',language:'ru',scheduledAt:addD(n,1).toISOString(),text:'',notes:'Снять в 8 утра при мягком свете',mediaRef:'',createdAt:n.toISOString(),updatedAt:n.toISOString()},
    {id:'s2',title:'Morning routine',accountId:'ig-fr',format:'Reel',contentType:'entertainment',status:'draft',language:'fr',scheduledAt:addD(n,3).toISOString(),text:'',notes:'',mediaRef:'',createdAt:n.toISOString(),updatedAt:n.toISOString()},
    {id:'s3',title:'Кейс с клиентом',accountId:'li-ru',format:'Post',contentType:'expert',status:'ready',language:'ru',scheduledAt:addD(n,5).toISOString(),text:'Текст кейса...',notes:'',mediaRef:'~/Documents/case.pdf',createdAt:n.toISOString(),updatedAt:n.toISOString()},
    {id:'s4',title:'Анонс в канале',accountId:'tg',format:'Post',contentType:'sales',status:'idea',language:'ru',scheduledAt:null,text:'',notes:'Рассказать о новом проекте',mediaRef:'',createdAt:n.toISOString(),updatedAt:n.toISOString()},
    {id:'s5',title:'Paris vibes',accountId:'tt',format:'Video',contentType:'entertainment',status:'scheduled',language:'fr',scheduledAt:addD(n,2).toISOString(),text:'',notes:'15 сек, трендовый звук',mediaRef:'~/Videos/paris.mp4',createdAt:n.toISOString(),updatedAt:n.toISOString()},
    {id:'s6',title:'Case study FR',accountId:'li-fr',format:'Article',contentType:'expert',status:'draft',language:'fr',scheduledAt:addD(n,7).toISOString(),text:'',notes:'',mediaRef:'',createdAt:n.toISOString(),updatedAt:n.toISOString()},
  ];
}

function StatusBadge({id}){const s=SM[id]||STATUSES[0];return <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:500,color:s.color,background:s.bg,whiteSpace:'nowrap'}}>{s.label}</span>}
function ContentTypeBadge({id}){if(!id)return null;const t=CTM[id];if(!t)return null;return <span style={{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:500,color:t.color,background:t.bg,whiteSpace:'nowrap'}}>{t.label}</span>}
function AccountChip({account}){const m=PM[account?.platform];return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:500,color:m?.color||'#333',background:m?.bg||'#f5f5f5',whiteSpace:'nowrap'}}><span style={{width:5,height:5,borderRadius:'50%',background:m?.color||'#ccc',display:'inline-block'}}/>{account?.label}</span>}

function Btn({children,onClick,variant='primary',size='md',style:sx={}}){
  const T=useT();
  const pad=size==='sm'?'5px 12px':'8px 16px';
  const fs=size==='sm'?12:13;
  const V={primary:{background:'#1E1B4B',color:'#fff'},secondary:{background:T.cardAlt,color:T.text,border:`1px solid ${T.border}`},ghost:{background:'transparent',color:T.textSec},danger:{background:'#FEF2F2',color:'#DC2626'},green:{background:'#4F46C8',color:'#fff'}};
  return <button onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:6,padding:pad,fontSize:fs,borderRadius:8,fontFamily:'inherit',fontWeight:500,cursor:'pointer',border:'none',...V[variant],...sx}}>{children}</button>
}

const mkIS=(T)=>({padding:'8px 10px',borderRadius:7,border:`1px solid ${T.inputBorder}`,fontSize:13,fontFamily:'inherit',color:T.text,background:T.input,outline:'none',width:'100%',boxSizing:'border-box'});

function Sidebar({view,setView,accounts}){
  const{dark,setDark}=useDark();
  const grouped={};
  accounts.filter(a=>a.active).forEach(a=>{(grouped[a.platform]??=[]).push(a)});
  return(
    <aside style={{width:200,background:dark?'#13114A':'#1E1B4B',color:'#fff',display:'flex',flexDirection:'column',flexShrink:0,minHeight:'100%'}}>
      <div style={{padding:'20px 15px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{fontSize:17,color:'#E2DDD4',fontWeight:600,letterSpacing:'-0.3px'}}>Content OS</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.28)',marginTop:2}}>Личный контент-план</div>
      </div>
      <nav style={{padding:'8px 6px',display:'flex',flexDirection:'column',gap:1}}>
        {[['dashboard','⌂','Главная'],['calendar','▦','Календарь'],['posts','≡','Публикации'],['settings','⊙','Аккаунты']].map(([id,icon,label])=>(
          <button key={id} onClick={()=>setView(id)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:7,border:'none',background:view===id?'rgba(255,255,255,0.13)':'transparent',color:view===id?'#fff':'rgba(255,255,255,0.42)',fontSize:13,fontFamily:'inherit',fontWeight:view===id?500:400,cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span style={{fontSize:13,opacity:0.7}}>{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div style={{padding:'8px 15px',borderTop:'1px solid rgba(255,255,255,0.07)',flex:1,overflowY:'auto',marginTop:6}}>
        <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.18)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Аккаунты</div>
        {Object.entries(grouped).map(([platform,accs])=>(
          <div key={platform} style={{marginBottom:8}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.2)',marginBottom:2,display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:4,height:4,borderRadius:'50%',background:PM[platform]?.color||'#fff',display:'inline-block'}}/>{PM[platform]?.label}
            </div>
            {accs.map(a=><div key={a.id} style={{fontSize:11,color:'rgba(255,255,255,0.35)',padding:'1px 0 1px 8px'}}>{a.label}</div>)}
          </div>
        ))}
      </div>
      <div style={{padding:'12px 15px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
        <button onClick={()=>setDark(d=>!d)} style={{display:'flex',alignItems:'center',gap:7,width:'100%',background:'rgba(255,255,255,0.07)',border:'none',borderRadius:7,padding:'7px 10px',cursor:'pointer',color:'rgba(255,255,255,0.6)',fontSize:12,fontFamily:'inherit'}}>
          <span>{dark?'☀️':'🌙'}</span>
          <span>{dark?'Светлая тема':'Тёмная тема'}</span>
        </button>
      </div>
    </aside>
  );
}

function BottomNav({view,setView}){
  const T=useT();
  const{dark,setDark}=useDark();
  const tabs=[['dashboard','⌂','Главная'],['calendar','▦','Календарь'],['posts','≡','Посты'],['settings','⊙','Аккаунты']];
  return(
    <nav style={{position:'fixed',bottom:0,left:0,right:0,background:dark?'#13114A':'#1E1B4B',display:'flex',alignItems:'center',paddingBottom:'env(safe-area-inset-bottom)',zIndex:100,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
      {tabs.map(([id,icon,label])=>(
        <button key={id} onClick={()=>setView(id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'10px 4px 8px',border:'none',background:'transparent',color:view===id?'#fff':'rgba(255,255,255,0.38)',fontFamily:'inherit',cursor:'pointer'}}>
          <span style={{fontSize:20}}>{icon}</span>
          <span style={{fontSize:10,fontWeight:view===id?600:400}}>{label}</span>
        </button>
      ))}
      <button onClick={()=>setDark(d=>!d)} style={{width:44,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'10px 4px 8px',border:'none',background:'transparent',color:'rgba(255,255,255,0.38)',fontFamily:'inherit',cursor:'pointer'}}>
        <span style={{fontSize:18}}>{dark?'☀️':'🌙'}</span>
      </button>
    </nav>
  );
}

function Dashboard({posts,accounts,showReminder,onDismiss,onNew,onSelect,goCalendar}){
  const T=useT();
  const mob=useMobile();
  const now=new Date();
  const aMap=useMemo(()=>Object.fromEntries(accounts.map(a=>[a.id,a])),[accounts]);
  const upcoming=useMemo(()=>posts.filter(p=>p.scheduledAt&&new Date(p.scheduledAt)>=now&&p.status!=='published').sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)).slice(0,6),[posts]);
  const publishedToday=useMemo(()=>posts.filter(p=>p.status==='published'&&p.publishedAt&&sameDay(new Date(p.publishedAt),now)).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)),[posts]);
  const st=useMemo(()=>({total:posts.length,ideas:posts.filter(p=>p.status==='idea').length,inWork:posts.filter(p=>['draft','ready'].includes(p.status)).length,scheduled:posts.filter(p=>p.status==='scheduled').length}),[posts]);

  const PostRow=({post,dimmed})=>{
    const acc=aMap[post.accountId];
    return(
      <div onClick={()=>onSelect(post.id)} style={{background:T.card,borderRadius:9,padding:'10px 14px',border:`1px solid ${T.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10,opacity:dimmed?0.7:1}}
        onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
        onMouseLeave={e=>e.currentTarget.style.background=T.card}>
        <div style={{width:3,height:32,borderRadius:4,background:PM[acc?.platform]?.color||'#ccc',flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:T.text}}>{post.title||'(без названия)'}</div>
          <div style={{display:'flex',gap:5,marginTop:3,alignItems:'center'}}>
            {acc&&<AccountChip account={acc}/>}
            {post.format&&<span style={{fontSize:11,color:T.textMuted}}>{post.format}</span>}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:12,color:T.textSec,marginBottom:3}}>{displayDate(post.scheduledAt||post.publishedAt)}</div>
          <StatusBadge id={post.status}/>
        </div>
      </div>
    );
  };

  return(
    <div style={{padding:mob?'20px 16px 90px':'28px 32px',maxWidth:780,overflowY:'auto',flex:1}}>
      <div style={{marginBottom:18}}>
        <h1 style={{fontSize:mob?22:28,fontWeight:600,margin:0,letterSpacing:'-0.5px',color:T.text}}>Привет 👋</h1>
        <p style={{color:T.textSec,fontSize:mob?12:13,marginTop:3,marginBottom:0}}>{now.getDate()} {MG[now.getMonth()]} · {now.toLocaleDateString('ru-RU',{weekday:'long'})}</p>
      </div>
      {showReminder&&(
        <div style={{background:'linear-gradient(135deg,#1E1B4B,#3D3A8E)',borderRadius:12,padding:'14px 18px',marginBottom:20,color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#A5B4FC',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:3}}>Напоминание</div>
            <div style={{fontSize:14,fontWeight:500}}>На этой неделе нет запланированных публикаций</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:2}}>Накидайте хотя бы по одному посту в ключевые каналы</div>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}>
            <Btn onClick={goCalendar} variant="green" size="sm">Открыть календарь</Btn>
            <Btn onClick={onNew} size="sm" style={{background:'rgba(255,255,255,0.13)',color:'#fff'}}>+ Добавить</Btn>
            <button onClick={onDismiss} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:17,padding:'0 3px'}}>✕</button>
          </div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:mob?'repeat(2,1fr)':'repeat(4,1fr)',gap:8,marginBottom:22}}>
        {[['Всего',st.total,T.text],['Идей',st.ideas,'#94A3B8'],['В работе',st.inWork,'#D97706'],['Запланировано',st.scheduled,'#6366F1']].map(([label,val,color])=>(
          <div key={label} style={{background:T.card,borderRadius:10,padding:'13px 15px',border:`1px solid ${T.border}`}}>
            <div style={{fontSize:24,fontWeight:700,color,lineHeight:1}}>{val}</div>
            <div style={{fontSize:11,color:T.textSec,marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <h2 style={{fontSize:16,fontWeight:600,margin:0,color:T.text}}>Ближайшие публикации</h2>
        <Btn onClick={onNew} size="sm">+ Добавить</Btn>
      </div>
      {upcoming.length===0?(
        <div style={{background:T.card,borderRadius:10,border:`1px dashed ${T.borderDash}`,padding:'28px',textAlign:'center',color:T.textMuted,marginBottom:20}}>
          <div style={{fontSize:26,marginBottom:6}}>📅</div>
          <div style={{fontSize:13}}>Нет запланированных публикаций</div>
          <div style={{marginTop:10}}><Btn onClick={onNew} size="sm">Создать первую</Btn></div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:24}}>
          {upcoming.map(post=><PostRow key={post.id} post={post}/>)}
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <h2 style={{fontSize:16,fontWeight:600,margin:0,color:T.text}}>Опубликовано сегодня</h2>
        {publishedToday.length>0&&<span style={{fontSize:12,background:'#EDEDFF',color:'#6366F1',padding:'2px 8px',borderRadius:20,fontWeight:500}}>{publishedToday.length}</span>}
      </div>
      {publishedToday.length===0?(
        <div style={{background:T.card,borderRadius:10,border:`1px solid ${T.border}`,padding:'18px 20px',display:'flex',alignItems:'center',gap:10,color:T.textMuted}}>
          <span style={{fontSize:18}}>🌿</span>
          <span style={{fontSize:13}}>Сегодня ничего не опубликовано</span>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:5}}>
          {publishedToday.map(post=><PostRow key={post.id} post={post} dimmed/>)}
        </div>
      )}
    </div>
  );
}

function CalendarView({posts,accounts,onSelect,onNewOnDate,onMove}){
  const T=useT();
  const mob=useMobile();
  const[mode,setMode]=useState('week');
  const[ref,setRef]=useState(new Date());
  const[dragId,setDragId]=useState(null);
  const[overDate,setOverDate]=useState(null);
  const aMap=useMemo(()=>Object.fromEntries(accounts.map(a=>[a.id,a])),[accounts]);
  const postsFor=useCallback(day=>posts.filter(p=>p.scheduledAt&&sameDay(new Date(p.scheduledAt),day)),[posts]);
  function nav(d){const r=new Date(ref);if(mode==='week')r.setDate(r.getDate()+d*7);else r.setMonth(r.getMonth()+d);setRef(r)}
  function drop(day){if(dragId){const d=new Date(day);d.setHours(12,0,0,0);onMove(dragId,d.toISOString())}setDragId(null);setOverDate(null)}
  const dnd=day=>({onDragOver:e=>{e.preventDefault();setOverDate(day.toISOString())},onDrop:()=>drop(day),onDragLeave:()=>setOverDate(null)});
  const wDays=getWeekDays(ref);
  const mDays=getMonthGrid(ref);
  const title=mode==='week'?`${wDays[0].getDate()} ${MG[wDays[0].getMonth()]} — ${wDays[6].getDate()} ${MG[wDays[6].getMonth()]} ${wDays[6].getFullYear()}`:`${MN[ref.getMonth()]} ${ref.getFullYear()}`;
  return(
    <div style={{padding:mob?'16px 10px 90px':'28px 32px',flex:1,overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <h1 style={{fontSize:mob?18:24,fontWeight:600,margin:0,color:T.text}}>Календарь</h1>
        <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',background:T.card,border:`1px solid ${T.inputBorder}`,borderRadius:7,overflow:'hidden'}}>
            {['week','month'].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:'5px 12px',fontSize:12,fontFamily:'inherit',fontWeight:500,border:'none',cursor:'pointer',background:mode===m?'#1E1B4B':'transparent',color:mode===m?'#fff':T.textSec}}>{m==='week'?'Неделя':'Месяц'}</button>)}
          </div>
          <Btn onClick={()=>nav(-1)} variant="secondary" size="sm">←</Btn>
          <span style={{fontSize:12,fontWeight:500,minWidth:180,textAlign:'center',color:T.text}}>{title}</span>
          <Btn onClick={()=>nav(1)} variant="secondary" size="sm">→</Btn>
          <Btn onClick={()=>setRef(new Date())} variant="secondary" size="sm">Сегодня</Btn>
          <Btn onClick={()=>onNewOnDate(new Date())} size="sm">+ Добавить</Btn>
        </div>
      </div>
      <div style={{background:T.card,borderRadius:11,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${T.border}`,background:T.tableHead}}>
          {WD.map((wd,i)=><div key={i} style={{padding:'7px',textAlign:'center',fontSize:10,fontWeight:700,color:T.textMuted,letterSpacing:'0.07em',textTransform:'uppercase',borderRight:i<6?`1px solid ${T.border}`:'none'}}>{wd}</div>)}
        </div>
        {mode==='week'?(
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${T.border}`}}>
              {wDays.map((day,i)=>(
                <div key={i} style={{padding:'7px',textAlign:'center',borderRight:i<6?`1px solid ${T.border}`:'none',background:isToday(day)?T.calToday:'transparent'}}>
                  <span style={{fontSize:16,fontWeight:isToday(day)?700:400,color:isToday(day)?'#4F46C8':T.text}}>{day.getDate()}</span>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
              {wDays.map((day,i)=>{
                const dp=postsFor(day);
                const over=overDate&&sameDay(new Date(overDate),day);
                return(
                  <div key={i} {...dnd(day)} style={{borderRight:i<6?`1px solid ${T.border}`:'none',padding:'5px',minHeight:130,background:over?T.calTodayOver:isToday(day)?T.calToday:'transparent'}}>
                    {dp.map(p=><CalChip key={p.id} post={p} account={aMap[p.accountId]} onSelect={onSelect} onDrag={()=>setDragId(p.id)}/>)}
                    <div onClick={()=>onNewOnDate(day)} style={{marginTop:3,padding:'2px',fontSize:10,color:T.textFaint,textAlign:'center',cursor:'pointer',userSelect:'none'}}>+ добавить</div>
                  </div>
                );
              })}
            </div>
          </>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {mDays.map((day,i)=>{
              const inM=day.getMonth()===ref.getMonth();
              const dp=postsFor(day);
              const over=overDate&&sameDay(new Date(overDate),day);
              return(
                <div key={i} {...dnd(day)} style={{borderRight:i%7<6?`1px solid ${T.border}`:'none',borderBottom:`1px solid ${T.border}`,padding:'4px',minHeight:68,opacity:inM?1:0.28,background:over?T.calTodayOver:isToday(day)?T.calToday:'transparent'}}>
                  <div style={{fontSize:11,textAlign:'right',marginBottom:2,fontWeight:isToday(day)?700:400,color:isToday(day)?'#4F46C8':T.textSec}}>{day.getDate()}</div>
                  {dp.slice(0,3).map(p=><CalChip key={p.id} post={p} account={aMap[p.accountId]} onSelect={onSelect} onDrag={()=>setDragId(p.id)} compact/>)}
                  {dp.length>3&&<div style={{fontSize:9,color:T.textMuted}}>+{dp.length-3}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CalChip({post,account,onSelect,onDrag,compact}){
  const c=PM[account?.platform]?.color||'#ccc';
  return(
    <div draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';onDrag()}} onClick={e=>{e.stopPropagation();onSelect(post.id)}}
      style={{marginBottom:compact?2:3,padding:compact?'1px 4px':'3px 6px',borderRadius:4,borderLeft:`3px solid ${c}`,background:`${c}15`,cursor:'grab',fontSize:compact?9:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',userSelect:'none'}}
      title={post.title}>
      {post.title||'(без названия)'}
    </div>
  );
}

function PostsList({posts,accounts,onSelect,onNew}){
  const T=useT();
  const mob=useMobile();
  const[filters,setFilters]=useState({accountId:'',language:'',status:'',format:'',contentType:''});
  const[sortBy,setSortBy]=useState('date_desc');
  const aMap=useMemo(()=>Object.fromEntries(accounts.map(a=>[a.id,a])),[accounts]);
  const setF=(k,v)=>setFilters(f=>({...f,[k]:v}));
  const hasF=Object.values(filters).some(Boolean);
  const forAnalytics=useMemo(()=>filters.accountId?posts.filter(p=>p.accountId===filters.accountId):posts,[posts,filters.accountId]);
  const analytics=useMemo(()=>{
    const total=forAnalytics.length;
    return CONTENT_TYPES.map(t=>{
      const count=forAnalytics.filter(p=>p.contentType===t.id).length;
      const pct=total>0?Math.round(count/total*100):0;
      return{...t,count,pct};
    });
  },[forAnalytics]);
  const result=useMemo(()=>{
    let r=posts.filter(p=>{
      if(filters.accountId&&p.accountId!==filters.accountId)return false;
      if(filters.language&&p.language!==filters.language)return false;
      if(filters.status&&p.status!==filters.status)return false;
      if(filters.format&&p.format!==filters.format)return false;
      if(filters.contentType&&p.contentType!==filters.contentType)return false;
      return true;
    });
    return[...r].sort((a,b)=>sortBy==='date_asc'?new Date(a.scheduledAt||a.createdAt)-new Date(b.scheduledAt||b.createdAt):sortBy==='title'?(a.title||'').localeCompare(b.title||''):new Date(b.scheduledAt||b.createdAt)-new Date(a.scheduledAt||a.createdAt));
  },[posts,filters,sortBy,aMap]);
  const IS=mkIS(T);
  const fs={...IS,fontSize:mob?14:12,padding:'6px 8px',width:'auto',cursor:'pointer'};
  const selAccLabel=filters.accountId?(accounts.find(a=>a.id===filters.accountId)?.label||''):'Все публикации';
  return(
    <div style={{padding:mob?'16px 14px 90px':'24px 28px',flex:1,overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <h1 style={{fontSize:mob?18:22,fontWeight:700,margin:0,color:T.text}}>Публикации</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{selAccLabel} · {result.length} записей</div>
        </div>
        <Btn onClick={onNew}>+ Добавить</Btn>
      </div>
      {!mob&&<div style={{background:T.card,borderRadius:11,border:`1px solid ${T.border}`,padding:'14px 18px',marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>
          Тип контента {filters.accountId&&<span style={{fontWeight:400,color:T.textFaint}}>· {selAccLabel}</span>}
        </div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {analytics.map(t=>(
            <div key={t.id} style={{flex:1,minWidth:120}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
                <span style={{fontSize:12,fontWeight:500,color:t.color}}>{t.label}</span>
                <span style={{fontSize:18,fontWeight:700,color:T.text,lineHeight:1}}>{t.pct}%</span>
              </div>
              <div style={{height:5,borderRadius:3,background:T.progressBg,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:3,background:t.color,width:`${t.pct}%`,transition:'width 0.3s'}}/>
              </div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>{t.count} публ.</div>
            </div>
          ))}
          <div style={{flex:1,minWidth:80,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',background:T.cardAlt,borderRadius:8,padding:'8px'}}>
            <div style={{fontSize:22,fontWeight:700,color:T.text,lineHeight:1}}>{forAnalytics.length}</div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>всего</div>
          </div>
        </div>
      </div>}
      <div style={{background:T.card,borderRadius:9,padding:'8px 10px',border:`1px solid ${T.border}`,marginBottom:10,display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
        <select value={filters.accountId} onChange={e=>setF('accountId',e.target.value)} style={{...fs,fontWeight:filters.accountId?600:'normal'}}>
          <option value="">Все аккаунты</option>
          {accounts.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <select value={filters.status} onChange={e=>setF('status',e.target.value)} style={fs}><option value="">Все статусы</option>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
        {!mob&&<><select value={filters.contentType} onChange={e=>setF('contentType',e.target.value)} style={fs}><option value="">Тип</option>{CONTENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <select value={filters.language} onChange={e=>setF('language',e.target.value)} style={fs}><option value="">Язык</option><option value="ru">RU</option><option value="fr">FR</option><option value="en">EN</option></select>
        <select value={filters.format} onChange={e=>setF('format',e.target.value)} style={fs}><option value="">Формат</option>{['Post','Reel','Story','Video','Article','Carousel','Poll'].map(f=><option key={f} value={f}>{f}</option>)}</select></>}
        {hasF&&<Btn onClick={()=>setFilters({accountId:'',language:'',status:'',format:'',contentType:''})} variant="ghost" size="sm">Сбросить</Btn>}
      </div>
      {result.length===0?(
        <div style={{background:T.card,borderRadius:10,border:`1px dashed ${T.borderDash}`,padding:'32px',textAlign:'center',color:T.textMuted}}><div style={{fontSize:24,marginBottom:6}}>📭</div><div>Ничего не найдено</div></div>
      ):mob?(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {result.map(post=>{
            const acc=aMap[post.accountId];
            return(
              <div key={post.id} onClick={()=>onSelect(post.id)} style={{background:T.card,borderRadius:10,padding:'12px 14px',border:`1px solid ${T.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:10}}
                onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
                onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                <div style={{width:3,height:36,borderRadius:4,background:PM[acc?.platform]?.color||'#ccc',flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.title||'(без названия)'}</div>
                  <div style={{display:'flex',gap:5,marginTop:4,alignItems:'center',flexWrap:'wrap'}}>
                    {acc&&<AccountChip account={acc}/>}
                    <StatusBadge id={post.status}/>
                  </div>
                </div>
                <div style={{fontSize:12,color:T.textSec,flexShrink:0}}>{displayDate(post.scheduledAt)}</div>
              </div>
            );
          })}
        </div>
      ):(
        <div style={{background:T.card,borderRadius:11,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`1px solid ${T.border}`,background:T.tableHead}}>
              {['Публикация','Аккаунт','Тип','Формат','Дата','Статус'].map((h,i)=><th key={i} style={{padding:'8px 11px',textAlign:'left',fontSize:11,fontWeight:600,color:T.textSec,letterSpacing:'0.03em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {result.map((post,i)=>{
                const acc=aMap[post.accountId];
                return(
                  <tr key={post.id} onClick={()=>onSelect(post.id)} style={{borderBottom:i<result.length-1?`1px solid ${T.borderLight}`:'none',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 11px'}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{post.title||'(без названия)'}</div>{post.notes&&<div style={{fontSize:11,color:T.textMuted,marginTop:1,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.notes}</div>}</td>
                    <td style={{padding:'9px 11px'}}>{acc?<AccountChip account={acc}/>:<span style={{color:T.textFaint,fontSize:12}}>—</span>}</td>
                    <td style={{padding:'9px 11px'}}><ContentTypeBadge id={post.contentType}/></td>
                    <td style={{padding:'9px 11px',fontSize:12,color:T.textSec}}>{post.format||'—'}</td>
                    <td style={{padding:'9px 11px',fontSize:12,color:T.textSec,whiteSpace:'nowrap'}}>{displayDate(post.scheduledAt)}</td>
                    <td style={{padding:'9px 11px'}}><StatusBadge id={post.status}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const FILE_ICONS={image:'🖼️',video:'🎬',pdf:'📄',doc:'📝',other:'📎'};
function getFileType(name){
  if(!name)return'other';
  const ext=(name.split('.').pop()||'').toLowerCase();
  if(['jpg','jpeg','png','gif','webp','svg'].includes(ext))return'image';
  if(['mp4','mov','avi','webm','mkv'].includes(ext))return'video';
  if(ext==='pdf')return'pdf';
  if(['doc','docx','txt','md'].includes(ext))return'doc';
  return'other';
}

function MediaField({mediaRef,mediaData,onFileSelect,onClear}){
  const T=useT();
  const fileRef=React.useRef();
  const ftype=getFileType(mediaRef);
  const isImg=ftype==='image'&&mediaData;

  function handleFile(e){
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>15*1024*1024){alert('Файл слишком большой (макс. 15 МБ). Для больших видео лучше укажи путь вручную.');return;}
    const reader=new FileReader();
    reader.onload=ev=>onFileSelect(file.name,ev.target.result);
    reader.readAsDataURL(file);
    e.target.value='';
  }

  function openFile(){
    if(mediaData){const a=document.createElement('a');a.href=mediaData;a.target='_blank';a.rel='noopener';a.click();}
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <label style={{fontSize:11,fontWeight:600,color:T.textSec,textTransform:'uppercase',letterSpacing:'0.04em'}}>📎 Медиафайл</label>
      <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.md" onChange={handleFile} style={{display:'none'}}/>
      {isImg&&(
        <div style={{borderRadius:8,overflow:'hidden',border:`1px solid ${T.border}`,position:'relative',cursor:'pointer',background:'#000'}} onClick={openFile}>
          <img src={mediaData} alt={mediaRef} style={{width:'100%',maxHeight:200,objectFit:'contain',display:'block'}}/>
          <div style={{position:'absolute',top:7,right:7,background:'rgba(0,0,0,0.55)',borderRadius:5,padding:'3px 8px',fontSize:11,color:'#fff',fontWeight:500}}>Открыть ↗</div>
        </div>
      )}
      {!isImg&&mediaRef&&(
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 11px',borderRadius:8,border:`1px solid ${T.border}`,background:T.cardAlt}}>
          <span style={{fontSize:18,flexShrink:0}}>{FILE_ICONS[ftype]}</span>
          <span style={{fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:T.text}}>{mediaRef}</span>
          {mediaData&&(
            <button onClick={openFile} style={{background:'#EEF2FF',border:'none',cursor:'pointer',fontSize:11,color:'#6366F1',fontFamily:'inherit',fontWeight:600,padding:'3px 8px',borderRadius:5,flexShrink:0,whiteSpace:'nowrap'}}>
              Открыть ↗
            </button>
          )}
        </div>
      )}
      <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>fileRef.current.click()} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 13px',fontSize:12,borderRadius:7,border:`1px solid ${T.inputBorder}`,background:T.card,cursor:'pointer',fontFamily:'inherit',color:T.text,fontWeight:500,whiteSpace:'nowrap'}}>
          {mediaRef?'Заменить файл':'📁 Выбрать файл'}
        </button>
        {mediaRef&&<button onClick={onClear} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:T.textMuted,fontFamily:'inherit',padding:'0 4px'}}>Удалить</button>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:11,color:T.textMuted,whiteSpace:'nowrap'}}>или путь вручную:</span>
        <input value={mediaRef} onChange={e=>onFileSelect(e.target.value,null)} placeholder="~/Desktop/file.jpg" style={{...mkIS(T),fontSize:12}}/>
      </div>
      <div style={{fontSize:10,color:T.textFaint}}>Изображения сохраняются внутри приложения. Видео — лучше указывать путь.</div>
    </div>
  );
}

function PostPanel({post,accounts,initDate,onSave,onDelete,onClose}){
  const isNew=!post;
  const makeDefault=()=>post?{...post,scheduledAt:toInputDate(post.scheduledAt)}:{title:'',accountId:accounts[0]?.id||'',format:'Post',contentType:'',status:'idea',language:'ru',scheduledAt:initDate?toInputDate(initDate):'',text:'',notes:'',mediaRef:'',mediaData:null};
  const[form,setForm]=useState(makeDefault);
  useEffect(()=>setForm(makeDefault()),[post?.id]);
  const sF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const selAcc=accounts.find(a=>a.id===form.accountId);
  const formats=selAcc?(PM[selAcc.platform]?.formats||['Post']):['Post'];
  useEffect(()=>{if(formats.length&&!formats.includes(form.format))sF('format',formats[0])},[form.accountId]);
  const T=useT();
  const mob=useMobile();
  const IS=mkIS(T);
  function handleSave(){
    const now=new Date().toISOString();
    const d={...form,updatedAt:now,...(isNew?{createdAt:now}:{})};
    d.scheduledAt=form.scheduledAt?new Date(form.scheduledAt+'T12:00:00').toISOString():null;
    onSave(d);
  }
  const lbl={fontSize:11,fontWeight:600,color:T.textSec,textTransform:'uppercase',letterSpacing:'0.04em'};
  return(
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200}}/>
      <div style={{position:'fixed',right:0,top:0,bottom:0,width:mob?'100%':430,background:T.card,zIndex:201,boxShadow:'-4px 0 24px rgba(0,0,0,0.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:mob?'16px 18px':'14px 18px',borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:mob?18:16,fontWeight:600,color:T.text}}>{isNew?'Новая публикация':(form.title||'(без названия)')}</div>
              {!isNew&&<div style={{display:'flex',gap:5,marginTop:5,alignItems:'center',flexWrap:'wrap'}}>{selAcc&&<AccountChip account={selAcc}/>}<StatusBadge id={form.status}/></div>}
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:T.textMuted,fontSize:22,padding:'0 4px',lineHeight:1}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:mob?'16px 18px':'14px 18px',display:'flex',flexDirection:'column',gap:mob?14:11}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={lbl}>Название</label>
            <input value={form.title} onChange={e=>sF('title',e.target.value)} placeholder="Тема или заголовок публикации" style={{...IS,fontSize:mob?16:14}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={lbl}>Аккаунт</label>
              <select value={form.accountId} onChange={e=>sF('accountId',e.target.value)} style={IS}>{accounts.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={lbl}>Формат</label>
              <select value={form.format} onChange={e=>sF('format',e.target.value)} style={IS}>{formats.map(f=><option key={f} value={f}>{f}</option>)}</select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={lbl}>Язык</label>
              <select value={form.language} onChange={e=>sF('language',e.target.value)} style={IS}><option value="ru">RU</option><option value="fr">FR</option><option value="en">EN</option></select>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={lbl}>Тип контента</label>
              <select value={form.contentType||''} onChange={e=>sF('contentType',e.target.value)} style={IS}>
                <option value="">— не указан —</option>
                {CONTENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={lbl}>Статус</label>
              <select value={form.status} onChange={e=>sF('status',e.target.value)} style={IS}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            <label style={lbl}>Дата</label>
            <input type="date" value={form.scheduledAt} onChange={e=>sF('scheduledAt',e.target.value)} style={IS}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            <label style={lbl}>Текст публикации</label>
            <textarea value={form.text} onChange={e=>sF('text',e.target.value)} placeholder="Финальный текст для публикации..." rows={4} style={{...IS,resize:'vertical',lineHeight:1.6}}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            <label style={lbl}>Заметки</label>
            <textarea value={form.notes} onChange={e=>sF('notes',e.target.value)} placeholder="Идеи, контекст, напоминания..." rows={2} style={{...IS,resize:'vertical',lineHeight:1.6}}/>
          </div>
          <MediaField
            mediaRef={form.mediaRef||''}
            mediaData={form.mediaData||null}
            onFileSelect={(name,data)=>setForm(f=>({...f,mediaRef:name,mediaData:data}))}
            onClear={()=>setForm(f=>({...f,mediaRef:'',mediaData:null}))}
          />
        </div>
        <div style={{padding:'11px 18px',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>{!isNew&&<Btn onClick={()=>onDelete(post.id)} variant="danger" size="sm">Удалить</Btn>}</div>
          <div style={{display:'flex',gap:6}}><Btn onClick={onClose} variant="secondary">Отмена</Btn><Btn onClick={handleSave}>{isNew?'Создать':'Сохранить'}</Btn></div>
        </div>
      </div>
    </>
  );
}

function Settings({accounts,setAccounts}){
  const T=useT();
  const mob=useMobile();
  const IS=mkIS(T);
  const[showAdd,setShowAdd]=useState(false);
  const[newAcc,setNewAcc]=useState({platform:'instagram',label:'',language:'ru'});
  const toggle=id=>setAccounts(as=>as.map(a=>a.id===id?{...a,active:!a.active}:a));
  const remove=id=>{if(window.confirm('Удалить аккаунт?'))setAccounts(as=>as.filter(a=>a.id!==id))};
  function add(){if(!newAcc.label.trim())return;setAccounts(as=>[...as,{...newAcc,id:`acc_${Date.now()}`,active:true}]);setNewAcc({platform:'instagram',label:'',language:'ru'});setShowAdd(false)}
  return(
    <div style={{padding:mob?'20px 16px 90px':'28px 32px',maxWidth:520,overflowY:'auto',flex:1}}>
      <h1 style={{fontSize:24,fontWeight:600,margin:'0 0 4px',color:T.text}}>Аккаунты</h1>
      <p style={{color:T.textSec,fontSize:13,margin:'0 0 18px'}}>Управляйте аккаунтами, скрывайте неактивные, добавляйте новые.</p>
      <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
        {accounts.map(acc=>{
          const m=PM[acc.platform];
          return(
            <div key={acc.id} style={{background:T.card,borderRadius:9,padding:'9px 13px',border:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:9,opacity:acc.active?1:0.5}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:m?.color||'#ccc',display:'inline-block',flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{acc.label}</div><div style={{fontSize:11,color:T.textMuted}}>{m?.label} · {acc.language?.toUpperCase()}</div></div>
              <button onClick={()=>toggle(acc.id)} style={{padding:'3px 9px',borderRadius:5,border:`1px solid ${T.inputBorder}`,fontSize:11,cursor:'pointer',fontFamily:'inherit',background:acc.active?'#EDEDFF':'transparent',color:acc.active?'#6366F1':'#94A3B8'}}>{acc.active?'Активен':'Скрыт'}</button>
              <button onClick={()=>remove(acc.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.textFaint,fontSize:16,padding:'0 2px',lineHeight:1}}>×</button>
            </div>
          );
        })}
      </div>
      {!showAdd?(
        <Btn onClick={()=>setShowAdd(true)} variant="secondary">+ Добавить аккаунт</Btn>
      ):(
        <div style={{background:T.card,borderRadius:10,padding:'14px 16px',border:`1px solid ${T.border}`}}>
          <div style={{fontSize:15,fontWeight:600,marginBottom:10,color:T.text}}>Новый аккаунт</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{display:'flex',flexDirection:'column',gap:3}}><label style={{fontSize:11,fontWeight:600,color:T.textSec}}>Платформа</label><select value={newAcc.platform} onChange={e=>setNewAcc(a=>({...a,platform:e.target.value}))} style={IS}>{Object.entries(PM).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}><label style={{fontSize:11,fontWeight:600,color:T.textSec}}>Название</label><input value={newAcc.label} onChange={e=>setNewAcc(a=>({...a,label:e.target.value}))} placeholder="Instagram FR" style={IS}/></div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}><label style={{fontSize:11,fontWeight:600,color:T.textSec}}>Язык</label><select value={newAcc.language} onChange={e=>setNewAcc(a=>({...a,language:e.target.value}))} style={IS}><option value="ru">RU</option><option value="fr">FR</option><option value="en">EN</option><option value="multi">Multi</option></select></div>
          </div>
          <div style={{display:'flex',gap:6}}><Btn onClick={add}>Добавить</Btn><Btn onClick={()=>setShowAdd(false)} variant="secondary">Отмена</Btn></div>
        </div>
      )}
    </div>
  );
}

let _c=Date.now();
const newId=()=>`p${++_c}`;

export default function App(){
  const[view,setView]=useState('dashboard');
  const[accounts,setAccountsState]=useState(DEF_ACCOUNTS);
  const[posts,setPostsState]=useState([]);
  const[loading,setLoading]=useState(true);
  const[panel,setPanel]=useState(null);
  const[dismissed,setDismissed]=useState(false);
  const[dark,setDark]=useState(()=>localStorage.getItem('theme')==='dark');
  const T=dark?THEMES.dark:THEMES.light;

  useEffect(()=>{localStorage.setItem('theme',dark?'dark':'light')},[dark]);

  // Load posts from Firebase
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'posts'),snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      setPostsState(data);
      setLoading(false);
    });
    return unsub;
  },[]);

  // Load accounts from Firebase
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'accounts'),snap=>{
      if(snap.docs.length>0){
        setAccountsState(snap.docs.map(d=>({id:d.id,...d.data()})));
      } else {
        // First launch — save default accounts to Firebase
        DEF_ACCOUNTS.forEach(a=>setDoc(doc(db,'accounts',a.id),a));
      }
    });
    return unsub;
  },[]);

  // Auto-publish
  useEffect(()=>{
    function autoPublish(){
      const now=new Date();
      posts.forEach(p=>{
        if(p.status==='scheduled'&&p.scheduledAt&&new Date(p.scheduledAt)<=now){
          const updated={...p,status:'published',publishedAt:p.scheduledAt,updatedAt:now.toISOString()};
          setDoc(doc(db,'posts',p.id),updated);
        }
      });
    }
    autoPublish();
    const timer=setInterval(autoPublish,60000);
    return()=>clearInterval(timer);
  },[posts]);

  // Save accounts to Firebase when changed
  function setAccounts(updater){
    const updated=typeof updater==='function'?updater(accounts):updater;
    updated.forEach(a=>setDoc(doc(db,'accounts',a.id),a));
    // Delete removed accounts
    accounts.forEach(a=>{if(!updated.find(u=>u.id===a.id))deleteDoc(doc(db,'accounts',a.id))});
  }

  const wDays=getWeekDays(new Date());
  const wEnd=new Date(wDays[6]);wEnd.setHours(23,59,59,999);
  const thisWeek=posts.filter(p=>p.scheduledAt&&new Date(p.scheduledAt)>=wDays[0]&&new Date(p.scheduledAt)<=wEnd&&p.status!=='published');
  const showReminder=!dismissed&&thisWeek.length===0;

  const panelPost=useMemo(()=>{if(!panel||panel==='new'||(typeof panel==='object'))return null;return posts.find(p=>p.id===panel)||null},[panel,posts]);
  const panelDate=panel&&typeof panel==='object'&&panel.date?panel.date:null;

  async function savePost(form){
    const now=new Date().toISOString();
    const id=form.id||newId();
    const data={...form,id,updatedAt:now,...(!form.id?{createdAt:now}:{})};
    await setDoc(doc(db,'posts',id),data);
    setPanel(null);
  }

  async function deletePost(id){
    await deleteDoc(doc(db,'posts',id));
    setPanel(null);
  }

  async function movePost(id,date){
    const p=posts.find(x=>x.id===id);
    if(!p)return;
    const updated={...p,scheduledAt:date,status:['idea','draft'].includes(p.status)?'scheduled':p.status,updatedAt:new Date().toISOString()};
    await setDoc(doc(db,'posts',id),updated);
  }

  if(loading){
    return(
      <ThemeCtx.Provider value={{dark,T,setDark}}>
        <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:T.bg,fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:12}}>🌿</div>
            <div style={{fontSize:14,color:T.textSec}}>Загружаем данные...</div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );
  }

  return(
    <ThemeCtx.Provider value={{dark,T,setDark}}>
      <AppInner view={view} setView={setView} accounts={accounts} setAccounts={setAccounts} posts={posts} panel={panel} setPanel={setPanel} panelPost={panelPost} panelDate={panelDate} showReminder={showReminder} setDismissed={setDismissed} savePost={savePost} deletePost={deletePost} movePost={movePost}/>
    </ThemeCtx.Provider>
  );
}

function AppInner({view,setView,accounts,setAccounts,posts,panel,setPanel,panelPost,panelDate,showReminder,setDismissed,savePost,deletePost,movePost}){
  const T=useT();
  const mob=useMobile();
  return(
    <div style={{display:'flex',height:'100vh',width:'100%',background:T.bg,overflow:'hidden',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      {!mob&&<Sidebar view={view} setView={setView} accounts={accounts}/>}
      <main style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
        {view==='dashboard'&&<Dashboard posts={posts} accounts={accounts} showReminder={showReminder} onDismiss={()=>setDismissed(true)} onNew={()=>setPanel('new')} onSelect={setPanel} goCalendar={()=>setView('calendar')}/>}
        {view==='calendar'&&<CalendarView posts={posts} accounts={accounts} onSelect={setPanel} onNewOnDate={d=>setPanel({date:d})} onMove={movePost}/>}
        {view==='posts'&&<PostsList posts={posts} accounts={accounts} onSelect={setPanel} onNew={()=>setPanel('new')}/>}
        {view==='settings'&&<Settings accounts={accounts} setAccounts={setAccounts}/>}
      </main>
      {mob&&<BottomNav view={view} setView={setView}/>}
      {panel&&<PostPanel post={panelPost} accounts={accounts} initDate={panelDate} onSave={savePost} onDelete={deletePost} onClose={()=>setPanel(null)}/>}
    </div>
  );
}
