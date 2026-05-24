"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { SectionLayout, ScrollStep, NarrativeBlock, StatCallout } from "@/components/ScrollSection";
import { PolicyCard, POLICY_CARDS } from "@/components/PolicyCard";
import { useScrollama } from "@/hooks/useScrollama";
import worstOffenders from "@/data/worst-offenders.json";

// Dynamic imports for heavy components
const Hero = dynamic(() => import("@/components/Hero"), { ssr: false });
const StarField = dynamic(() => import("@/components/StarField"), { ssr: false });
const GlobeMap = dynamic(() => import("@/components/GlobeMap"), { ssr: false });
const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });
const BeforeAfterSlider = dynamic(() => import("@/components/BeforeAfterSlider"), { ssr: false });
const SkyGlowDiagram = dynamic(() => import("@/components/SkyGlowDiagram"), { ssr: false });

// Bortle scale states for Section 2
const SECTION2_BORTLE = [
  { bortle: 1, skyglow: 0, label: "Bortle Scale: 1 — Natural dark sky" },
  { bortle: 3, skyglow: 0.15, label: "Bortle Scale: 3 — Rural sky" },
  { bortle: 5, skyglow: 0.35, label: "Bortle Scale: 5 — Suburban sky" },
  { bortle: 7, skyglow: 0.6, label: "Bortle Scale: 7 — Suburban/urban transition" },
];

interface WorstOffender {
  rank: number;
  city: string;
  country: string;
  bortle: number;
}

export default function Home() {
  // Section 2 state
  const [sec2Step, setSec2Step] = useState(0);
  const [showSkyGlowDiagram, setShowSkyGlowDiagram] = useState(false);
  const sec2Ref = useRef<HTMLDivElement>(null);

  // Section 3 state
  const [globeStep, setGlobeStep] = useState(0);
  const sec3Ref = useRef<HTMLDivElement>(null);

  // Section 5 state
  const [sec5RevealCount, setSec5RevealCount] = useState(0);
  const [sec5FocusedCity, setSec5FocusedCity] = useState(-1);
  const sec5Ref = useRef<HTMLDivElement>(null);

  // Section 7 state
  const [showPolicyCards, setShowPolicyCards] = useState(false);
  const sec7Ref = useRef<HTMLDivElement>(null);

  // Scrollama callbacks
  const onSec2Step = useCallback(({ index }: { index: number }) => {
    setSec2Step(index);
    setShowSkyGlowDiagram(index >= 2);
  }, []);

  const onSec3Step = useCallback(({ index }: { index: number }) => {
    setGlobeStep(index);
  }, []);

  const onSec5Step = useCallback(({ index }: { index: number }) => {
    if (index >= 2) {
      const cityIdx = index - 2; // 0-based city index
      setSec5RevealCount(cityIdx + 1);
      setSec5FocusedCity(cityIdx);
    } else {
      setSec5RevealCount(0);
      setSec5FocusedCity(-1);
    }
  }, []);

  const onSec7Step = useCallback(({ index }: { index: number }) => {
    if (index >= 1) setShowPolicyCards(true);
  }, []);

  useScrollama(sec2Ref as React.RefObject<HTMLElement>, ".sec2-step", onSec2Step, { offset: 0.55 });
  useScrollama(sec3Ref as React.RefObject<HTMLElement>, ".sec3-step", onSec3Step, { offset: 0.55 });
  useScrollama(sec5Ref as React.RefObject<HTMLElement>, ".sec5-step", onSec5Step, { offset: 0.6 });
  useScrollama(sec7Ref as React.RefObject<HTMLElement>, ".sec7-step", onSec7Step, { offset: 0.55 });

  const currentSec2 = SECTION2_BORTLE[Math.min(sec2Step, SECTION2_BORTLE.length - 1)];

  return (
    <main className="bg-bg min-h-screen">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <Hero />

      {/* ── SECTION 1 — The Baseline Sky ─────────────────────── */}
      <SectionLayout
        id="section-1"
        visual={
          <div className="w-full h-full relative">
            <StarField bortleLevel={1} skyglowIntensity={0} />
            <div className="absolute bottom-4 left-4">
              <span className="font-outfit text-text-muted" style={{ fontSize: "0.65rem" }}>
                Bortle Scale: 1 — Natural dark sky
              </span>
            </div>
          </div>
        }
      >
        <ScrollStep>
          <NarrativeBlock openingLine="Before we built cities, the night was full of stars.">
            <p>
              For most of human history, darkness was a daily experience. Every clear night, from
              anywhere on earth, you could see the Milky Way stretching overhead, not as a faint
              smudge, but as a dense, luminous band. Thousands of stars. The kind of sky that gave
              sailors direction and poets something to reach for.
            </p>
            <p>That sky still exists. But most of us will never see it.</p>
          </NarrativeBlock>
        </ScrollStep>
      </SectionLayout>

      {/* ── SECTION 2 — Why We Lost It ───────────────────────── */}
      <section id="section-2" ref={sec2Ref} className="scroll-container relative">
        <div className="sticky-visual">
          <div className="w-full h-full relative">
            <StarField
              bortleLevel={currentSec2.bortle}
              skyglowIntensity={currentSec2.skyglow}
            />
            <AnimatePresence>
              {showSkyGlowDiagram && <SkyGlowDiagram key="diagram" />}
            </AnimatePresence>
            <motion.div
              className="absolute bottom-4 left-4"
              key={currentSec2.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="font-outfit text-text-muted" style={{ fontSize: "0.65rem" }}>
                {currentSec2.label}
              </span>
            </motion.div>
          </div>
        </div>
        <div className="scroll-text py-[20vh]">
          <ScrollStep className="sec2-step">
            <NarrativeBlock openingLine="We didn't just light up our streets. We lit up the sky.">
              <p>
                When a city turns on its lights, some of that light goes up. It scatters through
                the atmosphere, bounces off air molecules and dust, and settles back down as a
                diffuse glow that washes out everything above it. We call it skyglow. You've seen
                it, that orange haze sitting over every city at night, visible from miles away.
              </p>
            </NarrativeBlock>
          </ScrollStep>

          <ScrollStep className="sec2-step">
            <div className="space-y-8">
              <div>
                <StatCallout>83%</StatCallout>
                <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed mt-2">
                  of the world's population lives under light-polluted skies.
                </p>
              </div>
              <div>
                <StatCallout>1/3</StatCallout>
                <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed mt-2">
                  of humanity has never seen the Milky Way.
                </p>
              </div>
            </div>
          </ScrollStep>

          <ScrollStep className="sec2-step">
            <div className="space-y-8">
              <div>
                <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
                  In Europe that number is{" "}
                  <StatCallout>60%</StatCallout>
                  {". "}
                  In North America, nearly{" "}
                  <StatCallout>80%</StatCallout>
                  {"."}
                </p>
              </div>
              <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
                And it's getting worse. A 2023 study found that sky brightness is growing at{" "}
                <StatCallout>9.6%</StatCallout>{" "}
                per year, far faster than anyone expected, driven by the global switch to white LED
                lighting. The satellites we use to measure it can't even see the blue light LEDs
                emit. We've been underestimating the damage.
              </p>
            </div>
          </ScrollStep>

          <ScrollStep className="sec2-step">
            <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
              Every city that switched on its lights altered the sky above it permanently. Not all
              at once, but steadily, street by street, year by year.
            </p>
          </ScrollStep>
        </div>
      </section>

      {/* ── SECTION 3 — The First Cities to Lose the Stars ───── */}
      <section id="section-3" ref={sec3Ref} className="scroll-container relative">
        <div className="sticky-visual">
          <GlobeMap currentStep={globeStep} />
        </div>
        <div className="scroll-text py-[20vh]">
          <ScrollStep className="sec3-step">
            <NarrativeBlock openingLine="It didn't happen all at once.">
              <p>
                The stars didn't disappear overnight. They faded city by city, decade by decade, as
                electric light spread across the world. Paris got its first electric streetlights in
                1878. New York followed in the early 1880s. By the mid-20th century, most major
                cities had made the switch, and the night sky above them had already changed
                forever.
              </p>
            </NarrativeBlock>
          </ScrollStep>

          <ScrollStep className="sec3-step">
            <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
              The technology kept evolving too. Arc lamps gave way to incandescent bulbs, then to
              sodium streetlights, then to the white LED lights that now line almost every street on
              earth. Each generation brighter, each one sending more light upward than the last.
            </p>
          </ScrollStep>

          <ScrollStep className="sec3-step">
            <p
              className="font-cormorant italic text-off-white leading-tight"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
            >
              We were solving for darkness. We didn't think to save it.
            </p>
          </ScrollStep>
        </div>
      </section>

      {/* ── SECTION 4 — Where We Are Now ─────────────────────── */}
      <SectionLayout
        id="section-4"
        visual={<WorldMap mode="pollution" />}
      >
        <ScrollStep>
          <NarrativeBlock openingLine="This is the world at night.">
            <p>
              Every point of light on this map is light escaping into the sky. The brightest
              regions, Western Europe, the eastern United States, East Asia, are places where the
              natural night has effectively ceased to exist. The darkest patches, the Sahara, the
              Australian outback, the Amazon, are what night used to look like everywhere.
            </p>
            <p>Hover over any country. The contrast between lit and dark regions is the story.</p>
          </NarrativeBlock>
        </ScrollStep>
      </SectionLayout>

      {/* ── SECTION 5 — The Worst Offenders ──────────────────── */}
      <section id="section-5" ref={sec5Ref} className="scroll-container relative">
        <div className="sticky-visual">
          <WorldMap
            mode="offenders"
            activeOffenderIndex={sec5FocusedCity >= 0 ? sec5FocusedCity : undefined}
          />
        </div>
        <div className="scroll-text py-[20vh]">
          <ScrollStep className="sec5-step">
            <NarrativeBlock openingLine="Some places have forgotten the sky entirely.">
              <p>
                Singapore is the most light-polluted country on earth. Its entire population lives
                under skies so bright that the human eye never fully adjusts to darkness. Hong Kong,
                Kuwait, Qatar, South Korea follow close behind. In these places, a clear night and a
                cloudy night look almost the same.
              </p>
            </NarrativeBlock>
          </ScrollStep>

          <ScrollStep className="sec5-step">
            <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
              The Bortle scale measures sky darkness from 1 to 9. A Bortle 1 sky is pristine, the
              Milky Way casting visible shadows. A Bortle 9 is an inner city sky, where only the
              moon, a handful of planets, and the brightest stars remain. Most major cities sit
              between 8 and 9. Most of their residents have never seen anything else.
            </p>
          </ScrollStep>

          {/* All 10 city cards pre-rendered so Scrollama can observe them all from mount */}
          {(worstOffenders as WorstOffender[]).map((city, i) => (
            <div key={city.rank} className="sec5-step scroll-step">
              <motion.div
                className="glass rounded-xl px-4 py-3 flex items-center gap-4"
                animate={{
                  opacity: i < sec5RevealCount ? 1 : 0,
                  x: i < sec5RevealCount ? 0 : 16,
                }}
                initial={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.45 }}
              >
                <span className="font-outfit text-text-muted text-sm w-5 flex-shrink-0 text-right">
                  {city.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-outfit text-off-white text-sm font-medium truncate">
                    {city.city}
                  </p>
                  <p className="font-outfit text-text-muted text-xs">{city.country}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <span className="font-outfit text-amber-glow text-xs font-medium">
                    Bortle {city.bortle}
                  </span>
                  <div className="w-20 h-1 rounded-full overflow-hidden bg-purple-faint">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-mid to-amber-glow"
                      style={{ width: `${(city.bortle / 9) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6 — Places That Still Have Darkness ──────── */}
      <SectionLayout
        id="section-6"
        visual={<WorldMap mode="dark-sky" showDarkSkyPlaces />}
      >
        <ScrollStep>
          <NarrativeBlock openingLine="Not every sky has been lost.">
            <p>
              There are still places on earth where the sky looks the way it always did. The
              NamibRand Nature Reserve in Namibia. The Aoraki Mackenzie Reserve in New Zealand. The
              Atacama Desert in Chile, where the air is so dry and the altitude so high that the
              stars are almost violent in their brightness.
            </p>
            <p>
              DarkSky International has certified more than 200 of these places across 22 countries,
              protecting them through lighting ordinances, land stewardship, and the simple belief
              that darkness is worth preserving. They range from remote wilderness reserves to small
              towns that decided the night sky was worth protecting.
            </p>
            <p>The sky never left. We just stopped making room for it.</p>
          </NarrativeBlock>
        </ScrollStep>
      </SectionLayout>

      {/* ── SECTION 7 — What It Would Take ───────────────────── */}
      <section id="section-7" ref={sec7Ref} className="scroll-container relative">
        <div className="sticky-visual">
          <BeforeAfterSlider
            leftLabel="Tucson 2016 — before LED retrofit"
            rightLabel="Tucson 2018 — after LED retrofit"
            leftBortle={8}
            rightBortle={5}
            leftSkyglow={0.65}
            rightSkyglow={0.2}
          />
        </div>
        <div className="scroll-text py-[20vh]">
          <AnimatePresence>
            {showPolicyCards && (
              <motion.div
                className="flex flex-col gap-3 mb-8"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {POLICY_CARDS.map((card, i) => (
                  <PolicyCard key={card.location} card={card} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <ScrollStep className="sec7-step">
            <NarrativeBlock openingLine="Roll back the light, and the sky rolls back too.">
              <p>
                Some cities are already doing it. Tucson, Arizona retrofitted its entire LED system
                in 2017, deliberately dimming lights at night and switching to warmer tones.
                Researchers measured a statistically significant reduction in sky brightness
                afterward. Flagstaff, Arizona has had a lighting ordinance since 1958 and has kept
                its skies stable for decades despite growing by hundreds of thousands of people.
                France passed a national law in 2018 requiring warmer lights, curfews on shop signs,
                and full shielding on outdoor fixtures.
              </p>
            </NarrativeBlock>
          </ScrollStep>

          <ScrollStep className="sec7-step">
            <div className="space-y-6">
              <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
                The fixes are not radical. Shield your lights so they point down. Dim them when
                nobody needs them. Switch to warmer tones that scatter less in the atmosphere. These
                are engineering decisions, not sacrifices.
              </p>
              <p className="font-outfit text-text-body text-base md:text-lg leading-relaxed">
                We didn't lose the stars because we wanted to. We lost them because we weren't
                paying attention. Now we are.
              </p>
            </div>
          </ScrollStep>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-purple-faint/30 px-8 py-16 md:py-24">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <p
              className="font-cormorant italic text-off-white"
              style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
            >
              We Forgot the Stars
            </p>
            <p className="font-outfit text-text-muted mt-1 text-sm">
              A data essay by Maryeme Idiata
            </p>
          </div>

          <div
            className="w-12 h-px"
            style={{ background: "rgba(168, 155, 232, 0.2)" }}
          />

          <div className="space-y-1">
            <p className="font-outfit text-text-muted text-xs uppercase tracking-widest mb-3">
              Data
            </p>
            <p className="font-outfit text-text-muted text-sm">
              World Atlas of Artificial Night Sky Brightness (Falchi et al., 2016)
            </p>
            <p className="font-outfit text-text-muted text-sm">
              DarkSky International Certified Places Registry
            </p>
            <p className="font-outfit text-text-muted text-sm">
              Kyba et al., Science, 2023
            </p>
          </div>

          <p className="font-outfit text-text-muted text-sm">
            Built with Next.js, D3.js, Scrollama
          </p>

          <a
            href="https://maryemeidiata.vercel.app"
            className="font-outfit text-purple-glow text-sm hover:text-lavender transition-colors duration-300 inline-block"
          >
            maryemeidiata.vercel.app
          </a>
        </div>
      </footer>
    </main>
  );
}
