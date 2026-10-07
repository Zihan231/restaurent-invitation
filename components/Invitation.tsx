"use client";

import Image from "next/image";
import { motion, type Variants } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import Curtain from "./Curtain";
import Countdown from "./Countdown";
import { EVENT, mapsUrl } from "@/lib/event";
import { celebrate } from "@/lib/confetti";

const EASE = [0.22, 1, 0.36, 1] as const;

const heroGroup: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.9 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};
const zoom: Variants = {
  hidden: { opacity: 0, scale: 0.86 },
  show: { opacity: 1, scale: 1, transition: { duration: 1.4, ease: EASE } },
};
// Desktop-only side panels glide in from behind the drapes.
const fromLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } },
};
const fromRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE } },
};
const unfurl: Variants = {
  hidden: { opacity: 0, scaleX: 0.2 },
  show: { opacity: 1, scaleX: 1, transition: { type: "spring", stiffness: 140, damping: 14 } },
};

// Scroll-reveal for sections below the fold (runs once, transform + opacity only).
const reveal = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.8, ease: EASE },
} as const;

function toICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function saveTheDate() {
  const start = EVENT.start;
  const end = new Date(start.getTime() + 4 * 3_600_000);
  const title = `${EVENT.title} – ${EVENT.name}`;
  const location = `${EVENT.address} (${EVENT.landmark})`;

  if (/Android/i.test(navigator.userAgent)) {
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${toICSDate(start)}/${toICSDate(end)}` +
      `&location=${encodeURIComponent(location)}` +
      `&details=${encodeURIComponent("You are invited to the Grand Opening. " + EVENT.website)}`;
    window.open(url, "_blank", "noopener");
    return;
  }

  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Water Park//Grand Opening//EN",
    "BEGIN:VEVENT",
    "UID:grand-opening-20261009@waterparkbd.com",
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc("You are invited to the Grand Opening. " + EVENT.website)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "water-park-grand-opening.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Invitation() {
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");
  const [copied, setCopied] = useState(false);

  // Lock scrolling until the curtain is raised.
  useEffect(() => {
    document.documentElement.classList.toggle("locked", stage === "closed");
  }, [stage]);

  const handleOpenStart = useCallback(() => {
    setStage("opening");
    window.scrollTo(0, 0);
    setTimeout(celebrate, 1100);
  }, []);

  const share = async () => {
    const data = {
      title: "Grand Opening · Water Park",
      text: "You're invited to the Grand Opening of Water Park Restaurant & Party Center — 9 Oct 2026, 4:30 PM",
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const revealed = stage !== "closed";

  return (
    <>
      <div className="backdrop" aria-hidden />

      {/* The tied-back curtain stays as the stage frame around the hero */}
      <Curtain onOpenStart={handleOpenStart} onOpenComplete={() => setStage("open")} />

      <main className="page" aria-hidden={!revealed}>
        {/* ---------- HERO ---------- */}
        <motion.section
          className="hero"
          variants={heroGroup}
          initial="hidden"
          animate={revealed ? "show" : "hidden"}
        >
          {/* On phones this wrapper is display: contents, so the column layout is unchanged */}
          <div className="hero__center">
          <motion.div variants={rise} className="hero__logo">
            <Image src="/images/logo.webp" alt="Water Park logo" width={480} height={333} priority />
          </motion.div>

          <motion.h1 variants={rise} className="hero__title">
            <span className="hero__grand">Grand</span>
            <span className="hero__opening gold-text">Opening</span>
          </motion.h1>

          <motion.div variants={unfurl} className="hero__ribbon">
            <Image src="/images/ribbon.webp" alt="Invitation" width={760} height={240} priority />
          </motion.div>

          <motion.div variants={zoom} className="hero__visual">
            <div className="rays" aria-hidden />
            <Image
              src="/images/building.webp"
              alt="Water Park Restaurant & Party Center lit up at night with its waterfall facade"
              width={1080}
              height={930}
              priority
              sizes="(max-width: 560px) 100vw, 520px"
              className="hero__building"
            />
            <div className="sparkles" aria-hidden>
              {Array.from({ length: 14 }).map((_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </div>
          </motion.div>

          <motion.p variants={rise} className="hero__name">
            Water Park Restaurant <br />&amp; Party Center
          </motion.p>

          <motion.a variants={rise} href="#details" className="scroll-cue" aria-label="Scroll to details">
            <span />
          </motion.a>
          </div>

          {/* Wide screens: fill the stage on either side of the building */}
          <motion.aside variants={fromLeft} className="hero__side hero__side--left">
            <p className="eyebrow">You are cordially invited</p>
            <Ornament />
            <p className="side__lead">We are delighted to invite you to the</p>
            <p className="side__title gold-text">Grand Opening Ceremony</p>
            <p className="side__tag">
              Dining • Celebration
              <br />
              Events &amp; Entertainment
            </p>
          </motion.aside>
          <motion.aside variants={fromRight} className="hero__side hero__side--right">
            <p className="eyebrow">Save the date</p>
            <p className="side__dow">{EVENT.dayLabel}</p>
            <p className="side__big">09</p>
            <p className="side__month">October 2026</p>
            <p className="side__time">{EVENT.timeLabel}</p>
            <Ornament />
            <p className="side__place">
              <PinIcon /> Uttara, Dhaka
            </p>
            <a href="#details" className="btn btn--outline side__btn">
              View Details
            </a>
          </motion.aside>
        </motion.section>

        {/* ---------- MESSAGE ---------- */}
        <motion.section className="message" id="details" {...reveal}>
          <Ornament />
          <p className="message__lead">We are delighted to invite you to the</p>
          <h2 className="message__title gold-text">Grand Opening Ceremony</h2>
          <p className="message__of">of</p>
          <p className="message__venue">Water Park Restaurant &amp; Party Center</p>
          <p className="message__tag">
            A new destination for Dining • Celebration • Events &amp; Entertainment
          </p>
          <p className="message__presence">
            Your esteemed presence will make this special occasion even more memorable.
          </p>
          <Ornament flip />
        </motion.section>

        {/* Date / venue / RSVP: stacked on phones, side by side on wide screens */}
        <div className="cards">
        {/* ---------- DATE ---------- */}
        <motion.section className="card date" {...reveal}>
          <p className="eyebrow">Save the date</p>
          <div className="date__row">
            <div className="date__day">
              <span className="date__dow">{EVENT.dayLabel}</span>
              <span className="date__num">09</span>
              <span className="date__month">October 2026</span>
            </div>
            <div className="date__divider" />
            <div className="date__time">
              <span className="date__dow">Ceremony at</span>
              <span className="date__clock">4:30</span>
              <span className="date__month">PM</span>
            </div>
          </div>
          <Countdown />
          <motion.button type="button" className="btn btn--gold" onClick={saveTheDate} whileTap={{ scale: 0.96 }}>
            <CalendarIcon /> Add to Calendar
          </motion.button>
        </motion.section>

        {/* ---------- VENUE ---------- */}
        <motion.section className="card venue" {...reveal}>
          <p className="eyebrow">The venue</p>
          <h3 className="venue__name">{EVENT.venue}</h3>
          <p className="venue__addr">
            <PinIcon /> {EVENT.address}
          </p>
          <p className="venue__landmark">{EVENT.landmark}</p>
          <motion.a
            className="btn btn--outline"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
          >
            <PinIcon /> Get Directions
          </motion.a>
        </motion.section>

        {/* ---------- CONTACT ---------- */}
        <motion.section className="card contact" {...reveal}>
          <p className="eyebrow">Kindly RSVP</p>
          <a className="contact__row" href={`tel:${EVENT.phone}`}>
            <PhoneIcon />
            <span>
              <small>Hotline</small>
              {EVENT.phoneLabel}
            </span>
          </a>
          <a className="contact__row" href={`mailto:${EVENT.email}?subject=${encodeURIComponent("Grand Opening RSVP")}`}>
            <MailIcon />
            <span>
              <small>E-mail</small>
              {EVENT.email.split("@")[0]}@<wbr />
              {EVENT.email.split("@")[1]}
            </span>
          </a>
          <a className="contact__row" href={EVENT.website} target="_blank" rel="noopener noreferrer">
            <GlobeIcon />
            <span>
              <small>Website</small>
              {EVENT.websiteLabel}
            </span>
          </a>
        </motion.section>
        </div>

        {/* ---------- FOOTER ---------- */}
        <motion.footer className="footer" {...reveal}>
          <p className="footer__line">We look forward to welcoming you</p>
          <motion.button type="button" className="btn btn--gold" onClick={share} whileTap={{ scale: 0.96 }}>
            <ShareIcon /> {copied ? "Link copied!" : "Share Invitation"}
          </motion.button>
          <button type="button" className="footer__replay" onClick={() => window.location.reload()}>
            ↺ Raise the curtain again
          </button>
          <Image src="/images/logo.webp" alt="" width={120} height={83} className="footer__logo" />
        </motion.footer>
      </main>
    </>
  );
}

function Ornament({ flip }: { flip?: boolean }) {
  return (
    <svg className="ornament" viewBox="0 0 240 24" style={flip ? { transform: "scaleY(-1)" } : undefined} aria-hidden>
      <path d="M0 12h92M148 12h92" stroke="currentColor" strokeWidth="1" />
      <path d="M120 2l10 10-10 10-10-10z" fill="currentColor" />
      <circle cx="98" cy="12" r="2.5" fill="currentColor" />
      <circle cx="142" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const CalendarIcon = () => (<svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>);
const PinIcon = () => (<svg {...iconProps}><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
const PhoneIcon = () => (<svg {...iconProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>);
const MailIcon = () => (<svg {...iconProps}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>);
const GlobeIcon = () => (<svg {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>);
const ShareIcon = () => (<svg {...iconProps}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>);
