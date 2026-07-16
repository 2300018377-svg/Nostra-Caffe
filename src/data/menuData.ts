export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  fallbackKeyword: string;
  available?: boolean;
}

export interface Category {
  id: string;
  name: string;
  fallbackKeyword: string;
}

export const categories: Category[] = [
  { id: 'all', name: 'Semua', fallbackKeyword: 'espresso' },
  { id: 'coffee', name: 'Berbasis Kopi', fallbackKeyword: 'espresso' },
  { id: 'milk', name: 'Berbasis Susu', fallbackKeyword: 'milkshake' },
  { id: 'tea', name: 'Espresso & Teh', fallbackKeyword: 'ice tea' },
  { id: 'bites', name: 'Camilan', fallbackKeyword: 'fries' },
  { id: 'signature', name: 'Signature & Yakult', fallbackKeyword: 'cocktail' },
];

export const menuItems: MenuItem[] = [
  // BERBASIS KOPI
  { id: 'c1', name: 'Kopi Niscala Noka', description: 'Espresso, Magic Milk Noka', price: 20, image: 'https://i.ibb.co.com/Jj0hNf2g/niscala-noka.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c2', name: 'Kopi Alaya Noka', description: 'Espresso, Magic Milk, Palm Sugar', price: 22, image: 'https://i.ibb.co.com/HpCLVp6V/alaya.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c3', name: 'Kopi Arum', price: 25, image: 'https://i.ibb.co.com/GQtBz6hV/arum.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c4', name: 'Salted Caramel', price: 23, image: 'https://i.ibb.co.com/Jj0hNf2g/niscala-noka.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c5', name: 'Hazelnut Latte', price: 23, image: 'https://i.ibb.co.com/Jj0hNf2g/niscala-noka.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c6', name: 'Butterscotch Latte', price: 26, image: 'https://i.ibb.co.com/TDmgX56v/buterscoot.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c7', name: 'Kopi Susu Pisang', price: 26, image: 'https://i.ibb.co.com/0RFWWvgC/susu-pisang.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c8', name: 'Kopi Susu Pandan', price: 23, image: 'https://i.ibb.co.com/S4h2svbQ/susu-pandan.jpg', category: 'coffee', fallbackKeyword: 'espresso' },
  { id: 'c9', name: 'Kopi Nutella', price: 28, image: 'https://i.ibb.co.com/QFLCLyWf/nutella.jpg', category: 'coffee', fallbackKeyword: 'espresso' },

  // BERBASIS SUSU
  { id: 'm1', name: 'Hazelnut Milk', price: 18, image: 'https://i.ibb.co.com/35frg6zw/hazelnute.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm2', name: 'Noka Redvelvet', price: 26, image: 'https://i.ibb.co.com/pvvSBKYj/hazelnute.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm3', name: 'Greentea Machiatto', price: 28, image: 'https://i.ibb.co.com/KjJRymhV/green-tea.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm4', name: 'Choco Machiatto', price: 28, image: 'https://i.ibb.co.com/ZzV8JrDR/machiato.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm5', name: 'Blackforest', price: 27, image: 'https://i.ibb.co.com/BV4scJ6x/Whats-App-Image-2026-01-22-at-11-45-41.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm6', name: 'Choco Mint', price: 30, image: 'https://i.ibb.co.com/ZzV8JrDR/machiato.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm7', name: 'Matcha Noka', price: 27, image: 'https://i.ibb.co.com/KjJRymhV/green-tea.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm8', name: 'Nutella Latte', price: 26, image: 'https://i.ibb.co.com/ZzV8JrDR/machiato.jpg', category: 'milk', fallbackKeyword: 'milkshake' },
  { id: 'm9', name: 'Dark Chocolate Noka', price: 25, image: 'https://i.ibb.co.com/BV4scJ6x/Whats-App-Image-2026-01-22-at-11-45-41.jpg', category: 'milk', fallbackKeyword: 'milkshake' },

  // ESPRESSO & TEA
  { id: 't1', name: 'Espresso', price: 10, image: 'https://i.ibb.co.com/NgmLq79J/espresso.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't2', name: 'Americano', price: 15, image: 'https://i.ibb.co.com/4n2gQS4s/americano.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't3', name: 'Cafe Latte', price: 18, image: 'https://i.ibb.co.com/d44bFJMK/caffe-latte.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't4', name: 'Lemon Tea', price: 16, image: 'https://i.ibb.co.com/rGHXRkM5/lemon-tea.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't5', name: 'Lychee Tea', price: 18, image: 'https://i.ibb.co.com/YFRxnYQP/lecy-tea.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't6', name: 'Strawberry Tea', price: 17, image: 'https://i.ibb.co.com/mCgFT8B6/strowberry-tea.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't7', name: 'Mango Tea', price: 17, image: 'https://i.ibb.co.com/Ym27c6L/manggo-tea.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't8', name: 'Milk Tea', price: 18, image: 'https://i.ibb.co.com/ZzPrtvTh/milk-tea.jpg', category: 'tea', fallbackKeyword: 'ice tea' },
  { id: 't9', name: 'Mineral Water', price: 4, image: 'https://i.ibb.co.com/207mkYg4/pouring-water-from-plastic-bottle.jpg', category: 'tea', fallbackKeyword: 'ice tea' },

  // CAMILAN
  { id: 'b1', name: 'French Fries', price: 22, image: 'https://i.ibb.co.com/DHqj6PxQ/top-view-delicious-fries-sauce.jpg', category: 'bites', fallbackKeyword: 'fries' },
  { id: 'b2', name: 'Mix Platter', price: 25, image: 'https://i.ibb.co.com/CpMJkPqx/platter.jpg', category: 'bites', fallbackKeyword: 'fries' },
  { id: 'b3', name: 'Toasted Toast', price: 15, image: 'https://i.ibb.co.com/LDtBSrsd/toasty.jpg', category: 'bites', fallbackKeyword: 'fries' },
  { id: 'b4', name: 'Cookies Noka', price: 16, image: 'https://i.ibb.co.com/fGnTYtw0/kokis.jpg', category: 'bites', fallbackKeyword: 'fries' },
  { id: 'b5', name: 'Cheesecake', price: 38, image: 'https://i.ibb.co.com/gMRvwD4V/ciskek.jpg', category: 'bites', fallbackKeyword: 'fries' },

  // SIGNATURE & YAKULT
  { id: 's1', name: 'Sour Mint Rush', price: 22, image: 'https://i.ibb.co.com/h1B8yZLC/Sour-Mint-Rush.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's2', name: 'Sweet Memories', price: 22, image: 'https://i.ibb.co.com/fV5nvt68/sweet-memories.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's3', name: 'Viola', price: 22, image: 'https://i.ibb.co.com/60wRZKJY/viola.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's4', name: 'Noka Stir Ocean', price: 25, image: 'https://i.ibb.co.com/1fvjhJdb/oren-manggo.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's5', name: 'Rosso', price: 23, image: 'https://i.ibb.co.com/TqLX9ZRk/rosoo.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's6', name: 'Kilua', price: 25, image: 'https://i.ibb.co.com/Pzs0rfMg/kiluas.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's7', name: 'Fizzy Mango', price: 25, image: 'https://i.ibb.co.com/Fk8KdZKY/fizzy-manggo.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's8', name: 'Berry Pazza', price: 25, image: 'https://i.ibb.co.com/ycMH4L50/berry-pazza.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's9', name: 'Litchi Felicio', price: 25, image: 'https://i.ibb.co.com/hFZTBCdV/litchiii.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's10', name: 'Grazie Stessa', price: 25, image: 'https://i.ibb.co.com/1YGCsX15/grazie.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
  { id: 's11', name: 'Banana Contento', price: 25, image: 'https://i.ibb.co.com/Ng6NdDgh/banana-concento.jpg', category: 'signature', fallbackKeyword: 'cocktail' },
];

export const formatPrice = (price: number): string => {
  const actualPrice = price * 1000;
  return `${actualPrice.toLocaleString('id-ID')}Rp`;
};
