import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Brain, 
  ClipboardList, 
  Zap, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  Bot, 
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  User,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Content } from "@google/genai";
import { cn } from './lib/utils';
import { runResearchCycle, ResearchStep } from './services/geminiService';

interface ResearchSession {
  id: string;
  query: string;
  steps: ResearchStep[];
  isComplete: boolean;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [currentStepType, setCurrentStepType] = useState<ResearchStep['s_type'] | null>(null);
  const [history, setHistory] = useState<Content[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isResearching]);

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isResearching) return;

    const sessionId = Date.now().toString();
    const newSession: ResearchSession = {
      id: sessionId,
      query,
      steps: [],
      isComplete: false
    };

    setSessions(prev => [...prev, newSession]);
    setIsResearching(true);
    setCurrentStepType(null);

    try {
      const cycle = runResearchCycle(query, history);
      for await (const step of cycle) {
        setCurrentStepType(step.s_type as ResearchStep['s_type']);
        setSessions(prev => {
          const sessionIndex = prev.findIndex(s => s.id === sessionId);
          if (sessionIndex === -1) return prev;

          const updatedSessions = [...prev];
          const session = { ...updatedSessions[sessionIndex] };
          const stepIndex = session.steps.findIndex(s => s.s_type === step.s_type);

          if (stepIndex !== -1) {
            const updatedSteps = [...session.steps];
            updatedSteps[stepIndex] = step as ResearchStep;
            session.steps = updatedSteps;
          } else {
            session.steps = [...session.steps, step as ResearchStep];
          }

          updatedSessions[sessionIndex] = session;
          return updatedSessions;
        });
      }
      
      setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return prev;
        const updatedSessions = [...prev];
        updatedSessions[sessionIndex] = { ...updatedSessions[sessionIndex], isComplete: true };
        return updatedSessions;
      });

    } catch (error) {
      console.error("Research failed:", error);
      setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return prev;
        const updatedSessions = [...prev];
        updatedSessions[sessionIndex].steps.push({ 
          s_type: 'final' as const, 
          content: "An unexpected error occurred during research." 
        });
        return updatedSessions;
      });
    } finally {
      setIsResearching(false);
      setCurrentStepType(null);
      setQuery('');
    }
  };

  const stepConfig = [
    { type: 'thinking', label: 'THINK', icon: Brain, color: 'text-blue-400' },
    { type: 'planning', label: 'PLAN', icon: ClipboardList, color: 'text-cyan-400' },
    { type: 'execution', label: 'EXECUTE', icon: Zap, color: 'text-yellow-400' },
    { type: 'refinement', label: 'REFINE', icon: RefreshCw, color: 'text-purple-400' },
    { type: 'final', label: 'REPORT', icon: FileText, color: 'text-green-400' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-research-dark text-slate-200 selection:bg-research-blue/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-research-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-research-blue/10 rounded-lg border border-research-blue/20">
              <Bot className="w-6 h-6 text-research-blue" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight glow-text">AI Agent Researcher</h1>
              <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">Autonomous Research Agent</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-research-cyan" /> Gemini Powered</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> System Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-6 py-8 overflow-hidden">
        {/* Chat History Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-12 pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {!sessions.length && !isResearching && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 py-24"
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                Accelerate Your <span className="text-research-blue">Intelligence</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                I am your Autonomous AI Research Agent. Deployed on Google's Gemini ecosystem, 
                I follow a rigorous Think • Plan • Execute • Refine cycle to deliver deep insights.
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {sessions.map((session) => (
              <div key={session.id} className="space-y-8">
                {/* User Message */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-end"
                >
                  <div className="bg-research-blue/10 border border-research-blue/20 rounded-2xl px-6 py-4 max-w-[80%] flex items-start gap-4">
                    <div className="flex-1 text-lg text-white font-medium">{session.query}</div>
                    <div className="p-2 bg-research-blue/20 rounded-lg">
                      <User className="w-5 h-5 text-research-blue" />
                    </div>
                  </div>
                </motion.div>

                {/* Agent Response (Steps) */}
                <div className="space-y-6">
                  {/* Progress Bar for active session */}
                  {!session.isComplete && (
                    <div className="grid grid-cols-5 gap-2 md:gap-4 max-w-3xl mx-auto">
                      {stepConfig.map((config) => {
                        const isCompleted = session.steps.some(s => s.s_type === config.type && s.content.length > 50);
                        const isActive = currentStepType === config.type;
                        const Icon = config.icon;

                        return (
                          <div key={config.type} className="flex flex-col items-center gap-3">
                            <div className={cn(
                              "w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative",
                              isActive && "bg-slate-700"
                            )}>
                              {isCompleted && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  className={cn("absolute inset-0 bg-current", config.color.replace('text-', 'bg-'))}
                                />
                              )}
                              {isActive && (
                                <motion.div 
                                  animate={{ x: [-100, 400] }}
                                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                  className={cn("absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-current to-transparent opacity-50", config.color.replace('text-', 'bg-'))}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Step Cards */}
                  <div className="space-y-6">
                    {session.steps.map((step, idx) => (
                      <motion.div
                        key={`${session.id}-${step.s_type}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "glass-panel p-6 md:p-8 space-y-4",
                          !session.isComplete && currentStepType === step.s_type && "step-active"
                        )}
                      >
                        <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const config = stepConfig.find(c => c.type === step.s_type);
                              const Icon = config?.icon || Sparkles;
                              return <Icon className={cn("w-5 h-5", config?.color)} />;
                            })()}
                            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-400">
                              {stepConfig.find(c => c.type === step.s_type)?.label} MODULE
                            </h3>
                          </div>
                          {!session.isComplete && currentStepType === step.s_type && (
                            <div className="flex items-center gap-2 text-xs text-research-blue font-mono">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              STREAMING
                            </div>
                          )}
                        </div>
                        <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-research-blue prose-code:text-research-cyan prose-pre:bg-slate-900/50">
                          <ReactMarkdown>{step.content}</ReactMarkdown>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Search Input Area */}
        <div className="mt-8 pt-4 border-t border-slate-800/50">
          <form onSubmit={handleResearch} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-research-blue to-research-cyan rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center glass-panel p-2">
              <div className="pl-4">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like me to research today?"
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-4 text-lg placeholder:text-slate-500"
                disabled={isResearching}
              />
              <button
                type="submit"
                disabled={isResearching || !query.trim()}
                className="bg-research-blue hover:bg-research-blue/90 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    Execute
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
          <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1"><History className="w-3 h-3" /> Context Memory Active</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Multi-Source Research</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-mono">
          <p>© 2026 AI Agent Researcher • Autonomous Research Protocol v3.1</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Think</span>
            <span className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Plan</span>
            <span className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Execute</span>
            <span className="flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Refine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
