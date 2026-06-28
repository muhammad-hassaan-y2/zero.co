'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, MicOff, PhoneCall, Send, Sparkles, Volume2 } from 'lucide-react';

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type Message = {
  role: 'founder' | 'operator';
  text: string;
  mode?: string;
  created?: {
    agent: { id: string; name: string } | null;
    workflows: number;
    policies: number;
    sops: number;
    events: number;
    decisions: number;
  } | null;
};

export function LiveVoiceAgent() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  function speechRecognition() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('This browser does not support live speech recognition. Type your message instead.');
      return null;
    }
    return new Recognition();
  }

  function startListening() {
    const recognition = speechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setDraft(transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setError(null);
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  async function sendMessage() {
    const message = draft.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);
    setDraft('');
    setMessages((current) => [...current, { role: 'founder', text: message }]);

    const response = await fetch('/api/live/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: messages.map((item) => `${item.role}: ${item.text}`).join('\n').slice(-5000),
      }),
    });

    setSending(false);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || 'Live response failed.');
      return;
    }

    setMessages((current) => [...current, { role: 'operator', text: data.reply, mode: data.mode, created: data.created }]);
    if (data.audioBase64) {
      const audio = new Audio(`data:${data.contentType || 'audio/mpeg'};base64,${data.audioBase64}`);
      await audio.play().catch(() => setError('Audio was generated, but the browser blocked autoplay. Press send again or interact with the page.'));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-lg border border-white/10 bg-white/[.04] p-5">
        <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Bot size={20} /> AI Company Builder</h2>
            <p className="mt-1 text-sm text-white/50">Chat or talk in the same builder. Describe the agent, workflow, tools, risks, and outcome. ZeroCo can create the artifacts directly in your OS.</p>
          </div>
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">Bedrock + Polly</div>
        </div>
        <div className="min-h-[320px] space-y-4">
          {messages.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center text-center">
              <div className="max-w-2xl">
                <Sparkles className="mx-auto text-cyan-200" />
                <p className="mt-4 text-white/65">Describe what you need built.</p>
                <div className="mt-5 grid gap-2 text-left text-sm text-white/45 md:grid-cols-2">
                  <button onClick={() => setDraft('Create a sales agent that finds qualified leads, writes personalized outreach, books demos, updates CRM, and asks approval before bulk sends.')} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left hover:bg-white/[.07]">Create a sales agent</button>
                  <button onClick={() => setDraft('Create a customer support agent with ticket triage, refund escalation, response drafting, QA review, and approval gates.')} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left hover:bg-white/[.07]">Create support workflows</button>
                  <button onClick={() => setDraft('Build a finance workflow to detect unpaid invoices, draft follow-ups, log payment status, and escalate risky accounts.')} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left hover:bg-white/[.07]">Build finance workflow</button>
                  <button onClick={() => setDraft('Ask me onboarding questions and help me decide which agents and workflows my company needs.')} className="rounded-lg border border-white/10 bg-black/25 p-3 text-left hover:bg-white/[.07]">Guide onboarding</button>
                </div>
              </div>
            </div>
          ) : messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === 'founder' ? 'ml-auto max-w-2xl rounded-lg bg-cyan-400/15 p-4 text-cyan-50' : 'max-w-2xl rounded-lg border border-white/10 bg-black/25 p-4 text-white/80'}>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{message.role === 'founder' ? 'You' : 'ZeroCo Operator'}</p>
              <p className="mt-2 leading-relaxed">{message.text}</p>
              {message.created && (
                <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
                  <p className="font-medium">Created in this workspace</p>
                  <p className="mt-1 text-emerald-100/75">
                    {message.created.agent ? `${message.created.agent.name}, ` : ''}
                    {message.created.workflows} workflows, {message.created.policies} policies, {message.created.sops} SOPs, {message.created.decisions} ledger records.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/dashboard/digital-ftes" className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black">View FTEs</Link>
                    <Link href="/dashboard/workflows" className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/75">Run workflows</Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Describe an agent, workflow, or company capability to build..."
            className="min-h-24 flex-1 resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
          />
          <div className="flex gap-2 md:flex-col">
            <button onClick={listening ? stopListening : startListening} className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50 hover:bg-cyan-400/15">
              {listening ? <MicOff size={18} /> : <PhoneCall size={18} />}
              {listening ? 'End call' : 'Talk live'}
            </button>
            <button disabled={sending || !draft.trim()} onClick={sendMessage} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50">
              <Send size={18} />
              {sending ? 'Sending' : 'Send'}
            </button>
          </div>
        </div>
      </div>
      <aside className="rounded-lg border border-white/10 bg-black/25 p-5">
        <div className="flex items-center gap-3 text-cyan-200">
          <Volume2 size={20} />
          <h2 className="font-semibold">Builder AWS Stack</h2>
        </div>
        <div className="mt-5 space-y-4 text-sm text-white/60">
          <p><span className="text-white">Input:</span> typed chat or browser microphone in one builder</p>
          <p><span className="text-white">Planner:</span> Amazon Bedrock decides whether to answer, ask follow-up, or create artifacts</p>
          <p><span className="text-white">Builder:</span> agents, workflows, policies, SOPs, events, and ledger rows are persisted</p>
          <p><span className="text-white">Voice:</span> Amazon Polly speaks the operator reply</p>
        </div>
      </aside>
    </section>
  );
}
