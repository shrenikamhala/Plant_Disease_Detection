import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Upload, X, Send, Leaf, Activity,
  AlertTriangle, CheckCircle, Lightbulb, Shield,
  ListChecks, Bot, User, Scan, ArrowLeft, Camera,
  FileText, RefreshCw, ChevronRight, Zap
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message   { sender: 'user' | 'bot'; text: string; }
interface Prediction { disease: string; confidence: number; advice: string; }

// ── API URLs ─────────────────────────────────────────── change here if needed
const CHAT_URL   = 'http://127.0.0.1:5001/ask';
const VISION_URL = 'http://127.0.0.1:4000/predict';

function cn(...c: (string | boolean | undefined)[]) { return c.filter(Boolean).join(' '); }

function getStatus(d: string): 'healthy' | 'mild' | 'moderate' | 'severe' {
  const l = d.toLowerCase();
  if (l.includes('healthy')) return 'healthy';
  if (l.includes('early'))   return 'mild';
  if (l.includes('curl') || l.includes('virus')) return 'severe';
  return 'moderate';
}

const SC = {
  healthy:  { color:'text-emerald-400', bg:'bg-emerald-500/15', border:'border-emerald-500/30', label:'Healthy',        dot:'bg-emerald-400' },
  mild:     { color:'text-yellow-400',  bg:'bg-yellow-500/15',  border:'border-yellow-500/30',  label:'Mild Issue',     dot:'bg-yellow-400' },
  moderate: { color:'text-orange-400',  bg:'bg-orange-500/15',  border:'border-orange-500/30',  label:'Moderate Issue', dot:'bg-orange-400' },
  severe:   { color:'text-red-400',     bg:'bg-red-500/15',     border:'border-red-500/30',     label:'Severe Issue',   dot:'bg-red-400'    },
};

// ─── Leaf hero background ─────────────────────────────────────────────────────
function LeafPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%, #0d2d1a 0%, transparent 50%),radial-gradient(ellipse at 80% 20%, #0a2010 0%, transparent 50%),linear-gradient(135deg,#050e07 0%,#0a1f0f 30%,#071508 60%,#030b04 100%)' }} />
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
        {["M80,50 Q180,10 220,120 Q260,230 160,260 Q60,290 40,180 Q20,70 80,50Z","M1200,20 Q1340,-10 1380,100 Q1420,210 1310,240 Q1200,270 1180,150 Q1160,30 1200,20Z","M600,400 Q740,360 780,470 Q820,580 700,600 Q580,620 570,510 Q560,400 600,400Z","M-20,300 Q120,260 150,370 Q180,480 60,500 Q-60,520 -70,410 Q-80,300 -20,300Z","M400,100 Q520,60 550,160 Q580,260 470,280 Q360,300 345,200 Q330,100 400,100Z","M900,200 Q1040,170 1060,270 Q1080,370 960,385 Q840,400 830,300 Q820,200 900,200Z"].map((d,i)=>(
          <path key={i} d={d} fill="#22c55e" opacity={0.05+(i%3)*0.03}/>
        ))}
        {["M100,80 Q160,140 140,220","M1250,40 Q1310,100 1290,180","M620,430 Q680,490 660,570"].map((d,i)=>(
          <path key={i} d={d} stroke="#4ade80" strokeWidth="0.5" fill="none" opacity="0.12"/>
        ))}
      </svg>
      <div className="absolute top-0 left-1/4 w-64 h-full opacity-[0.04]" style={{background:'linear-gradient(180deg,#bbf7d0 0%,transparent 70%)',transform:'skewX(-15deg)'}}/>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      {[0,0.18,0.36].map((d,i)=>(
        <span key={i} className="w-2 h-2 rounded-full bg-green-400/70 animate-bounce" style={{animationDelay:`${d}s`}}/>
      ))}
    </div>
  );
}

function ConfBar({value}:{value:number}) {
  const pct = Math.round(value*100);
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-xs text-zinc-400">Confidence</span>
        <span className="text-xs font-bold text-green-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700" style={{width:`${pct}%`}}/>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-600">
        {pct>=90?'High confidence — very reliable':pct>=70?'Moderate confidence — results are reliable':'Low confidence — try a clearer image'}
      </p>
    </div>
  );
}

function Step({icon:Icon,title,desc}:{icon:React.ElementType;title:string;desc:string}) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/40 flex items-center justify-center shadow-lg shadow-green-900/30">
        <Icon className="w-7 h-7 text-green-400"/>
      </div>
      <div>
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-[140px] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Floating chat widget ──────────────────────────────────────────────────────
function FloatingChat({chatOpen,setChatOpen,messages,botTyping,query,setQuery,sendMsg,msgEnd}:{
  chatOpen:boolean; setChatOpen:(v:boolean)=>void;
  messages:Message[]; botTyping:boolean;
  query:string; setQuery:(v:string)=>void;
  sendMsg:()=>void; msgEnd:React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button onClick={()=>setChatOpen(!chatOpen)}
        className={cn('w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110',
          chatOpen?'bg-zinc-700 text-zinc-300':'bg-green-500 text-black shadow-green-900/50')}>
        {chatOpen?<X className="w-5 h-5"/>:<span className="text-base font-black">AI</span>}
      </button>

      {chatOpen&&(
        <div className="absolute bottom-16 right-0 w-[340px] h-[460px] rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#111]">
            <div className="w-8 h-8 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center"><Bot className="w-4 h-4 text-green-400"/></div>
            <div className="flex-1"><p className="text-sm font-semibold text-white">Plant AI Chat 🌿</p><p className="text-[11px] text-zinc-600">Always here to help</p></div>
            <div className="w-2 h-2 rounded-full bg-green-400 shadow shadow-green-400"/>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m,i)=>(
              <div key={i} className={cn('flex gap-2',m.sender==='user'?'flex-row-reverse':'flex-row')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',m.sender==='user'?'bg-green-500 text-black':'bg-[#1e1e1e] text-zinc-400')}>
                  {m.sender==='user'?<User className="w-3 h-3"/>:<Bot className="w-3 h-3"/>}
                </div>
                <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                  m.sender==='user'?'bg-green-500 text-black font-medium rounded-br-sm':'bg-[#1a1a1a] text-zinc-300 border border-white/5 rounded-bl-sm')}>
                  {m.text}
                </div>
              </div>
            ))}
            {botTyping&&(
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center"><Bot className="w-3 h-3 text-zinc-400"/></div>
                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl rounded-bl-sm"><TypingDots/></div>
              </div>
            )}
            <div ref={msgEnd}/>
          </div>

          <div className="p-3 border-t border-white/8 bg-[#111]">
            <div className="flex gap-2">
              <input value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
                placeholder="Ask something..."
                className="flex-1 h-9 px-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-green-500/40 transition"/>
              <button onClick={sendMsg} disabled={!query.trim()||botTyping}
                className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-30 flex items-center justify-center transition shrink-0">
                <Send className="w-3.5 h-3.5 text-black"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]         = useState<'home'|'detect'|'chat'>('home');
  const [chatOpen,setChatOpen]     = useState(false);
  const [query,setQuery]           = useState('');
  const [messages,setMessages]     = useState<Message[]>([
    {sender:'bot',text:"Hello! I'm your Plant AI assistant. I can help you with plant care advice, watering schedules, disease identification tips, and more. What would you like to know about your plants today?"}
  ]);
  const [botTyping,setBotTyping]   = useState(false);
  const [file,setFile]             = useState<File|null>(null);
  const [preview,setPreview]       = useState<string|null>(null);
  const [results,setResults]       = useState<Prediction|null>(null);
  const [loading,setLoading]       = useState(false);
  const [dragActive,setDragActive] = useState(false);
  const [chatError,setChatError]   = useState('');
  const [visionError,setVisionError] = useState('');
  const msgEnd = useRef<HTMLDivElement>(null);

  useEffect(()=>{ msgEnd.current?.scrollIntoView({behavior:'smooth'}); },[messages,botTyping]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMsg = async () => {
    const t=query.trim(); if(!t) return;
    setMessages(p=>[...p,{sender:'user',text:t}]);
    setQuery(''); setBotTyping(true); setChatError('');
    try {
      const r = await fetch(CHAT_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({query:t}),
      });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setMessages(p=>[...p,{sender:'bot',text:d.answer||"I don't know that yet."}]);
    } catch(e) {
      const msg = '⚠️ Could not reach the chatbot server. Make sure you ran: cd chatbot && python chat_service.py';
      setMessages(p=>[...p,{sender:'bot',text:msg}]);
      setChatError(msg);
    } finally { setBotTyping(false); }
  };

  // ── Vision ─────────────────────────────────────────────────────────────────
  const applyFile=(f:File)=>{ setFile(f); setResults(null); setVisionError(''); setPreview(URL.createObjectURL(f)); };
  const handleDrop=(e:React.DragEvent)=>{ e.preventDefault(); setDragActive(false); const f=e.dataTransfer.files[0]; if(f?.type.startsWith('image/')) applyFile(f); };
  const diagnose=async()=>{
    if(!file) return; setLoading(true); setVisionError('');
    const fd=new FormData(); fd.append('file',file);
    try {
      const r=await fetch(VISION_URL,{method:'POST',body:fd});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const d=await r.json();
      if(d.error) throw new Error(d.error);
      setResults(d);
    } catch(e:any) {
      setVisionError(`⚠️ Vision server error: ${e.message}. Make sure you ran: cd vision && python vision_service.py`);
    } finally { setLoading(false); }
  };
  const reset=()=>{ setFile(null); setPreview(null); setResults(null); setVisionError(''); };

  const status = results ? getStatus(results.disease) : null;
  const sc     = status  ? SC[status] : null;

  // ══════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════
  if(screen==='home') return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Leaf className="w-4 h-4 text-white"/></div>
          <span className="text-lg font-bold">Plant AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <button onClick={()=>setScreen('detect')} className="hover:text-white transition">Analyze</button>
          <button onClick={()=>setScreen('chat')}   className="hover:text-white transition">Assistant</button>
          <span className="hover:text-white transition cursor-pointer">Library</span>
        </div>
        <button onClick={()=>setScreen('detect')} className="bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-5 py-2 rounded-full transition-all hover:scale-105">
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <LeafPattern/>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/40 bg-green-500/10 text-green-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3"/> AI-Powered Plant Care
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Keep Your Plants<br/><span className="text-green-400">Healthy &amp; Thriving</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Detect plant diseases instantly, get expert care recommendations, and access a comprehensive plant library — all powered by advanced AI technology.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={()=>setScreen('detect')} className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-4 rounded-full transition-all hover:scale-105 text-sm shadow-lg shadow-green-900/40">
              <RefreshCw className="w-4 h-4"/> Analyze Your Plant
            </button>
            <button onClick={()=>setScreen('chat')} className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-4 rounded-full transition-all hover:bg-white/5 text-sm">
              <MessageCircle className="w-4 h-4"/> Talk to Assistant
            </button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-600 text-xs animate-bounce">
          <span>Scroll</span><ChevronRight className="w-4 h-4 rotate-90"/>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#0a1a0d] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-zinc-500 text-xs uppercase tracking-widest mb-2 font-medium">Simple Process</p>
          <h2 className="text-center text-3xl md:text-4xl font-bold text-white mb-16">How it works?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <Step icon={Camera}         title="Click a Pic"          desc="Take a picture of your plant leaf"/>
            <Step icon={Upload}         title="Upload on Plant AI"   desc="Visit Plant AI and click Try Now to upload"/>
            <Step icon={FileText}       title="Get Final Report"     desc="Plant AI analyzes and displays a detailed report"/>
            <Step icon={MessageCircle}  title="Chat with AI"         desc="Ask questions about care, diseases, and treatments"/>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-black border-t border-white/5 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[['2+','Disease Classes'],['CNN','Deep Learning'],['Real-time','AI Analysis']].map(([n,l])=>(
            <div key={l}><p className="text-3xl font-black text-green-400 mb-1">{n}</p><p className="text-xs text-zinc-500">{l}</p></div>
          ))}
        </div>
      </section>

      <FloatingChat chatOpen={chatOpen} setChatOpen={setChatOpen} messages={messages} botTyping={botTyping} query={query} setQuery={setQuery} sendMsg={sendMsg} msgEnd={msgEnd}/>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // FULL CHAT PAGE
  // ══════════════════════════════════════════════════════════
  if(screen==='chat') return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-sans">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/8 bg-[#0d0d0d]">
        <button onClick={()=>setScreen('home')} className="text-zinc-500 hover:text-white transition"><ArrowLeft className="w-5 h-5"/></button>
        <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center"><Bot className="w-5 h-5 text-green-400"/></div>
        <p className="font-bold text-white text-base">Plant Assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((m,i)=>(
          <div key={i} className={cn('flex gap-3',m.sender==='user'?'flex-row-reverse':'flex-row')}>
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 border',m.sender==='user'?'bg-zinc-800 border-white/10':'bg-green-900/40 border-green-500/20')}>
              {m.sender==='user'?<User className="w-4 h-4 text-zinc-300"/>:<Bot className="w-4 h-4 text-green-400"/>}
            </div>
            <div className={cn('max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed',
              m.sender==='user'?'bg-green-500 text-black font-medium rounded-br-sm':'bg-[#1a1a1a] text-zinc-200 border border-white/5 rounded-bl-sm')}>
              {m.text}
            </div>
          </div>
        ))}
        {botTyping&&(
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-green-900/40 border border-green-500/20 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-green-400"/></div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl rounded-bl-sm"><TypingDots/></div>
          </div>
        )}
        <div ref={msgEnd}/>
      </div>

      <div className="border-t border-white/5 bg-[#0d0d0d] p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-center">
          <input value={query} onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
            placeholder="Ask me anything about plant care..."
            className="flex-1 h-12 px-5 rounded-2xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/50 transition"/>
          <button onClick={sendMsg} disabled={!query.trim()||botTyping}
            className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-400 disabled:opacity-30 flex items-center justify-center transition shrink-0">
            <Send className="w-4 h-4 text-black"/>
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // DETECT PAGE
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"><Leaf className="w-4 h-4 text-white"/></div>
            <span className="text-lg font-bold">Plant AI</span>
          </div>
          <button onClick={()=>{setScreen('home');reset();}} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-1 font-medium">AI Diagnostics</p>
          <h1 className="text-3xl font-bold text-white">Plant Disease Analysis</h1>
          <p className="text-zinc-500 text-sm mt-1">Upload a leaf image to get an instant AI diagnosis</p>
        </div>

        {/* Error banner */}
        {visionError&&(
          <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-red-300 leading-relaxed">{visionError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload card */}
          <div className="rounded-2xl border border-white/8 bg-[#111] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Upload className="w-4 h-4 text-green-400"/> Upload Plant Image</h2>
              {file&&<button onClick={reset} className="text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1 transition"><X className="w-3 h-3"/> Reset</button>}
            </div>

            <div
              className={cn('relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
                dragActive?'border-green-400 bg-green-500/10':'border-white/10 hover:border-green-500/40 hover:bg-green-500/5',
                preview?'border-green-500/30':'')}
              onDragEnter={e=>{e.preventDefault();setDragActive(true);}}
              onDragLeave={e=>{e.preventDefault();setDragActive(false);}}
              onDragOver={e=>e.preventDefault()}
              onDrop={handleDrop}
              onClick={()=>!preview&&document.getElementById('fi')?.click()}
            >
              <input type="file" id="fi" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&applyFile(e.target.files[0])}/>
              {!preview?(
                <div className="flex flex-col items-center gap-3 py-14 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><Camera className="w-8 h-8 text-zinc-600"/></div>
                  <div><p className="text-sm text-zinc-300 font-medium">Drag & drop a leaf image</p><p className="text-xs text-zinc-600 mt-1">or click to browse — JPG, PNG, WebP</p></div>
                </div>
              ):(
                <div className="p-3">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
                    <img src={preview} alt="Leaf" className="w-full h-full object-cover"/>
                    {loading&&(
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                        <div className="relative"><Scan className="w-10 h-10 text-green-400 animate-pulse"/><div className="absolute inset-0 rounded-xl border-2 border-green-400/40 animate-ping"/></div>
                        <p className="text-sm text-white font-medium animate-pulse">Analyzing…</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {file&&!loading&&!results&&(
              <button onClick={diagnose} className="mt-4 w-full bg-green-500 hover:bg-green-400 text-black font-bold text-sm py-3 rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-green-900/30">
                Diagnose Plant
              </button>
            )}
            {loading&&(
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-400 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin"/> Analyzing image…
              </div>
            )}
          </div>

          {/* Results card */}
          <div className="rounded-2xl border border-white/8 bg-[#111] p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-5"><Activity className="w-4 h-4 text-green-400"/> Analysis Results</h2>

            {!results&&!loading&&(
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center"><Activity className="w-8 h-8 text-zinc-800"/></div>
                <p className="text-sm text-zinc-600 max-w-[200px]">Upload a plant image to see AI analysis results here</p>
              </div>
            )}
            {loading&&!results&&(
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-14 h-14 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin"/>
                <p className="text-sm text-zinc-300 animate-pulse">AI is analyzing your plant…</p>
                <p className="text-xs text-zinc-600">This may take a few seconds</p>
              </div>
            )}
            {results&&sc&&(
              <div className="space-y-4">
                <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',sc.bg,sc.border,sc.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full',sc.dot)}/>
                  {status==='healthy'?<CheckCircle className="w-3.5 h-3.5"/>:<AlertTriangle className="w-3.5 h-3.5"/>}
                  {sc.label}
                </span>
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-center gap-2 mb-1.5"><Shield className="w-3.5 h-3.5 text-green-400"/><span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">Detected Condition</span></div>
                  <p className={cn('text-xl font-bold leading-snug',sc.color)}>{results.disease.replace(/_/g,' ')}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-4"><ConfBar value={results.confidence}/></div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-center gap-2 mb-3"><ListChecks className="w-3.5 h-3.5 text-green-400"/><span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">Recommendations</span></div>
                  <div className="flex items-start gap-2.5 text-sm text-zinc-300"><Lightbulb className="w-4 h-4 text-green-400 mt-0.5 shrink-0"/><span>{results.advice}</span></div>
                </div>
                <button onClick={reset} className="w-full border border-white/10 hover:border-green-500/40 text-zinc-400 hover:text-green-400 text-xs py-2.5 rounded-xl transition-all">
                  Analyze Another Plant
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingChat chatOpen={chatOpen} setChatOpen={setChatOpen} messages={messages} botTyping={botTyping} query={query} setQuery={setQuery} sendMsg={sendMsg} msgEnd={msgEnd}/>
    </div>
  );
}
