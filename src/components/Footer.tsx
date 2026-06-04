import { Coffee, Instagram, MapPin, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Tagline */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <Coffee className="w-8 h-8" />
              <h3 className="text-2xl font-bold font-serif">NOSTRA CAFFEE</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Tempat ternyaman untuk menikmati kopi terbaik.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/6282178695665"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/noka.yogyakarta"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://maps.app.goo.gl/WUfsmMrnBJfntVkA9"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Lokasi"
            >
              <MapPin className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/20 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2026 NOKA (Nostra Kafe). Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};
