import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Upload, X, Send, Leaf, Activity,
  Lightbulb, Bot, User, Scan, ArrowLeft, Camera,
  FileText, RefreshCw, ChevronDown, Zap, Mic, MicOff,
  Volume2, VolumeX, Shield, Brain, Clock, Droplets,
  Sun, Wind, Sprout, TreePine, FlaskConical, BarChart3,
  AlertTriangle, CheckCircle, ListChecks, HelpCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message    { sender: 'user' | 'bot'; text: string; }
interface Prediction {
  disease:    string;
  display?:   string;
  confidence: number;
  advice:     string;
  status?:    'healthy' | 'mild' | 'moderate' | 'severe';
  all_probs?: Record<string, number>;
  source?:    string;
}

// ── API URLs ──────────────────────────────────────────────────────────────────
const CHAT_URL        = 'http://127.0.0.1:5001/ask';
const CHAT_STREAM_URL = 'http://127.0.0.1:5001/ask-stream';
const VISION_URL      = 'http://127.0.0.1:4000/predict';
const PLANT_VIDEO_SRC = './crop.mp4';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' '); }

function getStatus(d: string, apiStatus?: string): 'healthy' | 'mild' | 'moderate' | 'severe' {
  if (apiStatus && ['healthy','mild','moderate','severe'].includes(apiStatus))
    return apiStatus as any;
  const l = d.toLowerCase();
  if (l.includes('healthy'))                           return 'healthy';
  if (l.includes('early'))                             return 'mild';
  if (l.includes('curl') || l.includes('virus'))      return 'severe';
  if (l.includes('uncertain'))                         return 'mild';
  return 'moderate';
}

const SC = {
  healthy:  { color:'text-emerald-400', bg:'bg-emerald-900/30',  border:'border-emerald-700',  label:'Healthy',        dot:'bg-emerald-400' },
  mild:     { color:'text-amber-400',   bg:'bg-amber-900/30',    border:'border-amber-700',    label:'Mild Issue',     dot:'bg-amber-400'   },
  moderate: { color:'text-orange-400',  bg:'bg-orange-900/30',   border:'border-orange-700',   label:'Moderate Issue', dot:'bg-orange-400'  },
  severe:   { color:'text-red-400',     bg:'bg-red-900/30',      border:'border-red-700',      label:'Severe Issue',   dot:'bg-red-400'     },
};

// ─── Wheel data ───────────────────────────────────────────────────────────────
const WHEEL_SEGMENTS = [
  { label:'CNN AI Model',       color:'#4ade80', glow:'#4ade8060', desc:'Powered by MobileNetV2 trained on thousands of leaf images — delivering accurate disease detection across multiple classes.' },
  { label:'Instant Results',    color:'#86efac', glow:'#86efac50', desc:'Upload a photo and receive a full diagnosis in seconds. No waiting, no sign-up — just instant intelligence.' },
  { label:'Treatment Plans',    color:'#22c55e', glow:'#22c55e50', desc:'Every diagnosis comes with science-backed treatment protocols including organic remedies, fungicide tips, and recovery plans.' },
  { label:'AI Chat Assistant',  color:'#16a34a', glow:'#16a34a50', desc:'Ask anything, anytime. Our AI assistant answers plant care questions, watering schedules, and disease prevention — 24/7.' },
  { label:'Voice Support',      color:'#15803d', glow:'#15803d50', desc:'Speak your question with the mic button or let the AI read your diagnosis aloud — hands-free plant care for farmers.' },
  { label:'500+ Plant Library', color:'#166534', glow:'#16653450', desc:'Extensive database of plant species with companion planting guides, seasonal care calendars, and pest resistance ratings.' },
  { label:'Privacy First',      color:'#14532d', glow:'#14532d50', desc:'Your images are analyzed instantly and never stored or shared. Plant AI processes everything in real-time with zero data retention.' },
  { label:'100% Free',          color:'#052e16', glow:'#052e1650', desc:'No subscription. No paywall. Full AI-powered plant diagnostics, chat, and care advice — completely free.' },
];

const FEATURES = [
  { icon:Brain,       title:'CNN Deep Learning',           desc:'MobileNetV2 trained on PlantVillage identifies disease classes with high accuracy across multiple crop types.',          accent:'#4ade80' },
  { icon:Clock,       title:'Real-Time Diagnosis',         desc:'Upload a photo and receive a comprehensive disease report within seconds. No waiting, no appointments.',              accent:'#34d399' },
  { icon:FlaskConical,title:'Treatment Protocols',         desc:'Beyond detection — get science-backed treatment plans with organic remedies, fungicide recommendations, and care schedules.', accent:'#6ee7b7' },
  { icon:Droplets,    title:'Watering Intelligence',       desc:'Our AI understands soil moisture, humidity, and seasonal patterns to give you precision watering schedules.',            accent:'#5eead4' },
  { icon:BarChart3,   title:'Confidence Analysis',         desc:'Every result shows a probability breakdown so you can see exactly how certain the AI is about each diagnosis.',         accent:'#86efac' },
  { icon:Sprout,      title:'Plant Library',               desc:'Extensive database of plant species with growth guides, companion planting advice, and pest resistance ratings.',       accent:'#a3e635' },
];

// ─── Interactive Wheel ────────────────────────────────────────────────────────
function PlantWheel() {
  const [active, setActive] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setEntered(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const cx = 200, cy = 200, outerR = 185, innerR = 90, gap = 0.04;
  const total = WHEEL_SEGMENTS.length;

  function arc(i: number) {
    const slice = (2 * Math.PI) / total;
    const start = -Math.PI / 2 + i * slice + gap;
    const end   = -Math.PI / 2 + (i + 1) * slice - gap;
    const cos = (a: number, r: number) => cx + r * Math.cos(a);
    const sin = (a: number, r: number) => cy + r * Math.sin(a);
    return `M${cos(start,outerR)} ${sin(start,outerR)} A${outerR} ${outerR} 0 0 1 ${cos(end,outerR)} ${sin(end,outerR)} L${cos(end,innerR)} ${sin(end,innerR)} A${innerR} ${innerR} 0 0 0 ${cos(start,innerR)} ${sin(start,innerR)}Z`;
  }
  const mid = (i: number) => -Math.PI / 2 + (i + 0.5) * (2 * Math.PI / total);

  return (
    <div ref={ref} className="flex flex-col xl:flex-row items-center justify-center gap-16">
      <div className="relative flex-shrink-0" style={{ width:400, height:400 }}>
        <svg width="400" height="400" viewBox="0 0 400 400">
          {WHEEL_SEGMENTS.map((seg, i) => {
            const isActive = active === i;
            const dimmed   = active !== null && !isActive;
            return (
              <path key={i} d={arc(i)} fill={seg.color}
                opacity={dimmed ? 0.2 : isActive ? 1 : 0.75}
                style={{ cursor:'pointer', transform: isActive ? 'scale(1.06)' : 'scale(1)', transformOrigin:`${cx}px ${cy}px`, transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)', animation: entered ? `segPop 0.6s ease ${i*0.08}s both` : 'none', filter: isActive ? `drop-shadow(0 0 16px ${seg.glow})` : 'none' }}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              />
            );
          })}
          {WHEEL_SEGMENTS.map((_, i) => {
            const angle = mid(i);
            return <line key={i} x1={cx+(innerR+4)*Math.cos(angle)} y1={cy+(innerR+4)*Math.sin(angle)} x2={cx+(outerR-4)*Math.cos(angle)} y2={cy+(outerR-4)*Math.sin(angle)} stroke="rgba(0,0,0,0.25)" strokeWidth="1" style={{ pointerEvents:'none' }}/>;
          })}
          <circle cx={cx} cy={cy} r={innerR-1} fill="#0a1a0f" stroke="#1f3a1f" strokeWidth="1.5"/>
          <circle cx={cx} cy={cy} r={outerR+2} fill="none" stroke="#1f3a1f" strokeWidth="1"/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ background:'radial-gradient(circle,#16a34a22,#16a34a08)', border:'1px solid #16a34a55' }}>
            <Leaf className="w-7 h-7 text-green-400"/>
          </div>
          <p className="text-xs font-black tracking-[0.2em] text-green-400 uppercase">Plant AI</p>
          <p className="text-[11px] text-green-600 mt-1 font-medium">{active !== null ? WHEEL_SEGMENTS[active].label : '8 Features'}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 max-w-sm w-full">
        <div className="rounded-2xl border p-5 transition-all duration-500 min-h-[100px]"
          style={{ background: active !== null ? WHEEL_SEGMENTS[active].glow : 'rgba(255,255,255,0.03)', border: `1px solid ${active !== null ? WHEEL_SEGMENTS[active].color+'44' : '#1f3a1f'}` }}>
          {active !== null ? (
            <><div className="flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full" style={{ background:WHEEL_SEGMENTS[active].color }}/><p className="font-bold text-white text-sm">{WHEEL_SEGMENTS[active].label}</p></div><p className="text-green-300/70 text-xs leading-relaxed">{WHEEL_SEGMENTS[active].desc}</p></>
          ) : (
            <p className="text-green-600 text-xs leading-relaxed flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"/>Hover over a segment to explore what Plant AI offers</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WHEEL_SEGMENTS.map((seg, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
              style={{ background: active===i ? `${seg.color}18` : 'rgba(255,255,255,0.03)', border:`1px solid ${active===i ? seg.color+'55' : '#1f3a1f'}` }}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background:seg.color, boxShadow:active===i ? `0 0 6px ${seg.color}` : 'none' }}/>
              <span className="text-xs font-medium leading-tight" style={{ color:active===i ? seg.color : '#6b9f6b' }}>{seg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix='' }: { target:number; suffix?:string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let start = 0; const step = target / 60;
      const t = setInterval(() => { start = Math.min(start+step, target); setVal(Math.round(start)); if(start>=target) clearInterval(t); }, 20);
      obs.disconnect();
    }, { threshold:0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Speaker button ───────────────────────────────────────────────────────────
function SpeakerButton({ text }: { text:string }) {
  const [speaking, setSpeaking] = useState(false);
  const handle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  };
  if (!('speechSynthesis' in window)) return null;
  return (
    <button onClick={handle} className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border"
      style={{ background:speaking?'rgba(74,222,128,0.1)':'rgba(255,255,255,0.04)', border:speaking?'1px solid #4ade8055':'1px solid #1f3a1f', color:speaking?'#4ade80':'#6b9f6b' }}>
      {speaking ? <><VolumeX className="w-3 h-3"/>Stop</> : <><Volume2 className="w-3 h-3"/>Read aloud</>}
    </button>
  );
}

// ─── Speech recognition hook ──────────────────────────────────────────────────
function useSpeechRecognition(onResult: (text:string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    recRef.current = new SR();
    recRef.current.lang = 'en-US'; recRef.current.interimResults = false;
    recRef.current.onresult = (e: any) => { onResult(e.results[0][0].transcript); setListening(false); };
    recRef.current.onend = () => setListening(false);
    recRef.current.onerror = () => setListening(false);
    recRef.current.start(); setListening(true);
  };
  const stopListening = () => { recRef.current?.stop(); setListening(false); };
  return { listening, startListening, stopListening };
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      {[0,0.18,0.36].map((d,i)=>(
        <span key={i} className="w-2 h-2 rounded-full bg-green-400/70 animate-bounce" style={{ animationDelay:`${d}s` }}/>
      ))}
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
function ConfBar({ value }: { value:number }) {
  const pct = Math.round(value*100);
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-xs text-green-600">AI Confidence</span>
        <span className="text-xs font-bold text-green-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${pct}%`, background:'linear-gradient(to right,#16a34a,#4ade80)', boxShadow:'0 0 8px rgba(74,222,128,0.4)' }}/>
      </div>
      <p className="mt-1.5 text-[11px] text-green-700">
        {pct>=90?'High confidence — very reliable':pct>=70?'Moderate confidence — results are reliable':'Low confidence — try a clearer image'}
      </p>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function Step({ icon:Icon, title, desc, num }: { icon:React.ElementType; title:string; desc:string; num:number }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 group">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)' }}>
          <Icon className="w-7 h-7 text-green-400"/>
        </div>
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', boxShadow:'0 0 8px rgba(22,163,74,0.5)' }}>{num}</span>
      </div>
      <div>
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-xs text-green-600 mt-1 max-w-[140px] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Floating chat widget ─────────────────────────────────────────────────────
function FloatingChat({ chatOpen, setChatOpen, messages, botTyping, query, setQuery, sendMsg, msgEnd, listening, startListening, stopListening }: {
  chatOpen:boolean; setChatOpen:(v:boolean)=>void; messages:Message[]; botTyping:boolean;
  query:string; setQuery:(v:string)=>void; sendMsg:()=>void; msgEnd:React.RefObject<HTMLDivElement>;
  listening:boolean; startListening:()=>void; stopListening:()=>void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button onClick={() => setChatOpen(!chatOpen)}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ background:chatOpen?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#16a34a,#15803d)', border:'1px solid rgba(74,222,128,0.2)', boxShadow:chatOpen?'none':'0 8px 32px rgba(22,163,74,0.4)' }}>
        {chatOpen ? <X className="w-5 h-5 text-green-400"/> : <span className="text-sm font-black text-white">AI</span>}
      </button>
      {chatOpen && (
        <div className="absolute bottom-16 right-0 w-[340px] h-[480px] rounded-2xl flex flex-col overflow-hidden"
          style={{ background:'#0a1a0f', border:'1px solid #1f3a1f', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor:'#1f3a1f', background:'#0d2010' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)' }}>
              <Bot className="w-4 h-4 text-green-400"/>
            </div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">Plant AI Chat</p><p className="text-[11px] text-green-500">Always here to help</p></div>
            <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow:'0 0 6px #4ade80' }}/>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background:'#080f08' }}>
            {messages.map((m,i) => (
              <div key={i} className={cn('flex gap-2', m.sender==='user'?'flex-row-reverse':'flex-row')}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={m.sender==='user' ? { background:'linear-gradient(135deg,#16a34a,#15803d)' } : { background:'rgba(74,222,128,0.08)', border:'1px solid #1f3a1f' }}>
                  {m.sender==='user' ? <User className="w-3 h-3 text-white"/> : <Bot className="w-3 h-3 text-green-400"/>}
                </div>
                <div className="flex flex-col items-start max-w-[78%]">
                  <div className="rounded-2xl px-3 py-2 text-xs leading-relaxed"
                    style={m.sender==='user'
                      ? { background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white', borderRadius:'12px 12px 2px 12px' }
                      : { background:'rgba(255,255,255,0.04)', border:'1px solid #1f3a1f', color:'#86efac', borderRadius:'12px 12px 12px 2px' }}>
                    {m.text}
                  </div>
                  {m.sender==='bot' && m.text !== '' && <SpeakerButton text={m.text}/>}
                </div>
              </div>
            ))}
            {botTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background:'rgba(74,222,128,0.08)', border:'1px solid #1f3a1f' }}><Bot className="w-3 h-3 text-green-400"/></div>
                <div className="rounded-2xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #1f3a1f' }}><TypingDots/></div>
              </div>
            )}
            <div ref={msgEnd}/>
          </div>
          <div className="p-3 border-t" style={{ borderColor:'#1f3a1f', background:'#0a1a0f' }}>
            {listening && <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/><span className="text-[11px] text-red-400 font-medium">Listening…</span></div>}
            <div className="flex gap-2">
              <input value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
                placeholder={listening?'Listening…':'Ask something…'}
                className="flex-1 h-9 px-3 rounded-xl text-xs placeholder:text-green-800 focus:outline-none transition"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid #1f3a1f', color:'#86efac' }}/>
              <button onClick={listening?stopListening:startListening}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition"
                style={{ background:listening?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.04)', border:`1px solid ${listening?'#7f1d1d':'#1f3a1f'}`, color:listening?'#f87171':'#4ade80' }}>
                {listening?<MicOff className="w-3.5 h-3.5"/>:<Mic className="w-3.5 h-3.5"/>}
              </button>
              <button onClick={sendMsg} disabled={!query.trim()||botTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-30"
                style={{ background:'linear-gradient(135deg,#16a34a,#15803d)' }}>
                <Send className="w-3.5 h-3.5 text-white"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]           = useState<'home'|'detect'|'chat'>('home');
  const [chatOpen,setChatOpen]       = useState(false);
  const [query,setQuery]             = useState('');
  const [messages,setMessages]       = useState<Message[]>([
    { sender:'bot', text:"Hello! I'm your Plant AI assistant. I can help with plant care advice, disease identification, watering schedules, and more. What would you like to know?" }
  ]);
  const [botTyping,setBotTyping]     = useState(false);
  const [file,setFile]               = useState<File|null>(null);
  const [preview,setPreview]         = useState<string|null>(null);
  const [results,setResults]         = useState<Prediction|null>(null);
  const [loading,setLoading]         = useState(false);
  const [dragActive,setDragActive]   = useState(false);
  const [visionError,setVisionError] = useState('');
  const [heroLoaded,setHeroLoaded]   = useState(false);
  const msgEnd   = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, botTyping]);
  useEffect(() => { setTimeout(() => setHeroLoaded(true), 100); }, []);

  const { listening, startListening, stopListening } = useSpeechRecognition(text => setQuery(text));

  // ── Chat ────────────────────────────────────────────────────────────────────
  const sendMsg = () => {
    const t = query.trim();
    if (!t || botTyping) return;
    setMessages(p => [...p, { sender:'user', text:t }]);
    setQuery(''); setBotTyping(true);
    setMessages(p => [...p, { sender:'bot', text:'' }]);
    let fullText = '', firstChunk = true;
    try {
      const evtSource = new EventSource(`${CHAT_STREAM_URL}?query=${encodeURIComponent(t)}`);
      const timeout = setTimeout(() => { evtSource.close(); if (!fullText) fallbackChat(t); }, 3000);
      evtSource.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data === '[DONE]') { evtSource.close(); setBotTyping(false); return; }
        if (firstChunk) { setBotTyping(false); firstChunk = false; }
        fullText += e.data;
        setMessages(p => { const u=[...p]; u[u.length-1]={ sender:'bot', text:fullText }; return u; });
      };
      evtSource.onerror = () => { evtSource.close(); clearTimeout(timeout); if (!fullText) fallbackChat(t); };
    } catch { fallbackChat(t); }
  };

  const fallbackChat = async (t: string) => {
    try {
      const r = await fetch(CHAT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ query:t }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setMessages(p => { const u=[...p]; u[u.length-1]={ sender:'bot', text:d.answer||"I don't know that yet." }; return u; });
    } catch {
      setMessages(p => { const u=[...p]; u[u.length-1]={ sender:'bot', text:"⚠️ Could not reach the chatbot server. Make sure: cd chatbot && python chat_service.py" }; return u; });
    } finally { setBotTyping(false); }
  };

  // ── Vision ──────────────────────────────────────────────────────────────────
  const applyFile = (f: File) => { setFile(f); setResults(null); setVisionError(''); setPreview(URL.createObjectURL(f)); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) applyFile(f);
  };
  const diagnose = async () => {
    if (!file) return; setLoading(true); setVisionError('');
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(VISION_URL, { method:'POST', body:fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResults(d);
    } catch(e: any) {
      setVisionError(`⚠️ Vision server error: ${e.message}. Make sure: cd vision && python vision_service.py`);
    } finally { setLoading(false); }
  };
  const reset = () => {
    window.speechSynthesis?.cancel();
    setFile(null); setPreview(null); setResults(null); setVisionError('');
  };

  const status = results ? getStatus(results.disease, results.status) : null;
  const sc     = status  ? SC[status] : null;

  // ─── Shared styles ────────────────────────────────────────────────────────
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; background: #030a03; }
    .font-display { font-family: 'Syne', sans-serif; }
    @keyframes segPop { from { opacity:0; transform:scale(0.6); transform-origin:200px 200px; } to { opacity:1; transform:scale(1); transform-origin:200px 200px; } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes slideRight { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulseGlow { 0%,100% { box-shadow:0 0 20px rgba(74,222,128,0.2); } 50% { box-shadow:0 0 40px rgba(74,222,128,0.5); } }
    .anim-fade-up { animation:fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) both; }
    .anim-fade-in { animation:fadeIn 1s ease both; }
    .anim-slide-r { animation:slideRight 0.7s ease both; }
    .delay-100 { animation-delay:0.1s; } .delay-200 { animation-delay:0.2s; }
    .delay-300 { animation-delay:0.3s; } .delay-500 { animation-delay:0.5s; }
    .nav-glass { background:rgba(3,10,3,0.7); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
    .video-overlay { background:linear-gradient(to bottom,rgba(3,10,3,0.2) 0%,rgba(3,10,3,0.15) 40%,rgba(3,10,3,0.6) 75%,rgba(3,10,3,1) 100%); }
    .hero-text-glow { text-shadow:0 0 60px rgba(74,222,128,0.3),0 2px 20px rgba(0,0,0,0.5); }
    .stat-card-dark { background:rgba(255,255,255,0.02); border:1px solid rgba(74,222,128,0.08); transition:transform 0.3s ease,border-color 0.3s ease,box-shadow 0.3s ease; }
    .stat-card-dark:hover { transform:translateY(-4px); border-color:rgba(74,222,128,0.25); box-shadow:0 16px 40px rgba(0,0,0,0.4); }
    .feature-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); transition:all 0.3s ease; }
    .feature-card:hover { background:rgba(74,222,128,0.04); border-color:rgba(74,222,128,0.2); transform:translateY(-3px); }
    .btn-primary { background:linear-gradient(135deg,#16a34a,#15803d); box-shadow:0 4px 24px rgba(22,163,74,0.35); transition:all 0.2s ease; }
    .btn-primary:hover { transform:translateY(-1px) scale(1.02); box-shadow:0 8px 32px rgba(22,163,74,0.5); }
    .btn-ghost { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); backdrop-filter:blur(8px); transition:all 0.2s ease; }
    .btn-ghost:hover { background:rgba(255,255,255,0.1); border-color:rgba(74,222,128,0.3); }
    .section-divider { background:linear-gradient(to right,transparent,rgba(74,222,128,0.3),transparent); height:1px; width:100%; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:#030a03; }
    ::-webkit-scrollbar-thumb { background:#1f3a1f; border-radius:2px; }
  `;

  // ════════════════════════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════════════════════════
  if (screen === 'home') return (
    <div className="min-h-screen text-white font-sans" style={{ background:'#030a03' }}>
      <style>{globalStyles}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-glass border-b" style={{ borderColor:'rgba(74,222,128,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className={cn('flex items-center gap-3', heroLoaded?'anim-slide-r':'opacity-0')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', boxShadow:'0 0 16px rgba(22,163,74,0.4)' }}>
              <Leaf className="w-4 h-4 text-white"/>
            </div>
            <span className="font-display text-lg font-extrabold text-white tracking-tight">Plant AI</span>
          </div>
          <div className={cn('hidden md:flex items-center gap-8 text-sm text-green-600', heroLoaded?'anim-fade-in delay-200':'opacity-0')}>
            <button onClick={()=>setScreen('detect')} className="hover:text-green-300 transition font-medium">Analyze</button>
            <button onClick={()=>setScreen('chat')}   className="hover:text-green-300 transition font-medium">Assistant</button>
            <span className="hover:text-green-300 transition cursor-pointer font-medium">Library</span>
          </div>
          <button onClick={()=>setScreen('detect')} className={cn('btn-primary text-white font-semibold text-sm px-5 py-2.5 rounded-full', heroLoaded?'anim-fade-in delay-300':'opacity-0')}>
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO — scroll indicator removed; extra pb-36 keeps content above fold bottom */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={videoRef} autoPlay muted loop playsInline className="w-full h-full object-cover"
            style={{ filter:'brightness(0.65) saturate(1.3) contrast(1.05)' }}>
            <source src={PLANT_VIDEO_SRC} type="video/mp4"/>
          </video>
          <div className="video-overlay absolute inset-0"/>
          <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(3,10,3,0.5) 100%)' }}/>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-28 pb-36">
          <div className={cn('inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-widest', heroLoaded?'anim-fade-up':'opacity-0')}
            style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', color:'#4ade80', backdropFilter:'blur(8px)' }}>
            <Zap className="w-3 h-3"/> AI-Powered Plant Intelligence
          </div>
          <h1 className={cn('font-display text-6xl md:text-8xl font-extrabold leading-[1.0] mb-6 hero-text-glow', heroLoaded?'anim-fade-up delay-100':'opacity-0')}>
            <span className="text-white">Every Leaf</span><br/>
            <span style={{ color:'#4ade80' }}>Tells a Story</span>
          </h1>
          <p className={cn('text-green-300/60 text-lg max-w-2xl mx-auto mb-12 leading-relaxed font-light', heroLoaded?'anim-fade-up delay-200':'opacity-0')}>
            Detect plant diseases in seconds. Get expert care protocols, precision watering schedules, and a lifetime of botanical knowledge — all powered by deep learning.
          </p>
          <div className={cn('flex items-center justify-center gap-4 flex-wrap', heroLoaded?'anim-fade-up delay-300':'opacity-0')}>
            <button onClick={()=>setScreen('detect')} className="btn-primary flex items-center gap-2.5 text-white font-bold px-8 py-4 rounded-full text-sm">
              <Scan className="w-4 h-4"/> Analyze Your Plant
            </button>
            <button onClick={()=>setScreen('chat')} className="btn-ghost flex items-center gap-2.5 text-white font-semibold px-8 py-4 rounded-full text-sm">
              <MessageCircle className="w-4 h-4"/> Talk to Assistant
            </button>
          </div>
          <div className={cn('flex items-center justify-center gap-6 mt-12 flex-wrap', heroLoaded?'anim-fade-up delay-500':'opacity-0')}>
            {[{icon:Shield,text:'High Accuracy'},{icon:Brain,text:'Multiple Diseases'},{icon:Clock,text:'Instant Results'}].map(({icon:Icon,text},i)=>(
              <div key={i} className="flex items-center gap-2 text-xs text-green-500" style={{ opacity:0.75 }}>
                <Icon className="w-3.5 h-3.5"/><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Scroll indicator intentionally removed to prevent overlap with hero content */}
      </section>

      {/* STATS */}
      <section className="py-12 px-6" style={{ background:'rgba(255,255,255,0.01)', borderTop:'1px solid rgba(74,222,128,0.06)', borderBottom:'1px solid rgba(74,222,128,0.06)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{val:14,suffix:'+',label:'Disease Classes'},{val:90,suffix:'%+',label:'Detection Accuracy'},{val:300,suffix:'+',label:'Images Per Class'},{val:2,suffix:'',label:'Backend Services'}].map((s,i)=>(
            <div key={i} className="stat-card-dark rounded-2xl p-5 text-center">
              <p className="font-display text-3xl font-extrabold" style={{ color:'#4ade80', textShadow:'0 0 20px rgba(74,222,128,0.3)' }}>
                <AnimatedCounter target={s.val} suffix={s.suffix}/>
              </p>
              <p className="text-xs text-green-700 mt-1.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-28 px-6" style={{ background:'linear-gradient(180deg,#030a03 0%,#050f05 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.25em] mb-3 font-bold" style={{ color:'#4ade80' }}>What We Provide</p>
          <h2 className="font-display text-center text-4xl font-extrabold text-white mb-4">Complete Plant Intelligence</h2>
          <p className="text-center text-green-600 text-sm mb-16 max-w-lg mx-auto">Every tool a botanist, farmer, or plant lover needs — in one AI-powered platform.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {FEATURES.map((f,i)=>(
              <div key={i} className="feature-card rounded-2xl p-6 group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110" style={{ background:`${f.accent}12`, border:`1px solid ${f.accent}22` }}>
                  <f.icon className="w-5 h-5" style={{ color:f.accent }}/>
                </div>
                <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-green-700 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6"/>

      {/* HOW IT WORKS */}
      <section className="py-28 px-6" style={{ background:'#030a03' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.25em] mb-3 font-bold" style={{ color:'#4ade80' }}>Simple Process</p>
          <h2 className="font-display text-center text-4xl font-extrabold text-white mb-16">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {[{icon:Camera,title:'Click a Pic',desc:'Take a clear photo of your plant leaf in good light'},{icon:Upload,title:'Upload to Plant AI',desc:'Drop your image on the analyze page instantly'},{icon:FileText,title:'Get Your Report',desc:'AI diagnoses and creates a detailed health report'},{icon:MessageCircle,title:'Chat with AI',desc:'Ask about care, treatments, and prevention tips'}].map((s,i)=>(
              <Step key={i} icon={s.icon} title={s.title} desc={s.desc} num={i+1}/>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6"/>

      {/* WHEEL */}
      <section className="py-28 px-6" style={{ background:'linear-gradient(180deg,#030a03 0%,#050f05 50%,#030a03 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.25em] mb-3 font-bold" style={{ color:'#4ade80' }}>Why Choose Us</p>
          <h2 className="font-display text-center text-4xl font-extrabold text-white mb-3">Why Use Plant AI?</h2>
          <p className="text-center text-green-700 text-sm mb-16 max-w-md mx-auto">Hover over each segment to explore what makes Plant AI the smartest plant care platform</p>
          <PlantWheel/>
        </div>
      </section>

      <div className="section-divider mx-6"/>

      {/* CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden" style={{ background:'#030a03' }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] rounded-full opacity-10" style={{ background:'radial-gradient(ellipse,#16a34a 0%,transparent 70%)', filter:'blur(60px)' }}/>
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8" style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)', animation:'pulseGlow 3s ease-in-out infinite' }}>
            <TreePine className="w-7 h-7 text-green-400"/>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white mb-5 hero-text-glow">Start diagnosing<br/>your plants today</h2>
          <p className="text-green-600 text-sm mb-10 leading-relaxed max-w-md mx-auto">Upload a leaf photo and get an AI-powered diagnosis in seconds. Free, fast, and accurate.</p>
          <button onClick={()=>setScreen('detect')} className="btn-primary text-white font-bold px-10 py-4 rounded-full text-sm inline-flex items-center gap-2">
            <Scan className="w-4 h-4"/> Try It Free
          </button>
        </div>
      </section>

      <FloatingChat chatOpen={chatOpen} setChatOpen={setChatOpen} messages={messages} botTyping={botTyping} query={query} setQuery={setQuery} sendMsg={sendMsg} msgEnd={msgEnd} listening={listening} startListening={startListening} stopListening={stopListening}/>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // CHAT SCREEN
  // ════════════════════════════════════════════════════════════
  if (screen === 'chat') return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background:'#030a03' }}>
      <style>{globalStyles}</style>
      <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor:'#1f3a1f', background:'rgba(3,10,3,0.9)', backdropFilter:'blur(20px)' }}>
        <button onClick={()=>setScreen('home')} className="text-green-600 hover:text-green-400 transition"><ArrowLeft className="w-5 h-5"/></button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.15)' }}>
          <Bot className="w-5 h-5 text-green-400"/>
        </div>
        <div>
          <p className="font-bold text-white text-base">Plant Assistant</p>
          <p className="text-xs text-green-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ boxShadow:'0 0 4px #4ade80' }}/> Online — AI Powered
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((m,i)=>(
          <div key={i} className={cn('flex gap-3', m.sender==='user'?'flex-row-reverse':'flex-row')}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1"
              style={m.sender==='user' ? { background:'linear-gradient(135deg,#16a34a,#15803d)' } : { background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.12)' }}>
              {m.sender==='user' ? <User className="w-4 h-4 text-white"/> : <Bot className="w-4 h-4 text-green-400"/>}
            </div>
            <div className="flex flex-col items-start max-w-[75%]">
              <div className="rounded-2xl px-5 py-3.5 text-sm leading-relaxed"
                style={m.sender==='user'
                  ? { background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white' }
                  : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,222,128,0.1)', color:'#86efac' }}>
                {m.text}
              </div>
              {m.sender==='bot' && m.text !== '' && <SpeakerButton text={m.text}/>}
            </div>
          </div>
        ))}
        {botTyping && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.12)' }}>
              <Bot className="w-4 h-4 text-green-400"/>
            </div>
            <div className="rounded-2xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,222,128,0.1)' }}>
              <TypingDots/>
            </div>
          </div>
        )}
        <div ref={msgEnd}/>
      </div>
      <div className="border-t p-4" style={{ borderColor:'#1f3a1f', background:'rgba(3,10,3,0.9)', backdropFilter:'blur(20px)' }}>
        {listening && (
          <div className="max-w-3xl mx-auto flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/>
            <span className="text-xs text-red-400 font-medium">Listening… speak your question</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <input value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
            placeholder={listening?'Listening…':'Ask me anything about plant care…'}
            className="flex-1 h-12 px-5 rounded-2xl text-sm focus:outline-none transition"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,222,128,0.12)', color:'#86efac' }}/>
          <button onClick={listening?stopListening:startListening}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition"
            style={{ background:listening?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.04)', border:`1px solid ${listening?'#7f1d1d':'rgba(74,222,128,0.12)'}`, color:listening?'#f87171':'#4ade80' }}>
            {listening?<MicOff className="w-5 h-5"/>:<Mic className="w-5 h-5"/>}
          </button>
          <button onClick={sendMsg} disabled={!query.trim()||botTyping}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition disabled:opacity-30"
            style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', boxShadow:'0 4px 16px rgba(22,163,74,0.3)' }}>
            <Send className="w-4 h-4 text-white"/>
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // DETECT SCREEN
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen font-sans" style={{ background:'#030a03', color:'white' }}>
      <style>{globalStyles}</style>
      <nav className="border-b sticky top-0 z-40" style={{ borderColor:'#1f3a1f', background:'rgba(3,10,3,0.85)', backdropFilter:'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', boxShadow:'0 0 16px rgba(22,163,74,0.4)' }}>
              <Leaf className="w-4 h-4 text-white"/>
            </div>
            <span className="font-display text-lg font-extrabold text-white">Plant AI</span>
          </div>
          <button onClick={()=>{setScreen('home');reset();}} className="flex items-center gap-2 text-green-600 hover:text-green-400 transition text-sm font-medium">
            <ArrowLeft className="w-4 h-4"/> Back to Home
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4"
            style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80' }}>
            <Scan className="w-3 h-3"/> AI Disease Detection
          </div>
          <h1 className="font-display text-4xl font-extrabold text-white mb-3">Analyze Your Plant</h1>
          <p className="text-green-700 text-sm max-w-lg mx-auto">Upload a clear photo of a single leaf. Our CNN model will identify diseases and provide treatment advice.</p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3" style={{ background:'rgba(74,222,128,0.05)', border:'1px solid rgba(74,222,128,0.12)' }}>
          <HelpCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0"/>
          <p className="text-xs text-green-600 leading-relaxed">
            <strong className="text-green-400">For best results:</strong> Upload a close-up, well-lit photo of a single leaf showing the affected area clearly.
          </p>
        </div>

        {visionError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-red-400 leading-relaxed">{visionError}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* ── Upload column ── */}
          <div className="flex flex-col gap-4">
            {!preview ? (
              /* Empty drop zone — tall and spacious */
              <div
                onDrop={handleDrop}
                onDragOver={e=>{e.preventDefault();setDragActive(true);}}
                onDragLeave={()=>setDragActive(false)}
                className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer"
                style={{
                  height:'460px',
                  borderColor: dragActive ? '#4ade80' : 'rgba(74,222,128,0.15)',
                  background:  dragActive ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)',
                }}
                onClick={()=>document.getElementById('fileInput')?.click()}
              >
                <Upload className="w-14 h-14 mb-5 text-green-700"/>
                <p className="text-white font-semibold mb-2 text-base">Drop your leaf image here</p>
                <p className="text-green-700 text-sm mb-3">or click to browse files</p>
                <p className="text-green-900 text-xs">PNG · JPG · JPEG supported</p>
                <input id="fileInput" type="file" accept="image/*" className="hidden"
                  onChange={e=>{ const f=e.target.files?.[0]; if(f) applyFile(f); }}/>
              </div>
            ) : (
              /* Preview — same fixed height so leaf fills the frame nicely */
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{ height:'460px', border:'1px solid rgba(74,222,128,0.15)' }}
              >
                <img
                  src={preview}
                  alt="Plant leaf"
                  className="w-full h-full"
                  style={{ objectFit:'cover', objectPosition:'center' }}
                />
                {loading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <Scan className="w-10 h-10 text-green-400 animate-pulse"/>
                      <div className="absolute inset-0 rounded-xl border-2 border-green-400/40 animate-ping"/>
                    </div>
                    <p className="text-sm text-white font-medium animate-pulse">AI Analyzing…</p>
                  </div>
                )}
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition"
                  style={{ background:'rgba(3,10,3,0.85)', border:'1px solid rgba(74,222,128,0.25)' }}
                >
                  <X className="w-4 h-4 text-green-400"/>
                </button>
              </div>
            )}

            {preview && !results && (
              <button
                onClick={diagnose}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', boxShadow:'0 4px 24px rgba(22,163,74,0.3)' }}
              >
                {loading
                  ? <><RefreshCw className="w-4 h-4 animate-spin"/> Analyzing…</>
                  : <><Scan className="w-4 h-4"/> Diagnose Plant</>}
              </button>
            )}
          </div>

          {/* ── Results column ── */}
          <div className="flex flex-col gap-4">
            {!results ? (
              <div
                className="rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4"
                style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(74,222,128,0.08)', height:'460px' }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(74,222,128,0.08)' }}>
                  <Activity className="w-7 h-7 text-green-800"/>
                </div>
                <p className="text-green-800 text-sm max-w-[200px] leading-relaxed">Upload a leaf image and click Diagnose to see results here</p>
              </div>
            ) : sc && (
              <div className="space-y-4">
                {/* Status badge */}
                <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border', sc.bg, sc.border)}>
                  <div className={cn('w-2.5 h-2.5 rounded-full', sc.dot)}/>
                  {status==='healthy'
                    ? <CheckCircle className={cn('w-4 h-4',sc.color)}/>
                    : status==='mild'
                    ? <HelpCircle  className={cn('w-4 h-4',sc.color)}/>
                    : <AlertTriangle className={cn('w-4 h-4',sc.color)}/>}
                  <span className={cn('font-bold text-sm', sc.color)}>{sc.label}</span>
                </div>

                {/* Disease name */}
                <div className="p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(74,222,128,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-3.5 h-3.5 text-green-400"/>
                    <span className="text-[11px] text-green-700 font-medium uppercase tracking-wide">Detected Condition</span>
                  </div>
                  <p className={cn('text-xl font-bold leading-snug', sc.color)}>
                    {results.display || results.disease.replace(/_/g,' ')}
                  </p>
                  {results.source && <p className="text-[11px] text-green-700 mt-1">Source: {results.source}</p>}
                </div>

                {/* Confidence */}
                <div className="p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(74,222,128,0.08)' }}>
                  <ConfBar value={results.confidence}/>
                </div>

                {/* Probability breakdown */}
                {results.all_probs && (
                  <div className="p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(74,222,128,0.08)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-3.5 h-3.5 text-green-400"/>
                      <span className="text-[11px] text-green-700 font-medium uppercase tracking-wide">Probability Breakdown</span>
                    </div>
                    {Object.entries(results.all_probs).sort(([,a],[,b])=>b-a).slice(0,4).map(([cls,prob])=>(
                      <div key={cls} className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] text-green-700 truncate max-w-[200px]">{cls.replace(/_/g,' ')}</span>
                          <span className="text-[11px] text-green-500 ml-2">{Math.round(prob*100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width:`${prob*100}%`, background:'linear-gradient(to right,#16a34a,#4ade80)' }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Advice with voice */}
                <div className="p-4 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(74,222,128,0.08)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400"/>
                      <span className="text-sm font-semibold text-white">Treatment Advice</span>
                    </div>
                    <SpeakerButton text={results.advice}/>
                  </div>
                  <p className="text-green-600 text-sm leading-relaxed">{results.advice}</p>
                </div>

                <button onClick={reset}
                  className="w-full py-3 rounded-xl text-green-600 hover:text-green-400 text-sm transition flex items-center justify-center gap-2"
                  style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(74,222,128,0.1)' }}>
                  <RefreshCw className="w-3.5 h-3.5"/> Analyze Another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingChat chatOpen={chatOpen} setChatOpen={setChatOpen} messages={messages} botTyping={botTyping} query={query} setQuery={setQuery} sendMsg={sendMsg} msgEnd={msgEnd} listening={listening} startListening={startListening} stopListening={stopListening}/>
    </div>
  );
}