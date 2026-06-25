'use client';

import { useRef, useState } from 'react';
import { MicOff, PhoneCall, Send, Volume2 } from 'lucide-react';

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

    setMessages((current) => [...current, { role: 'operator', text: data.reply }]);
    if (data.audioBase64) {
      const audio = new Audio(`data:${data.contentType || 'audio/mpeg'};base64,${data.audioBase64}`);
      await audio.play().catch(() => setError('Audio was generated, but the browser blocked autoplay. Press send again or interact with the page.'));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-white/10 bg-white/[.04] p-5">
        <div className="min-h-[320px] space-y-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center text-center text-white/45">
              <p>Start speaking or type a question about workflows, agents, policies, departments, or your AI-native company OS.</p>
            </div>
          ) : messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === 'founder' ? 'ml-auto max-w-2xl rounded-lg bg-cyan-400/15 p-4 text-cyan-50' : 'max-w-2xl rounded-lg border border-white/10 bg-black/25 p-4 text-white/80'}>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{message.role === 'founder' ? 'You' : 'ZeroCo Operator'}</p>
              <p className="mt-2 leading-relaxed">{message.text}</p>
            </div>
          ))}
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Speak or type here..."
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
          <h2 className="font-semibold">Live AWS Stack</h2>
        </div>
        <div className="mt-5 space-y-4 text-sm text-white/60">
          <p><span className="text-white">Input:</span> browser live microphone transcription</p>
          <p><span className="text-white">Brain:</span> Amazon Bedrock conversation response</p>
          <p><span className="text-white">Voice:</span> Amazon Polly MP3 playback</p>
          <p><span className="text-white">Transcribe:</span> `/api/transcribe` is available for S3/HTTPS audio job transcription</p>
        </div>
      </aside>
    </section>
  );
}
