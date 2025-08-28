import React, { useMemo, useState, useEffect } from "react";

/**
 * 색상 배색 워크시트 (다중 행 버전)
 * - 팔레트: 팬톤/먼셀 계열 근사 HEX 200색 (임시)
 * - 팔레트: 화면 오른쪽에 항상 보이도록 고정(sticky)
 */

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzox3THBm1wCH8ZqynJZ7UjUn3IcTBdAozf9OwY2PHljM0NHf8Rz2yBTK69HRfc1W1eEg/exec";

const ROWS_DEF = [
  { key: 'toneOnTone',  title: 'Tone-on-Tone (기준색 1 + 배색 5)',    slots: 6, hasBase: true, desc: '같은 계열(Hue 근접)에서 명도/채도 변주' },
  { key: 'toneInTone',  title: 'Tone-in-Tone (기준색 1 + 배색 5)',    slots: 6, hasBase: true, desc: '비슷한 명도/채도로 통일감, Hue는 달라도 OK' },
  { key: 'separation',  title: 'Separation (기준색 1 + 배색 5)',      slots: 6, hasBase: true, desc: '기준색과 분리되는 대비축 강조' },
  { key: 'accent',      title: 'Accent (기준색 1 + 배색 5)',          slots: 6, hasBase: true, desc: '전체 톤 속 포인트 색' },
  { key: 'emotion',     title: '감성배색 (자유 5색)',                 slots: 5, hasBase: false, desc: '제시문에 어울리는 5색 자유 선택' },
] as const;

type RowKey = typeof ROWS_DEF[number]["key"];
type RowState = { key: RowKey; colors: (string|null)[] };

export default function ColorWorksheet() {
  const [rows, setRows] = useState<RowState[]>(() => ROWS_DEF.map(r => ({ key: r.key, colors: Array(r.slots).fill(null) })));
  const [active, setActive] = useState<{row:number; slot:number}>({ row:0, slot:0 });
  const [className, setClassName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [teacherOpen, setTeacherOpen] = useState(false);

  const basePalette = useMemo(() => generateApproxPalette(), []);
  const [palette, setPalette] = useState<{hex:string}[]>([]);
  useEffect(() => { setPalette(shuffle(basePalette)); }, [basePalette]);

  function handlePick(hex:string){
    const next = rows.map(r => ({...r, colors:[...r.colors]}));
    next[active.row].colors[active.slot] = hex;
    setRows(next);
  }

  function clearSlot(row:number, slot:number){
    const next = rows.map(r => ({...r, colors:[...r.colors]}));
    next[row].colors[slot] = null;
    setRows(next);
  }
  function clearRow(row:number){
    const next = rows.map((r,i) => i===row ? ({...r, colors:Array(r.colors.length).fill(null)}) : r);
    setRows(next);
  }
  function clearAll(){
    setRows(ROWS_DEF.map(r => ({ key: r.key, colors: Array(r.slots).fill(null) })));
  }
  function reshuffle(){ setPalette(shuffle(basePalette)); }

  async function submit(){
    setMessage("제출 중…");
    const payload:any = {
      timestamp: new Date().toISOString(),
      class: className,
      number: studentNumber,
      name: studentName,
      note,
      rows: rows.reduce((acc, r)=>{ acc[r.key] = r.colors.map(c=>c??"").join(","); return acc; }, {} as Record<string,string>),
      userAgent: navigator.userAgent,
    };
    try {
      const res = await fetch(APP_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!res.ok) throw new Error('응답 오류');
      setMessage("제출 완료!");
    } catch(e){ setMessage("제출 실패: Apps Script URL 확인"); }
  }

  function exportCSV(){
    const header = ["class","number","name","note", ...ROWS_DEF.map(r=>r.key), "timestamp"];
    const row = [quote(className), quote(studentNumber), quote(studentName), quote(note),
      ...ROWS_DEF.map(r => quote((rows.find(x=>x.key===r.key)?.colors||[]).map(c=>c??"").join("|"))),
      quote(new Date().toISOString())];
    const csv = header.join(',') + "\n" + row.join(',');
    downloadBlob(csv, `배색_워크시트_${studentName||'학생'}.csv`, 'text/csv;charset=utf-8;');
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 md:p-6">
      {/* 좌우 2분할 레이아웃: 좌측 메인 / 우측 팔레트(고정) */}
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* 좌측 메인 영역 */}
        <div className="flex-1 min-w-0 space-y-6">
          <header className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">색상 배색 워크시트 · 팬톤/먼셀 근사 팔레트</h1>
            <div className="flex gap-2">
              <button onClick={reshuffle} className="px-3 py-2 rounded-xl shadow bg-gray-200 hover:bg-gray-300">팔레트 섞기</button>
              <button onClick={exportCSV} className="px-3 py-2 rounded-xl shadow bg-gray-200 hover:bg-gray-300">CSV 저장</button>
              <button onClick={clearAll} className="px-3 py-2 rounded-xl shadow bg-gray-200 hover:bg-gray-300">모두 지우기</button>
              <button onClick={()=>setTeacherOpen(v=>!v)} className="px-3 py-2 rounded-xl shadow bg-indigo-600 text-white hover:opacity-90">{teacherOpen ? '교사용 닫기' : '교사용 보기'}</button>
            </div>
          </header>

          <section className="grid md:grid-cols-4 gap-3 items-end bg-gray-50 p-4 rounded-2xl shadow-sm">
            <LabeledInput label="반" value={className} onChange={setClassName} placeholder="예: 3-2" />
            <LabeledInput label="번호" value={studentNumber} onChange={setStudentNumber} placeholder="예: 12" />
            <LabeledInput label="이름" value={studentName} onChange={setStudentName} placeholder="예: 홍길동" />
            <div className="flex gap-2 md:justify-end">
              <button onClick={submit} className="px-3 py-2 rounded-xl shadow bg-black text-white hover:opacity-90">제출</button>
            </div>
            {message && <div className="md:col-span-4 text-sm text-gray-700">{message}</div>}
          </section>

        {teacherOpen && <TeacherPanel appUrl={APP_SCRIPT_URL} />}

        <section className="space-y-6">
            {ROWS_DEF.map((def, rIdx) => (
              <div key={def.key} className="bg-gray-50 p-4 rounded-2xl shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold">{def.title}</h2>
                    <p className="text-xs text-gray-600">{def.desc}</p>
                  </div>
                  <button onClick={()=>clearRow(rIdx)} className="text-sm px-3 py-1.5 rounded-lg bg-white border hover:bg-gray-100">이 줄 지우기</button>
                </div>
                <div className="grid grid-cols-6 gap-3 mt-3">
                  {Array.from({length: def.slots}).map((_, i) => (
                    <Slot key={i} label={def.hasBase && i===0 ? '기준' : String((def.hasBase? i: i+1))}
                      hex={rows[rIdx].colors[i]} active={active.row===rIdx && active.slot===i}
                      onClick={()=>setActive({row:rIdx, slot:i})}
                      onClear={(e)=>{e.stopPropagation(); clearSlot(rIdx, i);}} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* 우측 팔레트: 화면에 고정 */}
        <div className="w-[280px] shrink-0">
          <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-auto bg-white p-3 md:p-4 rounded-2xl border shadow-sm">
            <h2 className="text-base md:text-lg font-semibold mb-2">팔레트(팬톤/먼셀 근사 200색)</h2>
            <div className="grid grid-cols-4 gap-2">
              {palette.map((p, idx) => (
                <button key={idx} className="relative aspect-square rounded-xl border hover:scale-[1.02] transition"
                  style={{ backgroundColor: p.hex }} onClick={() => handlePick(p.hex)}>
                  <span className="absolute bottom-0 left-0 text-[9px] px-1 bg-white/70">{p.hex}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }:{label:string; value:string; onChange:(v:string)=>void; placeholder?:string}){
  return (<label className="text-sm"><div className="font-semibold mb-1">{label}</div>
    <input className="w-full p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-gray-300"
      value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} /></label>);
}

function Slot({ label, hex, onClick, onClear, active }:{label:string; hex:string|null; onClick:()=>void; onClear:(e:any)=>void; active:boolean}){
  return (
    <div onClick={onClick} className={`relative aspect-square rounded-2xl border-2 ${active? 'border-gray-900':'border-gray-200'} shadow-sm flex items-center justify-center`}>
      <div className="absolute top-2 left-2 text-xs text-gray-600">{label}</div>
      <div className="absolute top-2 right-2">{hex && (<button onClick={onClear} className="text-[10px] px-2 py-1 rounded-full bg-white/80 border">지우기</button>)}</div>
      <div className="w-4/5 h-4/5 rounded-xl" style={{ backgroundColor: hex ?? "#f5f5f5" }} />
      {!hex && <div className="absolute text-[11px] text-gray-400">색을 선택</div>}
    </div>
  );
}

// 유틸
function quote(s: string){ return '"' + (s ?? '').replaceAll('"','""') + '"'; }
function downloadBlob(text:string, filename:string, type:string){ const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function shuffle<T>(arr:T[]):T[]{ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// HEX -> HSL (간단 변환)
function hexToHsl(hex:string){
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if(!m) return {h:0,s:0,l:0};
  const r = parseInt(m[1],16)/255;
  const g = parseInt(m[2],16)/255;
  const b = parseInt(m[3],16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  if (max===min){ h=0; s=0; }
  else {
    const d = max - min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b ? 6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h = h*60;
  }
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}

function parseCsvColors(csv:string){
  return (csv||'').split(',').map(s=>s.trim()).filter(Boolean);
}

// 팬톤/먼셀 계열 근사 HEX 200색 (임시)
function generateApproxPalette(){
  const hexes = [
    "#F94144","#F3722C","#F8961E","#F9844A","#F9C74F","#90BE6D","#43AA8B","#4D908E","#577590","#277DA1",
    "#D62828","#E63946","#F1FAEE","#A8DADC","#457B9D","#1D3557","#FFB5A7","#FCD5CE","#F8EDEB","#F9DCC4",
    "#FEC89A","#FBC4AB","#F8AFA6","#F4978E","#F08080","#E5989B","#B5838D","#6D6875","#FFCDB2","#FFB4A2",
    "#E5989B","#B5838D","#6D6875","#A2D2FF","#BDE0FE","#CDB4DB","#FFC8DD","#FFAFCC","#FFE5EC","#FEE440",
    "#00BBF9","#00F5D4","#9B5DE5","#F15BB5","#FEE440","#00BBF9","#00F5D4","#9B5DE5","#F15BB5","#E0FBFC",
    "#98C1D9","#EE6C4D","#293241","#FF595E","#FFCA3A","#8AC926","#1982C4","#6A4C93","#FF99C8","#FCF6BD",
    "#D0F4DE","#A9DEF9","#E4C1F9","#9055A2","#FFB4A2","#FFD6A5","#FDFFB6","#CAFFBF","#9BF6FF","#A0C4FF",
    "#BDB2FF","#FFC6FF","#FFFFFC","#F94144","#F3722C","#F8961E","#F9844A","#F9C74F","#90BE6D","#43AA8B",
    "#4D908E","#577590","#277DA1","#D62828","#E63946","#F1FAEE","#A8DADC","#457B9D","#1D3557","#FFB5A7",
    "#FCD5CE","#F8EDEB","#F9DCC4","#FEC89A","#FBC4AB","#F8AFA6","#F4978E","#F08080","#E5989B","#B5838D",
    "#6D6875","#FFCDB2","#FFB4A2","#E5989B","#B5838D","#6D6875","#A2D2FF","#BDE0FE","#CDB4DB","#FFC8DD",
    "#FFAFCC","#FFE5EC","#FEE440","#00BBF9","#00F5D4","#9B5DE5","#F15BB5","#E0FBFC","#98C1D9","#EE6C4D",
    "#293241","#FF595E","#FFCA3A","#8AC926","#1982C4","#6A4C93","#FF99C8","#FCF6BD","#D0F4DE","#A9DEF9",
    "#E4C1F9","#9055A2","#FFB4A2","#FFD6A5","#FDFFB6","#CAFFBF","#9BF6FF","#A0C4FF","#BDB2FF","#FFC6FF",
    "#FFFFFC"
  ];
  while(hexes.length < 200){ hexes.push(...hexes); }
  return hexes.slice(0,200).map(h=>({hex:h}));
}

// === 교사용 실시간 패널/시각화 컴포넌트 ===
function TeacherPanel({ appUrl }:{appUrl:string}){
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [qClass, setQClass] = useState('');
  const [qName, setQName] = useState('');

  async function load(){
    setLoading(true);
    try{
      const url = new URL(appUrl);
      url.searchParams.set('t', Date.now().toString());
      if(qClass) url.searchParams.set('class', qClass);
      if(qName) url.searchParams.set('name', qName);
      const res = await fetch(url.toString());
      const json = await res.json();
      setRows(json.rows || []);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  const allHexes = rows.flatMap((r:any)=>[
    ...parseCsvColors(r.toneOnTone||''),
    ...parseCsvColors(r.toneInTone||''),
    ...parseCsvColors(r.separation||''),
    ...parseCsvColors(r.accent||''),
    ...parseCsvColors(r.emotion||''),
  ]);
  const freq = new Map<string, number>();
  allHexes.forEach(h=>{ const key=h.toUpperCase(); freq.set(key, (freq.get(key)||0)+1); });
  const top = Array.from(freq.entries()).sort((a,b)=> b[1]-a[1]).slice(0,60);

  const hueBins = Array.from({length:12}, ()=>0);
  allHexes.forEach(h=>{ const {h:hue}=hexToHsl(h); const idx=Math.floor(((hue%360)+360)%360/30); hueBins[idx]++; });
  const hueMax = Math.max(1, ...hueBins);

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <LabeledInput label="반 필터" value={qClass} onChange={setQClass} placeholder="예: 3-2" />
        <LabeledInput label="이름 필터" value={qName} onChange={setQName} placeholder="예: 홍길동" />
        <button onClick={load} className="px-3 py-2 rounded-xl shadow bg-gray-200 hover:bg-gray-300">{loading?'로딩…':'새로고침'}</button>
        <div className="text-sm text-gray-600 ml-auto">제출 {rows.length}건 · 고유색 {freq.size}개</div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">가장 많이 선택된 색(Top 60)</div>
        <div className="grid grid-cols-12 gap-1">
          {top.map(([hex, n])=> (
            <div key={hex} className="relative aspect-square rounded border" title={`${hex} ×${n}`} style={{backgroundColor:hex}}>
              <span className="absolute bottom-0 left-0 text-[9px] px-1 bg-white/70">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Hue 분포(12단계)</div>
        <div className="flex items-end gap-1 h-24">
          {hueBins.map((v, i)=> (
            <div key={i} className="flex-1 bg-gray-100 rounded relative" style={{height: `${(v/hueMax)*100}%`}}>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px]">{i*30}°</div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left border-b">
              <th className="p-2">시간</th><th className="p-2">반</th><th className="p-2">번호</th><th className="p-2">이름</th>
              <th className="p-2">Tone-on-Tone</th><th className="p-2">Tone-in-Tone</th><th className="p-2">Separation</th><th className="p-2">Accent</th><th className="p-2">감성배색</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-b align-top">
                <td className="p-2 whitespace-nowrap">{r.timestamp}</td>
                <td className="p-2">{r.class}</td>
                <td className="p-2">{r.number}</td>
                <td className="p-2">{r.name}</td>
                {['toneOnTone','toneInTone','separation','accent','emotion'].map(key=> (
                  <td key={key} className="p-2"><SwatchRow csv={r[key]||''} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SwatchRow({ csv }:{csv:string}){
  const colors = parseCsvColors(csv);
  return (
    <div className="flex gap-1 flex-wrap">
      {colors.map((hex,idx)=>(
        <div key={idx} className="w-5 h-5 rounded border" title={hex} style={{backgroundColor:hex}} />
      ))}
    </div>
  );
}
