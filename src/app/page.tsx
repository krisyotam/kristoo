"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"

/* ─── Color constants ─────────────────────────────────────────────────────── */

const fg = "hsl(var(--fg))"
const fg2 = "hsl(var(--fg-secondary))"
const fg3 = "hsl(var(--fg-tertiary))"
const fg4 = "hsl(var(--fg-quaternary))"
const bdr = "hsl(var(--border))"
const subtle = "hsl(var(--bg-subtle))"
const accent = "hsl(var(--accent))"
const accentHover = "hsl(var(--accent-hover))"

/* ─── Page data ───────────────────────────────────────────────────────────── */

const pageData = {
  title: "Kristoo",
  preview: "An opinionated, FOSS, anti-establishment OS. No gods, no masters.",
  start_date: "2026-04-06",
  status: "In Progress" as const,
  confidence: "certain" as const,
  importance: 9,
}

/* ─── Date utilities ──────────────────────────────────────────────────────── */

const DATE_LOCALE = "en-US"
const DATE_TZ = "America/Chicago"

type DateInput = string | Date | null | undefined

function parseDate(input: DateInput): Date | null {
  if (!input) return null
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number)
    const date = new Date(year, month - 1, day, 12, 0, 0)
    return isNaN(date.getTime()) ? null : date
  }
  if (typeof input === "string") {
    const date = new Date(input)
    return isNaN(date.getTime()) ? null : date
  }
  return null
}

function formatDate(input: DateInput): string {
  const date = parseDate(input)
  if (!date) return "Invalid date"
  return date.toLocaleDateString(DATE_LOCALE, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function formatDateRange(start: DateInput, end?: DateInput): string {
  const startDate = parseDate(start)
  if (!startDate) return "Invalid date"
  if (!end) return formatDate(startDate)
  const endDate = parseDate(end)
  if (!endDate) return formatDate(startDate)
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function getTodayISO(): string {
  const parts = new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: DATE_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === "year")?.value || "2000"
  const m = parts.find(p => p.type === "month")?.value || "01"
  const d = parts.find(p => p.type === "day")?.value || "01"
  return `${y}-${m}-${d}`
}

/* ─── Opacity helpers ─────────────────────────────────────────────────────── */

function getConfidenceOpacity(confidence: string): number {
  const map: Record<string, number> = {
    certain: 1, "highly likely": 0.9, likely: 0.8, possible: 0.65,
    unlikely: 0.5, "highly unlikely": 0.4, remote: 0.3, impossible: 0.2,
  }
  return map[confidence] ?? 0.65
}

function getStatusOpacity(status: string): number {
  const map: Record<string, number> = {
    Finished: 1, Published: 1, Active: 1, "In Progress": 0.9,
    Draft: 0.75, Planned: 0.65, Notes: 0.5, Abandoned: 0.4,
  }
  return map[status] ?? 0.65
}

function getImportanceOpacity(importance: number): number {
  if (importance >= 8) return 1
  if (importance >= 6) return 0.85
  if (importance >= 4) return 0.65
  if (importance >= 2) return 0.5
  return 0.35
}

/* ─── Popover explanations ────────────────────────────────────────────────── */

const STATUS_EXPLANATION = `The status indicator reflects the current state of the work:

- Abandoned: Work that has been discontinued
- Notes: Initial collections of thoughts and references
- Draft: Early structured version with a central thesis
- In Progress: Well-developed work actively being refined
- Finished: Completed work with no planned major changes`

const CONFIDENCE_EXPLANATION = `The confidence tag uses the Kesselman List of Estimative Words:

1. certain
2. highly likely
3. likely
4. possible
5. unlikely
6. highly unlikely
7. remote
8. impossible`

const IMPORTANCE_EXPLANATION = `Importance from 0-10 based on potential impact on the reader, the intended audience, and the world at large. Fundamental research ranks 9-10, minor experiments 0-1.`

/* ─── Shared small components ─────────────────────────────────────────────── */

function InfoIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function HoverLink({
  href,
  children,
  className = "",
  style,
}: {
  href: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto") || href.startsWith("ircs") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className={`transition-all duration-200 ${className}`}
      style={{ color: fg3, ...style }}
      onMouseEnter={(e) => { e.currentTarget.style.color = accentHover }}
      onMouseLeave={(e) => { e.currentTarget.style.color = fg3 }}
    >
      {children}
    </a>
  )
}

/* ─── Indicator popover ───────────────────────────────────────────────────── */

function IndicatorWithPopover({
  label,
  explanation,
  opacity,
}: {
  label: string
  explanation: string
  opacity: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 cursor-help select-none" style={{ color: fg, opacity }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen(o => !o)}>
      <InfoIcon />
      <span className="font-medium">{label}</span>
      {open && (
        <div
          className="absolute top-full left-1/2 mt-2 z-50 w-72 rounded border p-3 text-xs"
          style={{
            transform: "translateX(-50%)",
            backgroundColor: "hsl(var(--bg))",
            borderColor: bdr,
            color: fg2,
            fontFamily: "serif",
            whiteSpace: "pre-wrap",
            lineHeight: "1.6",
          }}
        >
          {explanation}
        </div>
      )}
    </div>
  )
}

/* ─── Header ──────────────────────────────────────────────────────────────── */

function PageHeader({
  title,
  preview,
  start_date,
  end_date,
  status,
  confidence,
  importance,
}: {
  title: string
  preview?: string
  start_date?: string
  end_date?: string
  status: string
  confidence: string
  importance: number
}) {
  const renderDate = () => {
    if (start_date || end_date) {
      const dateTime = start_date || end_date
      let formattedDate = ""
      if (start_date) {
        const effectiveEnd = end_date?.trim() || getTodayISO()
        formattedDate = formatDateRange(start_date, effectiveEnd)
      } else if (end_date) {
        formattedDate = formatDate(end_date.split("T")[0])
      }
      return (
        <time dateTime={dateTime} className="font-mono text-sm" style={{ color: fg3 }}>
          {formattedDate}
        </time>
      )
    }
    return null
  }

  return (
    <header className="mb-2.5 relative">
      <a
        href="https://krisyotam.com"
        className="inline-flex items-center text-sm transition-opacity duration-200 mb-6 group font-serif italic hover:opacity-60"
        style={{ color: fg3 }}
      >
        <ArrowLeftIcon />
        Back to Kris
      </a>

      <div className="border p-6 rounded-sm" style={{ borderColor: bdr }}>
        <h1 className="font-serif font-medium tracking-tight mb-2 text-center text-4xl" style={{ color: fg }}>
          {title}
        </h1>

        {preview && (
          <p className="text-center font-serif text-sm italic mb-6 max-w-2xl mx-auto" style={{ color: fg3 }}>
            {preview}
          </p>
        )}

        {(start_date || end_date) && (
          <div className="text-center mb-4">{renderDate()}</div>
        )}

        <div className="flex flex-wrap justify-center items-center gap-x-3 text-sm font-mono mb-2">
          <IndicatorWithPopover
            label={`status: ${status}`}
            explanation={STATUS_EXPLANATION}
            opacity={getStatusOpacity(status)}
          />
          <span style={{ color: fg4 }}>&middot;</span>
          <IndicatorWithPopover
            label={`certainty: ${confidence}`}
            explanation={CONFIDENCE_EXPLANATION}
            opacity={getConfidenceOpacity(confidence)}
          />
          <span style={{ color: fg4 }}>&middot;</span>
          <IndicatorWithPopover
            label={`importance: ${importance}/10`}
            explanation={IMPORTANCE_EXPLANATION}
            opacity={getImportanceOpacity(importance)}
          />
        </div>

        <div className="mt-4" style={{ borderBottomWidth: 1, borderColor: bdr }}></div>
      </div>

      <div className="mt-6" style={{ borderBottomWidth: 1, borderColor: bdr }}></div>
    </header>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function useDateTime(tz: string) {
  const [val, setVal] = useState("")
  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: tz })
      const y = now.toLocaleDateString("en-CA", { year: "numeric", timeZone: tz })
      const m = now.toLocaleDateString("en-CA", { month: "2-digit", timeZone: tz })
      const d = now.toLocaleDateString("en-CA", { day: "2-digit", timeZone: tz })
      return `${y}.${m}.${d} ${time}`
    }
    setVal(fmt())
    const id = setInterval(() => setVal(fmt()), 1000)
    return () => clearInterval(id)
  }, [tz])
  return val
}

function PulseDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ animationDuration: "2s", backgroundColor: "hsl(var(--fg-quaternary))" }} />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--fg-quaternary))" }} />
    </span>
  )
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button" aria-label={label} onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-opacity duration-200 hover:opacity-60"
      style={{ color: "hsl(var(--fg-tertiary))" }}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

function Footer() {
  const [face, setFace] = useState(0)
  const [animating, setAnimating] = useState(false)
  const dateTime = useDateTime("America/Chicago")
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const id = setInterval(() => {
      setAnimating(true)
      setTimeout(() => { setFace((f) => (f === 0 ? 1 : 0)); setAnimating(false) }, 400)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const toggleTheme = useCallback(() => { setTheme(theme === "dark" ? "light" : "dark") }, [theme, setTheme])

  const faces = [
    <span key="time" className="inline-flex items-center gap-1.5"><PulseDot />{dateTime} in Naperville, IL</span>,
    <span key="kristoo" className="inline-flex items-center gap-1.5"><PulseDot />kristoo — no gods, no masters</span>,
  ]

  const current = face
  const next = face === 0 ? 1 : 0

  return (
    <>
      <hr style={{ borderColor: "hsl(var(--border))" }} className="mt-1 mb-0 border-t" />
      <footer className="w-full py-3 flex items-center text-xs font-mono" style={{ color: "hsl(var(--fg-tertiary))" }}>
        <div className="grow text-left">
          <div className="relative h-4 overflow-hidden">
            <div className="absolute inset-x-0" style={{ transform: animating ? "translateY(-100%)" : "translateY(0)", opacity: animating ? 0 : 1, transition: animating ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease" : "none" }}>
              {faces[current]}
            </div>
            <div className="absolute inset-x-0" style={{ transform: animating ? "translateY(0)" : "translateY(100%)", opacity: animating ? 1 : 0, transition: animating ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease" : "none" }}>
              {faces[next]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a href="https://github.com/krisyotam/kristoo" target="_blank" rel="noopener noreferrer">
            <IconButton label="GitHub">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </IconButton>
          </a>
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            {theme === "dark" ? (
              <>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </>
            ) : (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </IconButton>
        </div>
      </footer>
    </>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const end_date = getTodayISO()

  return (
    <div className="px-8 pt-8 pb-0 md:px-12 md:pt-12 md:pb-0 lg:px-16 lg:pt-16 lg:pb-0 flex flex-col" style={{ zoom: 0.9, minHeight: "calc(100vh / 0.9)" }}>
      <div className="max-w-3xl mx-auto flex-1 w-full flex flex-col">

        {/* ── Header ── */}
        <PageHeader
          title={pageData.title}
          preview={pageData.preview}
          start_date={pageData.start_date}
          end_date={end_date}
          status={pageData.status}
          confidence={pageData.confidence}
          importance={pageData.importance}
        />

        {/* ── Content ── */}
        <div className="flex-1">

          {/* Hero Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
            {/* Left: Gentoo logo */}
            <div className="border flex flex-col" style={{ borderColor: bdr }}>
              <div className="flex-1 overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity duration-300">
                <div className="relative w-full aspect-square flex items-center justify-center">
                  <img src="/images/gentoo-logo.svg" alt="Gentoo Linux Logo" className="w-[78%] h-[78%] object-contain select-none pointer-events-none" onContextMenu={(e) => e.preventDefault()} />
                </div>
              </div>
              <div className="flex items-stretch h-10" style={{ borderTopWidth: 1, borderColor: bdr }}>
                <HoverLink href="https://www.gentoo.org" className="flex-1 flex items-center justify-center text-xs">Gentoo</HoverLink>
                <HoverLink href="https://wiki.gentoo.org" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>Wiki</HoverLink>
                <HoverLink href="https://packages.gentoo.org" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>Packages</HoverLink>
              </div>
            </div>
            {/* Right: Kristoo logo */}
            <div className="border flex flex-col" style={{ borderColor: bdr }}>
              <div className="flex-1 overflow-hidden hover:opacity-90 transition-opacity duration-300">
                <div className="relative w-full aspect-square">
                  <img src="/images/kristoo-logo.png" alt="Kristoo" className="w-full h-full object-contain select-none pointer-events-none" onContextMenu={(e) => e.preventDefault()} />
                </div>
              </div>
              <div className="flex items-stretch h-10" style={{ borderTopWidth: 1, borderColor: bdr }}>
                <HoverLink href="https://krisyotam.com" className="flex-1 flex items-center justify-center text-xs">About Me</HoverLink>
                <HoverLink href="https://github.com/krisyotam" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>GitHub</HoverLink>
                <HoverLink href="https://github.com/krisyotam/kristoo" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>Source</HoverLink>
              </div>
            </div>
          </div>

          {/* Big Quote */}
          <div className="relative text-center mb-20 py-12 px-8">
            <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTopWidth: 2, borderRightWidth: 2, borderColor: bdr }} />
            <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottomWidth: 2, borderLeftWidth: 2, borderColor: bdr }} />
            <p className="font-serif text-2xl md:text-4xl font-light leading-tight tracking-tight" style={{ color: fg }}>
              Your computer should answer to you<br />and no one else.
            </p>
          </div>

          {/* Bento: Philosophy + Tenets */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-px mb-6" style={{ backgroundColor: bdr }}>
            <div className="md:col-span-3 p-6 space-y-4" style={{ backgroundColor: "hsl(var(--bg))" }}>
              <p className="font-serif text-sm leading-relaxed" style={{ color: fg2 }}>Every major distribution ships with decisions already made for you. They choose your init system, your package format, your desktop, your update schedule. They call this convenience. We call it surrender.</p>
              <p className="font-serif text-sm leading-relaxed" style={{ color: fg2 }}>Kristoo starts from source. Every package is compiled with your flags, on your hardware, for your purposes. Nothing runs that you did not ask for. Nothing phones home. Nothing auto-updates. Nothing requires an account.</p>
              <p className="font-serif text-sm leading-relaxed" style={{ color: fg2 }}>This is not a distribution for everyone. It is not trying to be. Kristoo is for people who believe that understanding your system is not overhead -- it is the point.</p>
            </div>
            <div className="md:col-span-2" style={{ backgroundColor: "hsl(var(--bg))" }}>
              {["Source-compiled","No systemd","No telemetry","No unchosen defaults","No corporate upstream","Minimal by design","Docs over magic"].map((tenet, i, arr) => (
                <div key={tenet} className="flex items-center gap-3 px-5 py-3 transition-all duration-200 hover:pl-7" style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: bdr }}>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm" style={{ color: fg }}>{tenet}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bento: Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mb-6" style={{ backgroundColor: bdr }}>
            {[{value:"0",label:"Packages"},{value:"7",label:"Tenets"},{value:"100%",label:"Source-built"},{value:"0",label:"Telemetry"}].map((stat) => (
              <div key={stat.label} className="py-8 px-4 text-center" style={{ backgroundColor: "hsl(var(--bg))" }}>
                <div className="font-mono text-3xl font-light tracking-tight" style={{ color: fg }}>{stat.value}</div>
                <div className="text-xs mt-2 uppercase tracking-wider" style={{ color: fg4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Bento: Stack + Quick Start */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px mb-6" style={{ backgroundColor: bdr }}>
            <div style={{ backgroundColor: "hsl(var(--bg))" }}>
              {[["Base","Gentoo Linux"],["Init","OpenRC"],["Shell","fish"],["Compiler","GCC -march=native"],["Packages","Portage"],["WM","dwm"],["Terminal","st"],["Editor","neovim"],["Bar","dwmblocks"],["Launcher","dmenu"]].map(([k, v], i, arr) => (
                <div key={k} className="flex items-baseline justify-between px-5 py-2 text-xs transition-all duration-200 hover:px-7" style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: bdr }}>
                  <span style={{ color: accent }}>{k}</span>
                  <span className="font-mono text-sm" style={{ color: fg }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="p-5 flex items-center" style={{ backgroundColor: subtle }}>
              <pre className="font-mono text-xs leading-loose w-full overflow-x-auto" style={{ color: fg2 }}>
{`# sync the kristoo overlay
emerge --sync kristoo

# set the base profile
eselect profile set kristoo/default

# rebuild world
emerge -avuDN @world`}
              </pre>
            </div>
          </div>

          {/* Download */}
          <div className="mb-6">
            <div className="border" style={{ borderColor: bdr }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {[{file:"kristoo-2026.04-stage4.tar.xz",desc:"Full system snapshot, ready to boot"},{file:"kristoo-2026.04-minimal.iso",desc:"Minimal install media"}].map((item, i) => (
                  <div key={item.file} className="p-6 hover:opacity-75 transition-opacity duration-300 cursor-pointer" style={{ borderRightWidth: i === 0 ? 1 : 0, borderColor: bdr }}>
                    <div className="font-mono text-sm mb-2" style={{ color: fg }}>{item.file}</div>
                    <div className="text-xs mb-4" style={{ color: fg3 }}>{item.desc}</div>
                    <div className="text-xs font-mono" style={{ color: fg4 }}>Size: -- &middot; SHA256: --</div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4" style={{ borderTopWidth: 1, borderColor: bdr }}>
                <p className="text-xs italic" style={{ color: fg4 }}>Downloads available when the first release is ready. Source is available now.</p>
              </div>
              <div className="flex items-stretch h-10" style={{ borderTopWidth: 1, borderColor: bdr }}>
                <HoverLink href="https://github.com/krisyotam/kristoo" className="flex-1 flex items-center justify-center text-xs">GitHub</HoverLink>
                <HoverLink href="#" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>Source Tarball</HoverLink>
                <HoverLink href="#" className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: 1, borderColor: bdr } as React.CSSProperties}>Mirrors</HoverLink>
              </div>
            </div>
          </div>

          {/* Bento: Handbook + Repos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px mb-6" style={{ backgroundColor: bdr }}>
            <div className="p-6 flex flex-col justify-between" style={{ backgroundColor: "hsl(var(--bg))" }}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: fg4 }}>Handbook</p>
                <p className="text-sm leading-relaxed" style={{ color: fg2 }}>The Kristoo Handbook covers installation, configuration, and philosophy in full.</p>
              </div>
              <div className="flex gap-4 mt-6">
                <HoverLink href="#" className="text-xs font-mono underline underline-offset-4 decoration-1">Read Online</HoverLink>
                <HoverLink href="#" className="text-xs font-mono underline underline-offset-4 decoration-1">PDF</HoverLink>
              </div>
            </div>
            <div style={{ backgroundColor: "hsl(var(--bg))" }}>
              {[["kristoo","Distribution scripts"],["kristoo-overlay","Portage overlay"],["kristoo-dots","Default dotfiles"],["kristoo-handbook","Documentation"]].map(([name, desc], i, arr) => (
                <div key={name} className="flex items-baseline justify-between px-5 py-3 text-xs transition-all duration-200 hover:px-7" style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: bdr }}>
                  <a href={`https://github.com/krisyotam/${name}`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm transition-colors duration-200" style={{ color: fg }} onMouseEnter={(e) => e.currentTarget.style.color = accentHover} onMouseLeave={(e) => e.currentTarget.style.color = fg}>{name}</a>
                  <span style={{ color: fg4 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bento: Hardware + FAQ */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-px mb-6" style={{ backgroundColor: bdr }}>
            <div className="md:col-span-2 p-5" style={{ backgroundColor: "hsl(var(--bg))" }}>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: fg4 }}>Min specs</p>
              {[["CPU","x86_64, 4+ cores"],["RAM","8 GB"],["Disk","50 GB"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 text-xs" style={{ borderBottomWidth: 1, borderColor: bdr }}>
                  <span style={{ color: accent }}>{k}</span>
                  <span className="font-mono" style={{ color: fg }}>{v}</span>
                </div>
              ))}
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4 mt-6" style={{ color: fg4 }}>Recommended</p>
              {[["CPU","8+ cores"],["RAM","16+ GB"],["Disk","100+ GB SSD"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 text-xs" style={{ borderBottomWidth: 1, borderColor: bdr }}>
                  <span style={{ color: accent }}>{k}</span>
                  <span className="font-mono" style={{ color: fg }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="md:col-span-3" style={{ backgroundColor: "hsl(var(--bg))" }}>
              {[["Why Gentoo and not Arch?","Arch gives you choice at install time. Gentoo gives you choice at compile time. USE flags mean every package is built with exactly the features you need. The result is leaner and faster."],["Is this a Gentoo fork?","No. Kristoo is a Gentoo overlay and configuration framework. Opinionated defaults, custom ebuilds, and documentation. The base is still Gentoo."],["Can I swap components?","Yes. Every component can be changed. The opinions are starting points, not prisons."],["How long does installation take?","Stage4: under an hour. Stage3 from scratch: 4-6 hours on 8+ cores with 16GB+ RAM."]].map(([q, a], i, arr) => (
                <div key={q} className="px-5 py-4 transition-all duration-200 hover:pl-7" style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderColor: bdr }}>
                  <p className="text-sm font-medium mb-1" style={{ color: fg }}>{q}</p>
                  <p className="text-xs leading-relaxed" style={{ color: fg3 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Closing + Community */}
          <div className="border" style={{ borderColor: bdr }}>
            <div className="relative py-10 px-8 text-center">
              <div className="absolute top-3 right-3 w-5 h-5" style={{ borderTopWidth: 2, borderRightWidth: 2, borderColor: bdr }} />
              <div className="absolute bottom-3 left-3 w-5 h-5" style={{ borderBottomWidth: 2, borderLeftWidth: 2, borderColor: bdr }} />
              <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: fg4 }}>Kristoo</p>
              <p className="font-serif text-lg font-light" style={{ color: fg }}>no gods. no masters.</p>
            </div>
            <div className="flex items-stretch h-10" style={{ borderTopWidth: 1, borderColor: bdr }}>
              {[{label:"IRC",href:"ircs://irc.libera.chat/#kristoo"},{label:"Matrix",href:"https://matrix.to/#/#kristoo:matrix.org"},{label:"Discussions",href:"https://github.com/krisyotam/kristoo/discussions"},{label:"Email",href:"mailto:kris@kristoo.com"}].map((item, i) => (
                <HoverLink key={item.label} href={item.href} className="flex-1 flex items-center justify-center text-xs" style={{ borderLeftWidth: i > 0 ? 1 : 0, borderColor: bdr } as React.CSSProperties}>{item.label}</HoverLink>
              ))}
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="mt-auto">
          <Footer />
        </div>

      </div>
    </div>
  )
}
