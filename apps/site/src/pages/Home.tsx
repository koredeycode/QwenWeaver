import { Hero } from '../components/Hero.js';
import { AiPromptSection } from '../components/sections/AiPromptSection.js';
import { VisualBuilderSection } from '../components/sections/VisualBuilderSection.js';
import { SupervisorSection } from '../components/sections/SupervisorSection.js';
import { StreamingSection } from '../components/sections/StreamingSection.js';
import { IntegrationsSection } from '../components/sections/IntegrationsSection.js';
import { CTA } from '../components/CTA.js';

export function Home() {
  return (
    <div className="relative">
      <Hero />
      <AiPromptSection />
      <VisualBuilderSection />
      <SupervisorSection />
      <StreamingSection />
      <IntegrationsSection />
      <CTA />
    </div>
  );
}
