import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Terminal, 
  Coins, 
  Play, 
  RotateCcw, 
  History, 
  Info,
  ExternalLink,
  ChevronRight,
  Verified,
  TrendingUp,
  Zap
} from 'lucide-react';
import { calculateCrashPoint, generateRandomSeed, getPreviousHash } from './lib/crashAlgorithm';

/**
 * Interface for a completed game round
 */
interface GameHistory {
  id: string;
  seed: string;
  salt: string;
  result: number;
}

const DEFAULT_SALT = "0000000000000000000301e2801a9a9598bfb114e574a91a887f2132f33047e6";
const DEFAULT_HASH = "013138ba184751794df9b20b15952cd85f15de452476c4031e7e8e53a47bb748";

export default function App() {
  // Game State
  const [gameState, setGameState] = useState<'idle' | 'running' | 'crashed'>('idle');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [currentSeed, setCurrentSeed] = useState(DEFAULT_HASH);
  const [currentSalt, setCurrentSalt] = useState(DEFAULT_SALT);
  const [targetMultiplier, setTargetMultiplier] = useState(0);
  const [history, setHistory] = useState<GameHistory[]>([]);
  
  // Betting State
  const [balance, setBalance] = useState(1000.00);
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [userBet, setUserBet] = useState<{ amount: number; cashoutAt?: number; profit?: number } | null>(null);

  // Verification State
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifySeed, setVerifySeed] = useState(DEFAULT_HASH);
  const [verifySalt, setVerifySalt] = useState(DEFAULT_SALT);
  const [verifyCount, setVerifyCount] = useState(10);
  const [verifyResults, setVerifyResults] = useState<GameHistory[]>([]);

  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  // Simulation Logic
  const tick = useCallback((time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = (time - startTimeRef.current) / 1000;
    
    // Multiplier growth formula: 1.00693 * e^(0.06 * seconds)
    // Actually simpler version for demo: e^(0.065 * t)
    const multiplier = Math.pow(Math.E, 0.065 * elapsed);
    
    if (multiplier >= targetMultiplier) {
      setCurrentMultiplier(targetMultiplier);
      setGameState('crashed');
      
      // Update history
      const newHistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        seed: currentSeed,
        salt: currentSalt,
        result: targetMultiplier
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));

      // Handle bet loss if not cashed out
      if (userBet && !userBet.cashoutAt) {
        setUserBet(null);
      }
      
      return;
    }

    setCurrentMultiplier(parseFloat(multiplier.toFixed(2)));

    // Auto cashout logic
    if (userBet && !userBet.cashoutAt && multiplier >= autoCashout) {
      handleCashout(multiplier);
    }

    requestRef.current = requestAnimationFrame(tick);
  }, [targetMultiplier, userBet, autoCashout, currentSeed, currentSalt]);

  useEffect(() => {
    if (gameState === 'running') {
      requestRef.current = requestAnimationFrame(tick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = 0;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, tick]);

  const startGame = () => {
    if (balance < betAmount) return;

    const crashPoint = calculateCrashPoint(currentSeed, currentSalt);
    setTargetMultiplier(crashPoint);
    setGameState('running');
    setCurrentMultiplier(1.0);
    
    // Deduct bet
    setBalance(prev => prev - betAmount);
    setUserBet({ amount: betAmount });
  };

  const handleCashout = (at: number) => {
    if (!userBet || userBet.cashoutAt) return;
    
    const profit = userBet.amount * at;
    setBalance(prev => prev + profit);
    setUserBet(prev => prev ? { ...prev, cashoutAt: at, profit: profit - prev.amount } : null);
  };

  const handleNextRound = () => {
    setCurrentSeed(generateRandomSeed());
    setGameState('idle');
    setCurrentMultiplier(1.0);
    setUserBet(null);
    setRevealedCrashPoint(null);
    setShowAdminMode(false);
  };

  const runBatchVerification = () => {
    if (!verifySeed) return;
    
    const results: GameHistory[] = [];
    let tempSeed = verifySeed;
    
    for (let i = 0; i < verifyCount; i++) {
      const result = calculateCrashPoint(tempSeed, verifySalt);
      results.push({
        id: i.toString(),
        seed: tempSeed,
        salt: verifySalt,
        result: result
      });
      // Move to previous game in chain
      tempSeed = getPreviousHash(tempSeed);
    }
    setVerifyResults(results);
  };

  const [analyzeResult, setAnalyzeResult] = useState<number | null>(null);
  const [historyResults, setHistoryResults] = useState<GameHistory[]>([]);
  const [analysisTarget, setAnalysisTarget] = useState<number>(100);
  const [strategyAdvice, setStrategyAdvice] = useState<{
    lastTargetDist: number;
    phases: { rounds: string; bet: string; cost: string }[];
    riskLevel: string;
    target: number;
    countIn2000: number;
    gaps: number[];
  } | null>(null);

  const handleSingleAnalyze = () => {
    if (!verifySeed) return;
    try {
      // 1. النتيجة الحالية للهاش المدخل
      const res = calculateCrashPoint(verifySeed, verifySalt);
      setAnalyzeResult(res);
      
      // 2. التحقق من السلسلة التاريخية العميقة (2000 جولة)
      const results: GameHistory[] = [];
      let tempSeed = verifySeed;
      const targetIndices: number[] = [];

      // نبدأ من اللعبة الحالية ونعود للخلف لمسافة 2000 جولة
      for (let i = 0; i < 2000; i++) {
        const point = calculateCrashPoint(tempSeed, verifySalt);
        
        // تسجيل مواقع الظهور (الهدف)
        if (point >= analysisTarget) {
          targetIndices.push(i);
        }

        // تخزين النتائج المطلوبة للعرض فقط (حسب verifyCount)
        if (i < verifyCount) {
          results.push({
            id: `hist-${i}`,
            seed: tempSeed,
            salt: verifySalt,
            result: point
          });
        }
        tempSeed = getPreviousHash(tempSeed);
      }

      setVerifyResults(results);
      setHistoryResults(results.slice(1, 6)); // عرض الـ 5 السابقة في القائمة السريعة

      // 3. حساب المسافات الفاصلة (Gaps)
      const gaps: number[] = [];
      for (let i = 0; i < targetIndices.length - 1; i++) {
        // المسافة بين الظهور الحالي والظهور الذي يسبقه في السلسلة
        gaps.push(targetIndices[i + 1] - targetIndices[i]);
      }

      // 4. حساب استراتيجية الـ 10 عملات
      const lastTargetIdx = targetIndices.length > 0 ? targetIndices[0] : 2000;

      setStrategyAdvice({
        lastTargetDist: lastTargetIdx,
        target: analysisTarget,
        countIn2000: targetIndices.length,
        gaps: gaps.slice(0, 8), // عرض آخر 8 مسافات تاريخية
        riskLevel: lastTargetIdx > (400 * (100 / analysisTarget)) ? "فرصة ذهبية" : "متوسطة",
        phases: [
          { rounds: "المرحلة الأولى", bet: "0.01", cost: "1.00" }, 
          { rounds: "المرحلة الثانية", bet: "0.03", cost: "3.60" }, 
          { rounds: "المرحلة الثالثة", bet: "0.06", cost: "4.80" }, 
        ]
      });
    } catch (e) {
      console.error("خطأ في التحليل:", e);
    }
  };

  const [showAdminMode, setShowAdminMode] = useState(false);
  const [revealedCrashPoint, setRevealedCrashPoint] = useState<number | null>(null);

  const peekNextResult = () => {
    const point = calculateCrashPoint(currentSeed, currentSalt);
    setRevealedCrashPoint(point);
    setShowAdminMode(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">azaam azeez</h1>
            <p className="text-xs text-slate-400 uppercase tracking-tighter font-mono">Game Verification Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-2 flex items-center gap-2">
            <Coins className="text-yellow-500 w-4 h-4" />
            <span className="font-mono font-bold">{balance.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setVerifyMode(!verifyMode)}
            className={`p-2 border rounded-full transition-all ${
              verifyMode 
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
            }`}
            title="Provably Fair Verification"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Overlay / Section */}
        <AnimatePresence>
          {verifyMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:col-span-12 bg-slate-900 border border-emerald-900/30 rounded-2xl p-6 mb-2 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    Provably Fair - History Verifier
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Independently verify that game results are fair and unmanipulated.</p>
                </div>
                <button onClick={() => setVerifyMode(false)} className="bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4 lg:col-span-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Game's Hash (الهاش المطلوب تحليله)</label>
                    <input 
                      type="text" 
                      value={verifySeed}
                      onChange={(e) => setVerifySeed(e.target.value)}
                      placeholder="أدخل الهاش هنا..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Salt (BTC Block Hash)</label>
                    <input 
                      type="text" 
                      value={verifySalt}
                      onChange={(e) => setVerifySalt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">المضاعف المستهدف</label>
                      <input 
                        type="number" 
                        value={analysisTarget}
                        onChange={(e) => setAnalysisTarget(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-emerald-400"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">عدد جولات العرض</label>
                      <input 
                        type="number" 
                        value={verifyCount}
                        onChange={(e) => setVerifyCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSingleAnalyze}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Terminal className="w-4 h-4" />
                      تحليل الهاش الآن
                    </button>
                    <button 
                      onClick={runBatchVerification}
                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-95 text-xs"
                      title="تحقق من السلسلة كاملة"
                    >
                      عرض السلسلة ({verifyCount})
                    </button>
                  </div>

                  {analyzeResult !== null && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center"
                        >
                          <span className="text-[10px] text-emerald-500 uppercase font-bold block mb-1 font-mono">النتيجة المستخرجة لهذا الهاش</span>
                          <span className="text-4xl font-black text-emerald-400">{analyzeResult.toFixed(2)}x</span>
                        </motion.div>
                      </div>

                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-[9px] text-slate-500 uppercase font-bold block">سلسلة النتائج السابقة (التاريخ)</span>
                          <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">سلسلة SHA256</span>
                        </div>
                        <div className="space-y-1">
                          {historyResults.map((pred, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px] bg-slate-900/50 p-2 rounded-lg border border-slate-800/50 hover:bg-slate-900 transition-colors">
                              <span className="text-slate-500 font-mono">الماضية -{i+1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-700 font-mono truncate w-24">{pred.seed}</span>
                                <span className={`font-bold font-mono ${pred.result >= 2 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {pred.result.toFixed(2)}x
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-slate-600 mt-3 text-center italic">
                          ملاحظة: النتائج القادمة لا يمكن كشفها برمجياً لأن الهاش الحالي هو "تشفير" للهاش القادم.
                        </p>
                      </div>

                      {strategyAdvice && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-950 border border-emerald-500/20 rounded-xl p-3 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              <h4 className="text-[10px] font-bold text-slate-300">مستشار الاستراتيجية (ميزانية 10 عملات)</h4>
                            </div>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              strategyAdvice.last100xDist > 400 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {strategyAdvice.riskLevel}
                            </span>
                          </div>

                          <div className="bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                            <p className="text-[9px] text-slate-500 mb-0.5 uppercase">تحليل السلسلة (2000 جولة):</p>
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-[10px] text-blue-300 leading-tight">
                                آخر <span className="font-bold">{strategyAdvice.target}x</span> ظهر منذ <span className="text-white font-mono">{strategyAdvice.lastTargetDist}</span> جولة.
                              </p>
                              <span className="text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">تكرر {strategyAdvice.countIn2000} مرة</span>
                            </div>
                            
                            {strategyAdvice.gaps.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-blue-500/10">
                                <p className="text-[8px] text-slate-500 uppercase mb-1">المسافات الفاصلة بين آخر مرات الظهور:</p>
                                <div className="flex flex-wrap gap-1">
                                  {strategyAdvice.gaps.map((gap, idx) => (
                                    <div key={idx} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-slate-400">
                                      {gap}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[7px] text-slate-600 mt-1 italic">* الأرقام تمثل عدد الجولات بين كل ظهور والظهور الذي يسبقه.</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[8px] text-slate-500 font-bold uppercase px-1">تفريغ الرصيد (خطة الـ 10 عملات):</p>
                            {strategyAdvice.phases.map((phase, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
                                <span className="text-[9px] text-slate-400">{phase.rounds}</span>
                                <div className="text-right">
                                  <span className="text-[9px] block text-emerald-400 font-bold">راهن بـ {phase.bet}</span>
                                  <span className="text-[7px] text-slate-600 italic">تكلفة المرحلة: {phase.cost}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[300px]">
                  <div className="bg-slate-900/50 px-4 py-3 border-b border-slate-800 grid grid-cols-12 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                    <div className="col-span-1">#</div>
                    <div className="col-span-8">Game's Hash</div>
                    <div className="col-span-3 text-right">Bust</div>
                  </div>
                  <div className="overflow-y-auto divide-y divide-slate-900">
                    {verifyResults.map((res, idx) => (
                      <div key={idx} className="px-4 py-2.5 grid grid-cols-12 text-xs font-mono group hover:bg-slate-900/40 transition-colors">
                        <div className="col-span-1 text-slate-600 font-bold">{idx + 1}</div>
                        <div className="col-span-8 text-slate-400 truncate pr-4 group-hover:text-slate-200 transition-colors">{res.seed}</div>
                        <div className={`col-span-3 text-right font-bold ${res.result >= 2 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {res.result.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {verifyResults.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 opacity-50">
                        <Terminal className="w-8 h-8 mb-2" />
                        <p className="text-xs">Enter a hash to start batch verification</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Panel: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 px-1">Bet Amount</label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-1">
                  <input 
                    type="number" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    disabled={gameState === 'running'}
                    className="w-full bg-transparent border-none outline-none px-4 py-3 font-mono font-bold text-lg disabled:opacity-50"
                  />
                  <div className="flex gap-1 pr-1">
                    <button onClick={() => setBetAmount(prev => prev / 2)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">1/2</button>
                    <button onClick={() => setBetAmount(prev => prev * 2)} className="px-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">2x</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3 px-1">Auto Cashout</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(Number(e.target.value))}
                  disabled={gameState === 'running'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono font-bold text-lg outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {gameState === 'idle' ? (
                <div className="space-y-3">
                  <button 
                    onClick={startGame}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <Play className="fill-current w-6 h-6" />
                    بدء اللعب (BET)
                  </button>
                  <button 
                    onClick={peekNextResult}
                    className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 border border-slate-700/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    كشف النتيجة (المسؤول)
                  </button>
                </div>
              ) : gameState === 'running' ? (
                <button 
                  onClick={() => handleCashout(currentMultiplier)}
                  disabled={!!userBet?.cashoutAt}
                  className={`w-full py-5 font-black text-xl rounded-2xl transition-all flex flex-col items-center justify-center shadow-xl shadow-amber-900/20 active:scale-[0.98] ${
                    userBet?.cashoutAt 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <span>CASHOUT</span>
                  <span className="text-xs font-mono font-bold">
                    {userBet?.cashoutAt ? `At ${userBet.cashoutAt.toFixed(2)}x` : `Profit: ${(betAmount * currentMultiplier - betAmount).toFixed(2)}`}
                  </span>
                </button>
              ) : (
                <button 
                  onClick={handleNextRound}
                  className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xl rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <RotateCcw className="w-6 h-6" />
                  NEXT ROUND
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {showAdminMode && revealedCrashPoint && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center"
                >
                  <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">النتيجة القادمة (المخزنة)</p>
                  <p className="text-2xl font-black text-emerald-400">{revealedCrashPoint.toFixed(2)}x</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase px-2 mb-3 flex items-center gap-2">
              <History className="w-3 h-3" />
              Round History
            </h4>
            <div className="flex flex-wrap gap-2">
              {history.map((game) => (
                <div 
                  key={game.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    game.result >= 2.0 ? 'bg-emerald-900/20 text-emerald-500' : 'bg-slate-800 text-slate-400'
                  }`}
                  title={`Seed: ${game.seed}`}
                >
                  {game.result.toFixed(2)}x
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-slate-600 text-xs px-2 italic">No history yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Panel: Visualization */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 h-[480px] relative overflow-hidden flex flex-col items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" style={{ 
              backgroundImage: 'linear-gradient(#f8fafc 1px, transparent 1px), linear-gradient(90deg, #f8fafc 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            
            {/* Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-64 h-64 blur-[120px] transition-colors duration-1000 ${
                gameState === 'crashed' ? 'bg-rose-600/20' : 'bg-emerald-600/10'
              }`} />
            </div>

            <div className="relative z-10 text-center">
              {gameState === 'idle' ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Play className="text-slate-500 w-8 h-8 ml-1" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-widest">Waiting for Bet</h2>
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4"
                >
                  <h2 className={`text-9xl font-black tracking-tighter tabular-nums ${
                    gameState === 'crashed' ? 'crash-gradient' : 'multiplier-gradient'
                  }`}>
                    {currentMultiplier.toFixed(2)}x
                  </h2>
                  {gameState === 'crashed' && (
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-rose-500 px-6 py-2 rounded-full inline-block"
                    >
                      <span className="text-rose-950 font-black text-xl tracking-widest px-2">CRASHED</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Current Game Details (Trust Box) */}
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-950/50 backdrop-blur rounded-xl p-4 border border-slate-800/50">
              <div className="flex-1 truncate mr-4">
                <span className="text-slate-600 uppercase mr-2 font-bold">Active Seed</span>
                <span className="text-slate-400">{currentSeed.slice(0, 8)}...{currentSeed.slice(-8)}</span>
              </div>
              <div className="flex-1 truncate">
                <span className="text-slate-600 uppercase mr-2 font-bold">Block Salt</span>
                <span className="text-slate-400">{currentSalt.slice(0, 8)}...{currentSalt.slice(-8)}</span>
              </div>
            </div>
          </div>

          {/* Info Card: The Algorithm */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Terminal className="text-emerald-400 w-5 h-5" />
              مختبر فهم السلسلة (كيف يتم الإنشاء؟)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <RotateCcw className="w-3 h-3" />
                    دورة حياة السلسلة
                  </h4>
                  <div className="space-y-6 relative">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-800 border-l border-dashed border-slate-700" />
                    
                    <div className="relative pl-8">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                      <p className="text-[11px] font-bold text-rose-400">الموقع ينشئ السلسلة (سرياً)</p>
                      <p className="text-[10px] text-slate-500 italic">يبدأ من الهاش 10,000,000 ويشفر نزولاً للـ 1</p>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500" />
                      <p className="text-[11px] font-bold text-blue-400">تبدأ الألعاب (علناً)</p>
                      <p className="text-[10px] text-slate-500">يظهر لك الهاش الحالي. أنت تستطيع تشفيره ليتطابق مع "الماضي".</p>
                    </div>

                    <div className="relative pl-8">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      <p className="text-[11px] font-bold text-emerald-400">النتيجة القادمة؟</p>
                      <p className="text-[10px] text-slate-500">مخزنة في "المدخل" غير المكشوف للهاش الحالي. لا يمكن عكس التشفير!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-500/5 border border-blue-400/20 rounded-xl p-4">
                  <h4 className="text-blue-400 text-sm font-bold mb-2">لماذا العملية "رياضية" ولكنها صعبة؟</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تخيل أن التشفير مثل "طحن الفاكهة لتحويلها لعصير". 
                    <br/><br/>
                    - من السهل أن تعرف أن "هذا العصير" ناتج عن "تلك الفاكهة" (التحقق).
                    <br/>
                    - لكن من المستحيل أن تعيد "العصير" إلى "فاكهة سليمة" مرة أخرى بجهاز (التنبؤ).
                  </p>
                </div>
                
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">قاعدة التشفير</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <code className="text-[10px] text-emerald-500 font-mono block bg-slate-900 p-2 rounded">
                    Past_Hash = SHA256(Current_Hash)
                  </code>
                </div>
              </div>
            </div>
          </div>
          {/* Probability & Risk Strategy Section */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
              استراتيجية الربح (إدارة المخاطر)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-bold text-slate-300 mb-3">جدول الاحتمالات الرياضية</h4>
                  <div className="space-y-2">
                    {[
                      { mult: "1.10x", prob: "90.0%" },
                      { mult: "1.50x", prob: "66.0%" },
                      { mult: "2.00x", prob: "49.5%" },
                      { mult: "3.00x", prob: "33.0%" },
                      { mult: "10.0x", prob: "9.9%" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-800/50 last:border-0">
                        <span className="text-slate-500">عند الهدف <span className="text-slate-300">{row.mult}</span></span>
                        <span className="font-mono text-emerald-500 font-bold">{row.prob}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <h4 className="text-emerald-400 text-sm font-bold mb-2">كيف تربح بدون "تنبؤ"؟</h4>
                  <ul className="text-[10px] text-slate-400 space-y-2 list-disc pr-4 leading-relaxed">
                    <li><strong className="text-slate-200">الأهداف الصغيرة:</strong> المراهنة على 1.10x أو 1.20x تنجح في 9 من كل 10 مرات.</li>
                    <li><strong className="text-slate-200">تجنب "خسارة الطيار":</strong> الموقع يربح عندما يطمع اللاعب وينتظر الـ 100x.</li>
                    <li><strong className="text-slate-200">إدارة الرصيد:</strong> لا تراهن أبداً بأكثر من 1% من رصيدك في الجولة الواحدة.</li>
                    <li><strong className="text-slate-200">التحقق من السلسلة:</strong> استخدم هذا التطبيق للتأكد من أن الموقع لم يتلاعب بالنتائج السابقة.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* High Multiplier Analysis (100x) */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-amber-400">
              <Zap className="w-5 h-5" />
              تحليل المضاعفات الكبيرة (100x)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  إحصائياً، تظهر نتيجة <span className="text-amber-400 font-bold">100x</span> مرة واحدة كل 100 جولة كمتوسط طويل الأمد. إذا مرت <span className="text-white">500 جولة</span> دون ظهورها، فهذا يسمى <span className="text-rose-400">"فجوة إحصائية"</span> (Dry Spell).
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase">كيف تستغل هذه المعلومة؟</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-bold font-mono">1</div>
                    <p className="text-[10px] text-slate-300">انتظر فجوة تزيد عن 200 جولة دون ظهور رقم كبير (&gt;50x).</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs font-bold font-mono">2</div>
                    <p className="text-[10px] text-slate-300">ابدأ رهانك بمبالغ صغيرة جداً لانتظار الصعود الكبير.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 text-center">احتمالية "عدم" ظهور 100x في سلسلة جولات</h4>
                <div className="space-y-4">
                  {[
                    { rounds: "100 جولة", risk: "36.6%", label: "طبيعي" },
                    { rounds: "250 جولة", risk: "8.1%", label: "فجوة متوسطة" },
                    { rounds: "500 جولة", risk: "0.6%", label: "فجوة نادرة جداً" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">{item.rounds}</span>
                        <span className="text-slate-500">{item.label}</span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${i === 2 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                          style={{ width: `${100 - parseFloat(item.risk)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-600 text-right">احتمالية التواجد: {100 - parseFloat(item.risk)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Brute Force Reality Check */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-rose-400">
              <Terminal className="w-5 h-5" />
              محاكاة هجوم "القوة الغاشمة" (Brute Force)
            </h3>
            <div className="space-y-4">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                إذا أردت تجربة كل الاحتمالات للوصول إلى الهاش "القادم" الذي سينتج عنه قيمة بين 1.00x و 2.00x:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block mb-1">عدد الاحتمالات</span>
                  <span className="text-sm font-mono text-slate-300">2^256 احتمالاً</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase block mb-1">سرعة الكمبيوتر</span>
                  <span className="text-sm font-mono text-slate-300">100 Exahash/s</span>
                </div>
                <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                  <span className="text-[9px] text-rose-500 uppercase block mb-1">الزمن المتوقع للكسر</span>
                  <span className="text-sm font-bold text-rose-400">مليارات السنين</span>
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <h5 className="text-amber-500 text-xs font-bold mb-2">لماذا لا تنجح هذه الطريقة؟</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  حتى لو وجدت هاشاً عشوائياً يعطي نتيجة 1.50x، فهذا لا يعني أنه الهاش القادم في السلسلة الحقيقية للموقع. الموقع يستخدم "سلسلة مترابطة" (Chain)، ويجب أن تجد الهاش الذي <span className="text-white">إذا شفرناه اليوم</span> يعطينا هاش الأمس. 
                  عكس تشفير <span className="text-slate-200">SHA256</span> غير ممكن عملياً، وهذا هو سر أمان العملات الرقمية مثل البيتكوين.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-6 mt-4">
                <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  تحليل احتمالية الرقم (2.00x)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">فرصة ظهور 2.00x أو أكثر</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-black text-blue-400">49.5%</span>
                      <span className="text-[10px] text-slate-600 mb-1 leading-tight">تقريباً (بعد استقطاع 1% للموقع)</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold">هل 1.01 أسهل من 2.00؟</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      <span className="text-rose-400">لا، الوقت هو نفسه تماماً.</span> 
                      <br/><br/>
                      لأن الصعوبة ليست في "حساب النتيجة" بل في "إيجاد الهاش المفقود". لتعرف أن النتيجة القادمة هي 1.01، يجب أن تجد الهاش الذي يسبق الهاش الحالي، وهذه العملية تتطلب تجربة <span className="text-white font-mono">2^256</span> احتمال بغض النظر عن الرقم الذي سينتج في النهاية.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-slate-600 text-xs text-center border-t border-slate-900 pt-8 w-full max-w-5xl">
        <p>© 2026 azaam azeez Open Engine. Educational research into crypto-graphically verifiable gambling mechanisms.</p>
        <p className="mt-2">Warning: Gambling involves risk. This is a simulation engine.</p>
      </footer>
    </div>
  );
}
