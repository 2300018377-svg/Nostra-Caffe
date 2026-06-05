import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { categories } from '@/data/menuData';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
}

export const SearchBar = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
}: SearchBarProps) => {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border py-4">
      <div className="container mx-auto px-4">
        {/* Search Input */}
        <div className="relative max-w-md mx-auto mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari menu favorit kamu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-10 h-12 rounded-full bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`category-chip whitespace-nowrap ${
                activeCategory === category.id 
                  ? 'category-chip-active' 
                  : 'category-chip-inactive'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
