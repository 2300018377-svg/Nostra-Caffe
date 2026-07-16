import { Link } from 'react-router-dom';
import { Instagram, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12 mt-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Tagline */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="h-10 w-10 rounded-full object-cover bg-white" />
              <h3 className="text-2xl font-bold font-serif">Nostra-Caffe</h3>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Tempat ternyaman untuk menikmati kopi terbaik.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Admin/Kasir
            </Link>
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
              href="https://shopee.co.id/universal-link/now-food/shop/22056334"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-[#EE4D2D]"
              aria-label="Shopee Food"
              title="Shopee Food"
            >
              <ShoppingBag className="w-5 h-5" />
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
            Hak Cipta 2026 Nostra-Caffe. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};
