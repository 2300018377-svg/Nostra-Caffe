import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HeroSection = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        <Button asChild variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white">
          <Link to="/admin">Admin/Kasir</Link>
        </Button>
      </div>

      {/* Background Image with Parallax */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat parallax"
        style={{
          backgroundImage: `url('https://i.ibb.co.com/sdK0rKQx/Whats-App-Image-2026-01-22-at-20-52-26.jpg')`,
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div 
        className={`relative z-10 text-center px-4 max-w-4xl mx-auto transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Brand Mark */}
        <div className="mb-8 flex justify-center">
          <img
            src="/logo-nostra.png"
            alt="Logo Nostra-Caffe"
            className="h-32 w-32 rounded-full object-cover ring-4 ring-white/80 shadow-2xl md:h-40 md:w-40"
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight">
          Nostra-Caffe
        </h1>
        
        {/* Tagline */}
        <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-8 font-light">
          Tempat ternyaman untuk menikmati kopi terbaik.
        </p>

        {/* Location Button */}
        <Button 
          variant="outline"
          size="lg"
          className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300 group"
          onClick={() => window.open('https://maps.app.goo.gl/WUfsmMrnBJfntVkA9', '_blank')}
        >
          <MapPin className="w-5 h-5 mr-2 group-hover:animate-bounce" />
          Kunjungi Lokasi Kami
        </Button>
      </div>

    </section>
  );
};
