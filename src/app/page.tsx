'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="diamante-landing">
      {/* ── NAVBAR ── */}
      <nav
        className="diamante-nav"
        style={{
          background: scrollY > 60
            ? 'rgba(3, 10, 30, 0.95)'
            : 'rgba(3, 10, 30, 0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="diamante-nav-inner">
          <div className="diamante-logo-row">
            <Image src="/logo.png" alt="Diamante" width={40} height={40} className="diamante-logo-img" />
            <span className="diamante-logo-text">DIAMANTE</span>
          </div>
          <div className="diamante-nav-links">
            <a href="#nosotros">Nosotros</a>
            <a href="#calidad">Calidad</a>
            <a href="#contacto">Contacto</a>
            <Link href="/login" className="diamante-btn-erp">
              Acceder al ERP →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="diamante-hero">
        <div className="diamante-hero-bg">
          <Image
            src="/hero-water.jpg"
            alt="Agua Diamante"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div className="diamante-hero-overlay" />
        </div>

        {/* Animated wave rings */}
        <div className="diamante-rings">
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="ring ring-3" />
        </div>

        <div className="diamante-hero-content">
          <div className="diamante-badge">💎 Pureza Natural</div>
          <h1 className="diamante-hero-title">
            Diamante<br />
            <span className="diamante-gradient-text">Un Tesoro de</span><br />
            la Naturaleza
          </h1>
          <p className="diamante-hero-subtitle">
            Agua purificada de la más alta calidad, directamente
            desde nuestra planta certificada hasta tu mesa.
          </p>
          <div className="diamante-hero-cta">
            <a href="#nosotros" className="diamante-btn-primary">
              Conocer más
            </a>
            <Link href="/login" className="diamante-btn-outline">
              Portal ERP →
            </Link>
          </div>
        </div>

        {/* Wave shape bottom */}
        <div className="diamante-wave-bottom">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z"
              fill="#030A1E"
            />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="diamante-stats" id="nosotros">
        <div className="diamante-container">
          <div className="diamante-stats-grid">
            {[
              { num: '15+', label: 'Años de experiencia' },
              { num: '500+', label: 'Clientes satisfechos' },
              { num: '99.9%', label: 'Pureza garantizada' },
              { num: '24/7', label: 'Servicio disponible' },
            ].map((s) => (
              <div key={s.label} className="diamante-stat-card">
                <span className="diamante-stat-num">{s.num}</span>
                <span className="diamante-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="diamante-about">
        <div className="diamante-container diamante-about-grid">
          <div className="diamante-about-text">
            <div className="diamante-section-tag">Quiénes Somos</div>
            <h2 className="diamante-section-title">
              Comprometidos con tu<br />
              <span className="diamante-gradient-text">bienestar e hidratación</span>
            </h2>
            <p className="diamante-about-desc">
              Agua Diamante es una empresa venezolana dedicada a la producción y
              distribución de agua purificada de alta calidad. Utilizamos tecnología
              de punta en filtración y purificación para garantizar que cada gota
              que consumes sea perfectamente pura.
            </p>
            <p className="diamante-about-desc">
              Nuestro compromiso es entregar salud, frescura y pureza a cada
              hogar y empresa que confía en nuestra marca.
            </p>
            <Link href="/login" className="diamante-btn-primary" style={{ display: 'inline-flex', marginTop: '1.5rem' }}>
              Acceder al Sistema ERP →
            </Link>
          </div>
          <div className="diamante-about-visual">
            <div className="diamante-water-bottle-card">
              <div className="diamante-bottle-glow" />
              <div className="diamante-bottle-content">
                <div className="diamante-bottle-icon">💧</div>
                <h3>Agua Premium</h3>
                <p>Filtración en 7 etapas</p>
                <ul className="diamante-bottle-features">
                  <li>✓ Libre de contaminantes</li>
                  <li>✓ pH balanceado</li>
                  <li>✓ Minerales esenciales</li>
                  <li>✓ Certificada por laboratorio</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALIDAD ── */}
      <section className="diamante-quality" id="calidad">
        <div className="diamante-container">
          <div className="diamante-section-tag" style={{ textAlign: 'center', margin: '0 auto 1rem' }}>Nuestros Valores</div>
          <h2 className="diamante-section-title" style={{ textAlign: 'center' }}>
            ¿Por qué elegir<br />
            <span className="diamante-gradient-text">Agua Diamante?</span>
          </h2>
          <div className="diamante-quality-grid">
            {[
              { icon: '🔬', title: 'Pureza Certificada', desc: 'Cada lote es analizado en laboratorio para garantizar los más altos estándares de pureza.' },
              { icon: '🌊', title: 'Proceso Natural', desc: 'Captamos agua de fuentes naturales y la sometemos a un riguroso proceso de purificación.' },
              { icon: '♻️', title: 'Eco Responsable', desc: 'Nuestros envases son 100% reciclables y estamos comprometidos con el medio ambiente.' },
              { icon: '🚚', title: 'Entrega Puntual', desc: 'Distribución a tiempo en toda la región con flota propia de transporte refrigerado.' },
              { icon: '🏆', title: 'Calidad Premium', desc: 'Premio a la mejor agua purificada de la región por tres años consecutivos.' },
              { icon: '💎', title: 'Confianza Total', desc: 'Más de 15 años siendo la marca favorita de familias y empresas en Venezuela.' },
            ].map((item) => (
              <div key={item.title} className="diamante-quality-card">
                <div className="diamante-quality-icon">{item.icon}</div>
                <h3 className="diamante-quality-title">{item.title}</h3>
                <p className="diamante-quality-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ERP ── */}
      <section className="diamante-erp-cta" id="contacto">
        <div className="diamante-container diamante-erp-cta-inner">
          <div className="diamante-erp-cta-glow" />
          <h2 className="diamante-erp-title">¿Eres parte del equipo Diamante?</h2>
          <p className="diamante-erp-subtitle">
            Accede al sistema de gestión empresarial para administrar inventario,
            ventas, rutas de distribución y mucho más.
          </p>
          <Link href="/login" className="diamante-btn-primary diamante-btn-large">
            💎 Ingresar al ERP
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="diamante-footer">
        <div className="diamante-container diamante-footer-inner">
          <div className="diamante-logo-row">
            <Image src="/logo.png" alt="Diamante" width={32} height={32} />
            <span className="diamante-logo-text" style={{ fontSize: '1rem' }}>AGUA DIAMANTE</span>
          </div>
          <p className="diamante-footer-copy">
            © {new Date().getFullYear()} Agua Diamante. Todos los derechos reservados.
          </p>
          <Link href="/login" className="diamante-footer-link">Portal ERP →</Link>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .diamante-landing {
          background: #030A1E;
          color: #e8f4fd;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* NAV */
        .diamante-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.4s ease, box-shadow 0.4s ease;
          border-bottom: 1px solid rgba(56, 189, 248, 0.1);
        }
        .diamante-nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem;
        }
        .diamante-logo-row { display: flex; align-items: center; gap: 0.75rem; }
        .diamante-logo-img { border-radius: 8px; }
        .diamante-logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 800; font-size: 1.25rem;
          letter-spacing: 0.15em;
          background: linear-gradient(135deg, #38bdf8, #7dd3fc, #e0f2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .diamante-nav-links {
          display: flex; align-items: center; gap: 2rem;
        }
        .diamante-nav-links a {
          color: rgba(232, 244, 253, 0.8); text-decoration: none;
          font-size: 0.9rem; font-weight: 500; transition: color 0.2s;
        }
        .diamante-nav-links a:hover { color: #38bdf8; }
        .diamante-btn-erp {
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: white !important; padding: 0.5rem 1.25rem;
          border-radius: 50px; font-weight: 600; font-size: 0.875rem;
          text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
        }
        .diamante-btn-erp:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 30px rgba(14, 165, 233, 0.5);
        }

        /* HERO */
        .diamante-hero {
          position: relative; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .diamante-hero-bg {
          position: absolute; inset: 0; z-index: 0;
        }
        .diamante-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(3,10,30,0.55) 0%,
            rgba(3,10,30,0.3) 40%,
            rgba(3,10,30,0.85) 100%
          );
        }

        /* Ring animations */
        .diamante-rings {
          position: absolute; inset: 0; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(56, 189, 248, 0.2);
          animation: ripple 6s ease-out infinite;
        }
        .ring-1 { width: 300px; height: 300px; animation-delay: 0s; }
        .ring-2 { width: 550px; height: 550px; animation-delay: 2s; }
        .ring-3 { width: 800px; height: 800px; animation-delay: 4s; }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        .diamante-hero-content {
          position: relative; z-index: 2;
          text-align: center; max-width: 780px; padding: 2rem;
        }
        .diamante-badge {
          display: inline-block; margin-bottom: 1.5rem;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #7dd3fc; padding: 0.4rem 1.2rem;
          border-radius: 50px; font-size: 0.85rem; font-weight: 600;
          letter-spacing: 0.05em; backdrop-filter: blur(8px);
          animation: fadeInDown 0.8s ease;
        }
        .diamante-hero-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(2.8rem, 7vw, 5.5rem);
          font-weight: 900; line-height: 1.05;
          color: #ffffff; margin-bottom: 1.5rem;
          animation: fadeInUp 0.9s ease 0.2s both;
          text-shadow: 0 2px 40px rgba(0,0,0,0.5);
        }
        .diamante-gradient-text {
          background: linear-gradient(135deg, #38bdf8 0%, #7dd3fc 50%, #a5f3fc 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .diamante-hero-subtitle {
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          color: rgba(232,244,253,0.85); max-width: 560px; margin: 0 auto 2.5rem;
          line-height: 1.7; animation: fadeInUp 0.9s ease 0.4s both;
        }
        .diamante-hero-cta {
          display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
          animation: fadeInUp 0.9s ease 0.6s both;
        }
        .diamante-btn-primary {
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: white; padding: 0.9rem 2rem; border-radius: 50px;
          font-weight: 700; font-size: 1rem; text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 30px rgba(14,165,233,0.4);
          display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .diamante-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 40px rgba(14,165,233,0.6);
        }
        .diamante-btn-outline {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(56,189,248,0.4);
          color: #7dd3fc; padding: 0.9rem 2rem; border-radius: 50px;
          font-weight: 600; font-size: 1rem; text-decoration: none;
          transition: all 0.2s; backdrop-filter: blur(8px);
        }
        .diamante-btn-outline:hover {
          background: rgba(56,189,248,0.15);
          border-color: #38bdf8; color: #e0f2fe;
          transform: translateY(-2px);
        }
        .diamante-btn-large { padding: 1.1rem 2.8rem; font-size: 1.1rem; }

        .diamante-wave-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
          line-height: 0;
        }
        .diamante-wave-bottom svg { width: 100%; height: 80px; display: block; }

        /* STATS */
        .diamante-stats {
          background: #030A1E; padding: 5rem 2rem;
        }
        .diamante-container { max-width: 1200px; margin: 0 auto; }
        .diamante-stats-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .diamante-stat-card {
          background: rgba(14,165,233,0.07);
          border: 1px solid rgba(56,189,248,0.15);
          border-radius: 16px; padding: 2rem; text-align: center;
          transition: transform 0.3s, border-color 0.3s;
        }
        .diamante-stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(56,189,248,0.4);
        }
        .diamante-stat-num {
          display: block; font-family: 'Outfit', sans-serif;
          font-size: 2.8rem; font-weight: 900;
          background: linear-gradient(135deg, #38bdf8, #7dd3fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .diamante-stat-label {
          display: block; color: rgba(232,244,253,0.6);
          font-size: 0.9rem; margin-top: 0.25rem;
        }

        /* ABOUT */
        .diamante-about {
          background: linear-gradient(180deg, #030A1E 0%, #051530 100%);
          padding: 6rem 2rem;
        }
        .diamante-about-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }
        @media(max-width: 768px) {
          .diamante-about-grid { grid-template-columns: 1fr; gap: 3rem; }
          .diamante-nav-links a:not(.diamante-btn-erp) { display: none; }
        }
        .diamante-section-tag {
          display: inline-block;
          background: rgba(56,189,248,0.1);
          border: 1px solid rgba(56,189,248,0.3);
          color: #38bdf8; padding: 0.3rem 1rem;
          border-radius: 50px; font-size: 0.8rem; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1rem;
        }
        .diamante-section-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800; line-height: 1.2; margin-bottom: 1.5rem;
          color: #e8f4fd;
        }
        .diamante-about-desc {
          color: rgba(232,244,253,0.7); line-height: 1.8; margin-bottom: 1rem; font-size: 1rem;
        }
        .diamante-water-bottle-card {
          position: relative;
          background: rgba(14,165,233,0.07);
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 24px; padding: 2.5rem;
          overflow: hidden;
        }
        .diamante-bottle-glow {
          position: absolute; top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: radial-gradient(circle at center, rgba(56,189,248,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .diamante-bottle-content { position: relative; z-index: 1; }
        .diamante-bottle-icon { font-size: 3rem; margin-bottom: 1rem; }
        .diamante-bottle-content h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;
          color: #e8f4fd;
        }
        .diamante-bottle-content p { color: #38bdf8; margin-bottom: 1.5rem; }
        .diamante-bottle-features { list-style: none; space-y: 0.5rem; }
        .diamante-bottle-features li {
          color: rgba(232,244,253,0.8); padding: 0.4rem 0;
          border-bottom: 1px solid rgba(56,189,248,0.1);
          font-size: 0.95rem;
        }

        /* QUALITY */
        .diamante-quality { background: #030A1E; padding: 6rem 2rem; }
        .diamante-quality-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem; margin-top: 3rem;
        }
        .diamante-quality-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(56,189,248,0.12);
          border-radius: 20px; padding: 2rem;
          transition: transform 0.3s, border-color 0.3s, background 0.3s;
        }
        .diamante-quality-card:hover {
          transform: translateY(-5px);
          border-color: rgba(56,189,248,0.35);
          background: rgba(14,165,233,0.07);
        }
        .diamante-quality-icon { font-size: 2.2rem; margin-bottom: 1rem; }
        .diamante-quality-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: #e8f4fd;
        }
        .diamante-quality-desc { color: rgba(232,244,253,0.6); line-height: 1.7; font-size: 0.9rem; }

        /* ERP CTA */
        .diamante-erp-cta {
          background: linear-gradient(180deg, #030A1E, #051530);
          padding: 6rem 2rem;
        }
        .diamante-erp-cta-inner {
          position: relative;
          background: rgba(14,165,233,0.08);
          border: 1px solid rgba(56,189,248,0.2);
          border-radius: 28px; padding: 4rem 2rem;
          text-align: center; overflow: hidden;
        }
        .diamante-erp-cta-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          width: 600px; height: 300px;
          background: radial-gradient(ellipse, rgba(56,189,248,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .diamante-erp-title {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          font-weight: 800; margin-bottom: 1rem; color: #e8f4fd;
        }
        .diamante-erp-subtitle {
          color: rgba(232,244,253,0.7); max-width: 500px; margin: 0 auto 2.5rem;
          line-height: 1.7;
        }

        /* FOOTER */
        .diamante-footer { background: #020817; padding: 2rem; border-top: 1px solid rgba(56,189,248,0.1); }
        .diamante-footer-inner {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
        }
        .diamante-footer-copy { color: rgba(232,244,253,0.4); font-size: 0.85rem; }
        .diamante-footer-link {
          color: #38bdf8; text-decoration: none; font-size: 0.85rem; font-weight: 600;
          transition: color 0.2s;
        }
        .diamante-footer-link:hover { color: #7dd3fc; }

        /* Animations */
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
