import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function Home() {
  let user = null
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  if (user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-linear-to-br from-ivory to-espresso-50">
        <div className="text-center max-w-md p-8 animate-fade-in-up">
          <div className="w-20 h-20 mx-auto bg-espresso/5 rounded-2xl flex items-center justify-center mb-6 border border-espresso-100">
            <svg className="w-10 h-10 text-espresso" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-espresso mb-2">Bienvenido de vuelta</h1>
          <p className="text-espresso/50 mb-8">Gestioná tus pasaportes digitales o emití uno nuevo.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn bg-espresso text-ivory hover:bg-charcoal border-none">Ir al Dashboard</Link>
            <Link href="/emit" className="btn btn-outline border-espresso text-espresso hover:bg-espresso hover:text-ivory gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Emitir
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">

      {/* ─── HERO ─── */}
      <section className="relative min-h-[90vh] flex flex-col overflow-hidden bg-espresso">
        {/* Background image with Ken Burns effect */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover animate-ken-burns"
            style={{ filter: 'brightness(0.35) saturate(1.2)' }}
          />
        </div>
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-linear-to-r from-espresso/80 via-espresso/60 to-charcoal/80" />
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute top-1/5 left-1/6 w-96 h-96 rounded-full bg-champagne blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/5 w-80 h-80 rounded-full bg-emerald blur-3xl animate-float-slow" style={{ animationDelay: '-4s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-champagne/30 blur-[120px] opacity-20" />
        </div>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(199,168,108,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(199,168,108,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in-up pt-20 md:pt-24">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-champagne/10 border border-champagne/20 text-champagne text-xs font-medium">
                PULSO Hackathon 2026
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald-200 text-xs font-medium">
                Stellar Soroban
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-ivory tracking-tight leading-tight">
              Pasaporte Digital
              <br />
              <span className="text-champagne">para Productos Latinos</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-ivory/60 max-w-2xl mx-auto leading-relaxed">
              De la trazabilidad a la confianza. Registrá tus productos en Stellar y
              ofrecé a tus clientes una verificación inmutable de origen y autenticidad.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="group relative px-8 py-3.5 bg-champagne text-charcoal font-semibold rounded-xl hover:bg-champagne/90 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-lg shadow-champagne/20 hover:shadow-champagne/30 hover:-translate-y-0.5"
              >
                Registrar mi producto
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link
                href="/verify"
                className="px-8 py-3.5 border border-ivory/20 text-ivory font-medium rounded-xl hover:bg-ivory/5 transition-all duration-300 inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Verificar un producto
              </Link>
            </div>

            <p className="mt-12 text-sm text-ivory/30 font-mono tracking-wider">
              From Origin to Ownership, Verified on Stellar.
            </p>
          </div>
        </div>

        {/* Scroll indicator at bottom */}
        <div className="pb-10 flex justify-center relative z-10 animate-fade-in-down">
          <div className="w-6 h-10 rounded-full border border-ivory/20 flex items-start justify-center p-1.5">
            <div className="w-1 h-3 rounded-full bg-champagne/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="relative -mt-12 z-20 px-4 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-xl border border-champagne/10 p-6 md:p-8">
          {[
            { number: '100%', label: 'On-chain' },
            { number: '0.001', label: 'XLM por emisión' },
            { number: '3s', label: 'Confirmación' },
            { number: '∞', label: 'Inmutable' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-espresso">{s.number}</p>
              <p className="text-xs text-espresso/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 px-4 bg-ivory">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-champagne uppercase tracking-widest">Proceso</span>
            <h2 className="text-3xl md:text-4xl font-bold text-espresso mt-3">Cómo funciona</h2>
            <p className="text-espresso/50 mt-3 max-w-lg mx-auto">Tres pasos simples para llevar tus productos a Stellar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px bg-linear-to-r from-champagne/40 via-champagne to-champagne/40" />

            {[
              {
                step: '01',
                title: 'Registrá',
                desc: 'Completá los datos de tu producto y conectá tu wallet Stellar. El hash de integridad se genera automáticamente.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                ),
              },
              {
                step: '02',
                title: 'Emití',
                desc: 'Firmá la transacción con tu wallet. El contrato Soroban genera un pasaporte digital único en la blockchain de Stellar.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                ),
              },
              {
                step: '03',
                title: 'Verificá',
                desc: 'Imprimí el QR en tu producto. Cualquier persona lo escanea y verifica la autenticidad en Stellar al instante.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                ),
              },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center animate-fade-in-up p-6" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-14 h-14 rounded-2xl bg-espresso text-ivory flex items-center justify-center mb-6 relative z-10 shadow-lg">
                  {s.icon}
                </div>
                <span className="text-xs font-mono text-champagne font-semibold mb-2">{s.step}</span>
                <h3 className="text-lg font-bold text-espresso mb-2">{s.title}</h3>
                <p className="text-sm text-espresso/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── USE CASES ─── */}
      <section className="py-24 px-4 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-champagne-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-champagne uppercase tracking-widest">Aplicaciones</span>
            <h2 className="text-3xl md:text-4xl font-bold text-espresso mt-3">Casos de uso reales</h2>
            <p className="text-espresso/50 mt-3 max-w-lg mx-auto">Productos latinoamericanos que ya transforman su trazabilidad con Stellar.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ),
                title: 'Alpaca Boliviana',
                tags: ['Textiles', 'Comercio Justo'],
                desc: 'Trazabilidad desde la fibra hasta la prenda. Certificá origen ético y calidad en cada etapa de producción.',
                color: 'from-espresso-50 to-espresso-100',
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ),
                title: 'Café Colombiano',
                tags: ['Alimentos', 'Origen'],
                desc: 'Verificá el origen exacto, la finca productora y el proceso de tostado. Conectá al consumidor con el productor.',
                color: 'from-champagne-50 to-champagne-100',
              },
              {
                icon: (
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                ),
                title: 'Artesanías Mexicanas',
                tags: ['Cultura', 'Autenticidad'],
                desc: 'Protegé la autenticidad cultural de las artesanías. Combatí la falsificación con un registro inmutable on-chain.',
                color: 'from-emerald-50 to-emerald-100',
              },
            ].map((c, i) => (
              <div key={i} className="group relative bg-white rounded-2xl border border-espresso-50 hover:border-champagne/30 transition-all duration-300 p-6 hover:shadow-xl hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-14 h-14 rounded-xl bg-linear-to-br ${c.color} flex items-center justify-center mb-5 text-espresso`}>
                  {c.icon}
                </div>
                <h3 className="text-lg font-bold text-espresso mb-2">{c.title}</h3>
                <div className="flex gap-2 mb-3">
                  {c.tags.map(t => <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-espresso-50 text-espresso/60">{t}</span>)}
                </div>
                <p className="text-sm text-espresso/60 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY BLOCKCHAIN ─── */}
      <section className="py-24 px-4 bg-espresso relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(199,168,108,0.5) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-72 h-72 bg-champagne/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald/10 rounded-full blur-[100px]" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-champagne uppercase tracking-widest">Tecnología</span>
            <h2 className="text-3xl md:text-4xl font-bold text-ivory mt-3">¿Por qué en Stellar?</h2>
            <p className="text-ivory/50 mt-3 max-w-lg mx-auto">La blockchain de Stellar ofrece la velocidad, el costo y la confianza que América Latina necesita.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Costo casi cero', desc: 'Cada emisión cuesta fracciones de un centavo de dólar. Sin gas fees ni subastas de bloques.', icon: '🚀' },
              { title: 'Confirmación en segundos', desc: 'Stellar confirma transacciones en 3-5 segundos. Ideal para verificación en punto de venta.', icon: '⚡' },
              { title: 'Inmutabilidad real', desc: 'Una vez emitido, el pasaporte no puede ser alterado. Ni siquiera nosotros podemos modificarlo.', icon: '🔒' },
              { title: 'Transparencia pública', desc: 'Cualquier persona puede verificar un pasaporte sin necesidad de cuenta ni permiso. Solo necesita el QR.', icon: '👁️' },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl bg-ivory/5 border border-ivory/10 hover:bg-ivory/10 transition-colors animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="font-semibold text-ivory mb-1">{f.title}</h3>
                  <p className="text-sm text-ivory/50 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-ivory/30">
            <span className="text-xs font-mono tracking-wider uppercase">Stellar Soroban</span>
            <span className="w-1 h-1 rounded-full bg-ivory/20" />
            <span className="text-xs font-mono tracking-wider uppercase">Freighter</span>
            <span className="w-1 h-1 rounded-full bg-ivory/20" />
            <span className="text-xs font-mono tracking-wider uppercase">Stellar Wallets Kit</span>
            <span className="w-1 h-1 rounded-full bg-ivory/20" />
            <span className="text-xs font-mono tracking-wider uppercase">Supabase</span>
            <span className="w-1 h-1 rounded-full bg-ivory/20" />
            <span className="text-xs font-mono tracking-wider uppercase">SEP-1 · SEP-10</span>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-4 bg-linear-to-br from-espresso-50 to-ivory relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(199,168,108,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(199,168,108,0.5) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-espresso text-ivory flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-espresso mb-4">
            ¿Listo para emitir tu primer pasaporte?
          </h2>
          <p className="text-espresso/50 mb-8 max-w-md mx-auto">
            Registrá tu empresa, conectá tu wallet y emití pasaportes digitales verificables en Stellar. Sin costo de entrada.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-espresso text-ivory font-semibold rounded-xl hover:bg-charcoal transition-all duration-300 shadow-lg shadow-espresso/20 hover:shadow-espresso/30 hover:-translate-y-0.5"
          >
            Comenzar ahora
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-charcoal text-ivory/40 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ivory/60">Passport <span className="text-champagne">LATAM</span></p>
            <p className="text-xs mt-1">From Origin to Ownership, Verified on Stellar.</p>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span>PULSO Hackathon 2026</span>
            <span className="w-px h-3 bg-ivory/10" />
            <span>NEARX × Stellar</span>
            <span className="w-px h-3 bg-ivory/10" />
            <Link href="/login" className="hover:text-ivory/60 transition-colors">Empresas</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}