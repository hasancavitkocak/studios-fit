import { useEffect, useState } from 'react'
import { FaDumbbell, FaRunning, FaLightbulb, FaHeart, FaUserMd, FaCog, FaFire, FaSpa, FaWhatsapp, FaMapMarkerAlt, FaClock, FaBars, FaTimes, FaInstagram } from 'react-icons/fa'
import './App.css'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-in').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const whatsappNumber = "905015536876";
  const whatsappMessage = "Merhaba, Studio S-Fit hakkında bilgi almak istiyorum.";

  const handleMenuClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#home" className="logo-link">
            <img src="/logo.png" alt="Studio S-Fit" className="logo-img" />
          </a>
          <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <a href="#home" onClick={handleMenuClick}>Ana Sayfa</a>
            <a href="#services" onClick={handleMenuClick}>Hizmetler</a>
            <a href="#about" onClick={handleMenuClick}>Hakkımızda</a>
            <a href="#contact" onClick={handleMenuClick}>İletişim</a>
          </div>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content fade-in" id="hero">
          <h1 className="hero-title">
            Kişiye Özel<br />
            <span className="gradient-text">Antrenman Programları</span>
          </h1>
          <p className="hero-subtitle">
            Profesyonel personal training ile hedeflerinize ulaşın
          </p>
          <a 
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button"
          >
            Hemen Başla
          </a>
        </div>
        <div className="scroll-indicator">
          <div className="mouse"></div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services">
        <div className="container">
          <h2 className="section-title fade-in" id="services-title">Hizmetlerimiz</h2>
          <div className="services-grid">
            <div className="service-card fade-in" id="service-1">
              <div className="service-icon"><FaDumbbell /></div>
              <h3>Özel Antrenman</h3>
              <p>Birebir özel antrenman seansları ile kişisel hedeflerinize ulaşın</p>
            </div>
            <div className="service-card fade-in" id="service-2">
              <div className="service-icon"><FaRunning /></div>
              <h3>Fitness</h3>
              <p>Profesyonel ekipmanlar ile kapsamlı fitness programları</p>
            </div>
            <div className="service-card fade-in" id="service-3">
              <div className="service-icon"><FaLightbulb /></div>
              <h3>Yaşam Koçluğu</h3>
              <p>Sağlıklı yaşam alışkanlıkları için kişisel rehberlik</p>
            </div>
            <div className="service-card fade-in" id="service-4">
              <div className="service-icon"><FaSpa /></div>
              <h3>Pilates</h3>
              <p>Esneklik ve denge için özel pilates seansları</p>
            </div>
            <div className="service-card fade-in" id="service-5">
              <div className="service-icon"><FaUserMd /></div>
              <h3>Medikal Fitness</h3>
              <p>Sağlık odaklı özel antrenman programları</p>
            </div>
            <div className="service-card fade-in" id="service-6">
              <div className="service-icon"><FaCog /></div>
              <h3>Fonksiyonel Antrenman</h3>
              <p>Günlük yaşam için fonksiyonel hareket eğitimi</p>
            </div>
            <div className="service-card fade-in" id="service-7">
              <div className="service-icon"><FaFire /></div>
              <h3>Vücut Geliştirme</h3>
              <p>Kas kütlesi artırma ve vücut şekillendirme programları</p>
            </div>
            <div className="service-card fade-in" id="service-8">
              <div className="service-icon"><FaHeart /></div>
              <h3>Sağlıklı Yaşam</h3>
              <p>Beslenme ve yaşam tarzı danışmanlığı ile sağlıklı yaşam</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <h2 className="section-title fade-in" id="about-title">Neden Studio S-Fit?</h2>
          <p className="about-subtitle fade-in" id="about-subtitle">
            Hedeflerinize ulaşmanız için ihtiyacınız olan her şey burada
          </p>
          <div className="about-grid">
            <div className="about-card fade-in" id="about-1">
              <div className="about-number">01</div>
              <div className="about-icon">
                <FaDumbbell />
              </div>
              <h3>Profesyonel Kadro</h3>
              <p>Sertifikalı ve deneyimli personal trainerlar ile çalışın. Uzman ekibimiz sizin için en uygun programı hazırlar.</p>
            </div>
            <div className="about-card fade-in" id="about-2">
              <div className="about-number">02</div>
              <div className="about-icon">
                <FaCog />
              </div>
              <h3>Modern Ekipman</h3>
              <p>Son teknoloji fitness ekipmanları ile antrenman yapın. En yeni ve kaliteli aletlerle hedeflerinize ulaşın.</p>
            </div>
            <div className="about-card fade-in" id="about-3">
              <div className="about-number">03</div>
              <div className="about-icon">
                <FaHeart />
              </div>
              <h3>Kişiye Özel Program</h3>
              <p>Sizin için özel hazırlanan antrenman ve beslenme programları. Her detay sizin ihtiyaçlarınıza göre planlanır.</p>
            </div>
            <div className="about-card fade-in" id="about-4">
              <div className="about-number">04</div>
              <div className="about-icon">
                <FaFire />
              </div>
              <h3>Sonuç Odaklı</h3>
              <p>Hedeflerinize ulaşmanız için sürekli destek ve motivasyon. İlerlemenizi takip eder, başarınızı garanti ederiz.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        aria-label="WhatsApp"
      >
        <FaWhatsapp />
      </a>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="container">
          <h2 className="section-title fade-in" id="contact-title">İletişime Geçin</h2>
          <p className="contact-subtitle fade-in" id="contact-subtitle">
            Hedeflerinize ulaşmak için ilk adımı atın
          </p>
          
          <div className="contact-grid">
            <div className="contact-card fade-in" id="contact-1">
              <div className="contact-card-icon">
                <FaWhatsapp />
              </div>
              <h3>WhatsApp</h3>
              <p>Hızlı iletişim için</p>
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Mesaj Gönder
              </a>
            </div>

            <div className="contact-card fade-in" id="contact-2">
              <div className="contact-card-icon">
                <FaInstagram />
              </div>
              <h3>Instagram</h3>
              <p>Bizi takip edin</p>
              <a 
                href="https://instagram.com/studio.sfit"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                @studio.sfit
              </a>
            </div>

            <div className="contact-card fade-in" id="contact-3">
              <div className="contact-card-icon">
                <FaMapMarkerAlt />
              </div>
              <h3>Adres</h3>
              <p>Göktürk Merkez, Nehir Sk. No:1/D<br/>34077 Eyüpsultan/İstanbul</p>
              <a 
                href="https://maps.google.com/?q=Göktürk+Merkez+Nehir+Sk+No:1/D+Eyüpsultan+İstanbul"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Yol Tarifi Al
              </a>
            </div>

            <div className="contact-card fade-in" id="contact-4">
              <div className="contact-card-icon">
                <FaClock />
              </div>
              <h3>Çalışma Saatleri</h3>
              <p>Pazartesi - Pazar<br/><span className="highlight">10:00 - 22:00</span></p>
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Randevu almak istiyorum.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
              >
                Randevu Al
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 Studio S-Fit. Tüm hakları saklıdır.</p>
          <p className="footer-tagline">Transform Your Body, Transform Your Life</p>
        </div>
      </footer>
    </div>
  )
}

export default App
