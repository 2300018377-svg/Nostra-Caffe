import { useMemo } from 'react';
import { MenuCard } from './MenuCard';
import { StoredMenuItem } from '@/lib/storage';

interface MenuGridProps {
  menuItems: StoredMenuItem[];
  searchQuery: string;
  activeCategory: string;
}

export const MenuGrid = ({ menuItems, searchQuery, activeCategory }: MenuGridProps) => {
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, activeCategory]);

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <img src="/logo-nostra.png" alt="Logo Nostra-Caffe" className="mb-4 h-16 w-16 rounded-full object-cover opacity-70" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Menu tidak ditemukan
        </h3>
        <p className="text-muted-foreground">
          Coba kata kunci lain atau pilih kategori berbeda
        </p>
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredItems.map((item, index) => (
          <div 
            key={item.id}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <MenuCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
};
