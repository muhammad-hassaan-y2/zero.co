import { Card } from '@/components/status';
import { LiveVoiceAgent } from './voice-agent';

export default function LiveVoicePage() {
  return (
    <div>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Live Builder Call</h1>
        <p className="mt-3 max-w-3xl text-white/60">Talk or chat with the ZeroCo operator to design agents, workflows, policies, and automations in real time.</p>
      </div>
      <Card>
        <LiveVoiceAgent />
      </Card>
    </div>
  );
}
