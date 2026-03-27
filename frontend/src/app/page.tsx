import Link from 'next/link'
import { Scissors, Waves, Wind } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sand-100 font-sans">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 bg-sand-50/80 backdrop-blur-sm border-b border-sand-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl font-medium text-sage-800 tracking-tight">stitchbook</span>
          <span className="hidden sm:block text-sand-300 text-lg">·</span>
          <span className="hidden sm:block text-sand-400 text-sm">din kreative prosjektjournal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sand-600 hover:text-sage-700 font-medium transition-colors text-sm">
            Logg inn
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Kom i gang gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-sage-800 py-28 px-8">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-sage-700 rounded-full opacity-60 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 w-[400px] h-[400px] bg-sage-900 rounded-full opacity-70 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-sage-600 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-sage-700/60 border border-sage-600/40 text-sage-200 text-xs font-medium px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <span>🧶</span> Gratis · Ingen kredittkort nødvendig
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-medium text-sand-50 mb-6 leading-tight">
            Alle prosjektene dine,{' '}
            <em className="text-sage-300 not-italic">samlet på ett sted</em>
          </h1>

          <p className="text-sage-200 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            En enkel og vakker prosjektjournal for strikking, hekling og sying –
            med radteller, garnregister, mønstertegner og mer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-sand-100 hover:bg-white text-sage-800 font-semibold px-8 py-4 rounded-2xl text-lg transition-all shadow-lifted hover:shadow-lifted"
            >
              Start gratis i dag →
            </Link>
            <Link
              href="/login"
              className="bg-sage-700/50 hover:bg-sage-700/70 border border-sage-600/40 text-sage-100 font-semibold px-8 py-4 rounded-2xl text-lg transition-all backdrop-blur-sm"
            >
              Logg inn
            </Link>
          </div>
        </div>
      </section>

      {/* Features – 3 crafts */}
      <section className="py-20 px-8 bg-sand-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-medium text-sand-900 mb-3">
              Tre håndverk, én app
            </h2>
            <p className="text-sand-500 max-w-lg mx-auto">
              Egne moduler for strikking, hekling og sying – med verktøyene du faktisk bruker
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <CraftCard
              icon={<Wind className="w-6 h-6" />}
              title="Strikking"
              color="sage"
              description="Pinnestørrelser, garnregister med farger og gram, strikkefasthet, radteller og mønstertegner."
              features={['Pinnestørrelser 2–10 mm', 'Garnregister med farger', 'Radteller med reset', 'Mønstertegner']}
            />
            <CraftCard
              icon={<Waves className="w-6 h-6" />}
              title="Hekling"
              color="sky"
              description="Heklenålstørrelser, garnregister, radteller og mønstertegner med standard heklesymboler."
              features={['Heklenålstørrelser', 'Garnregister', 'Radteller', 'Heklesymboler']}
            />
            <CraftCard
              icon={<Scissors className="w-6 h-6" />}
              title="Sying"
              color="clay"
              description="Stoffregister med type og farge, oppskriftsarkiv med filer og bilder, notatbok."
              features={['Stoffregister', 'Oppskriftsarkiv', 'Bilder og PDF', 'Notater']}
            />
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="py-16 px-8 bg-sage-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl font-medium text-sand-100 text-center mb-12">
            Kraftige verktøy for kreative sjeler
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { emoji: '🔢', title: 'Radteller', desc: 'Tell rader, huk av og se fremdriften i sanntid' },
              { emoji: '🎨', title: 'Mønstertegner', desc: 'Tegn ditt eget diagram med farger og symboler' },
              { emoji: '📋', title: 'Oppskrifter', desc: 'Last opp PDF, Word og bilder til hvert prosjekt' },
              { emoji: '🖼️', title: 'Inspirasjon', desc: 'Pinterest-integrasjon for ideer og moodboards' },
              { emoji: '📤', title: 'Del og eksporter', desc: 'Del prosjekter internt og last ned som PDF' },
              { emoji: '🏷️', title: 'Tagging', desc: 'Organiser med tagger og filtrer enkelt' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-5 rounded-2xl bg-sage-700/50 border border-sage-600/30 backdrop-blur-sm">
                <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                <div>
                  <div className="font-semibold text-sand-100 text-sm mb-1">{item.title}</div>
                  <div className="text-sage-300 text-xs leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 bg-sand-50 text-center">
        <div className="max-w-xl mx-auto">
          <div className="text-5xl mb-6">🧶</div>
          <h2 className="font-serif text-4xl font-medium text-sand-900 mb-4">
            Klar til å starte?
          </h2>
          <p className="text-sand-500 mb-8 text-lg">
            Gratis å bruke. Ingen kredittkort nødvendig.
          </p>
          <Link
            href="/register"
            className="inline-block btn-primary text-lg px-10 py-4 rounded-2xl shadow-lifted"
          >
            Opprett konto gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sand-200 border-t border-sand-300 py-8 px-8 text-center">
        <p className="text-sand-500 text-sm">
          © 2025 stitchbook · laget med kjærlighet for håndverkere 🌿
        </p>
      </footer>
    </div>
  )
}

function CraftCard({
  icon, title, color, description, features,
}: {
  icon: React.ReactNode
  title: string
  color: 'sage' | 'sky' | 'clay'
  description: string
  features: string[]
}) {
  const styles = {
    sage: { card: 'bg-sage-50 border-sage-200', icon: 'bg-sage-100 text-sage-600', dot: 'bg-sage-400' },
    sky:  { card: 'bg-sky-50  border-sky-200',  icon: 'bg-sky-100  text-sky-600',  dot: 'bg-sky-400'  },
    clay: { card: 'bg-clay-50 border-clay-200', icon: 'bg-clay-100 text-clay-600', dot: 'bg-clay-400' },
  }
  const s = styles[color]

  return (
    <div className={`rounded-3xl border p-7 ${s.card} transition-all hover:shadow-card`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${s.icon}`}>
        {icon}
      </div>
      <h3 className="font-serif text-xl font-medium text-sand-900 mb-2">{title}</h3>
      <p className="text-sand-500 text-sm mb-5 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-sand-700">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}
