'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

type Media = {
  type: 'image' | 'video';
  url: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  media: Media[];
  tags: string[];
  price: number;
  size: string;
  description: string;
};

export default function Page() {
  const [catalogue, setCatalogue] = React.useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  React.useEffect(() => {
    fetch('/products.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => setCatalogue(data))
      .catch(err => console.error('Failed to load products', err));
  }, []);
  
  const filtered = filter === 'all' 
    ? catalogue 
    : catalogue.filter(item => item.category === filter);

  const categories = ['all', 'toy', 'daily object', 'miniature', 'home'];

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#ff6b35]/20">
      <header className="px-6 md:px-12 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-white rounded-sm rotate-12"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#2d2a26]">mesh bakery</span>
        </div>
        <nav className="flex gap-8 text-xs font-bold tracking-widest opacity-80 text-[#3d3a36]">
          <a href="#" className="hover:opacity-60 transition-opacity">index</a>
          <a href="#" className="hover:opacity-60 transition-opacity">info</a>
        </nav>
      </header>

      <main className="flex-1">
        <section className="px-6 md:px-12 pt-12 pb-20 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12 relative overflow-hidden md:overflow-visible">
           <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />
           <div className="max-w-md z-10">
             <h1 className="text-4xl md:text-5xl font-serif font-light text-[#2d2a26] mb-6 leading-[1.1]">
               freshly baked 3d prints.<br/>
               <span className="text-[#5b6346] italic">for your desk.</span>
             </h1>
             <p className="text-[#3d3a36] opacity-60 text-sm leading-relaxed">
               a catalogue of whimsical playthings and quiet companions. small batches only.
             </p>
           </div>

           <div className="flex flex-wrap gap-2 z-10">
             {categories.map(cat => (
               <button
                 key={cat}
                 onClick={() => setFilter(cat)}
                 className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors ${filter === cat ? 'bg-[#2d2a26] text-[#faf8f5]' : 'bg-[#e9e4db] text-[#2d2a26] hover:bg-[#d8d0c5]'}`}
               >
                 {cat}
               </button>
             ))}
           </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, idx) => {
              const bgs = ['bg-[#f0ebe3] text-[#3d3a36]', 'bg-[#ff6b35] text-white', 'bg-[#2d2a26] text-[#faf8f5]', 'bg-[#5b6346] text-white', 'bg-[#e9e4db] text-[#3d3a36]', 'bg-[#d8d0c5] text-[#3d3a36]'];
              const bgClass = bgs[idx % bgs.length];
              const isDark = bgClass.includes('text-white') || bgClass.includes('text-[#faf8f5]');

              return (
                 <motion.div 
                  key={`${item.id}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  onClick={() => setSelectedProduct(item)}
                  className={`group flex flex-col rounded-[48px] p-8 relative overflow-hidden h-[400px] justify-between cursor-pointer ${bgClass}`}
                >
                  <div className="z-10 relative">
                    <h3 className="text-2xl font-medium mb-1">{item.name}</h3>
                    <p className={`text-sm ${isDark ? 'opacity-70' : 'opacity-50'}`}>{item.category}</p>
                    
                    {item.tags.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        {item.tags.map(tag => (
                          <span key={tag} className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded-full ${isDark ? 'bg-white/20 text-white' : 'bg-white/60 text-[#2d2a26]'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full overflow-hidden flex items-center justify-center">
                    <Image
                      src={item.media[0]?.url || 'https://picsum.photos/seed/fallback/800/800'}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                      referrerPolicy="no-referrer"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  </div>

                  <div className="z-10 flex justify-between items-end relative mt-auto">
                    <span className="font-mono text-xs opacity-60 tracking-widest">{item.id}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${isDark ? 'border border-white/20 text-white' : 'border border-[#3d3a36]/20 text-[#3d3a36]'}`}>
                      <span className="text-lg leading-none mb-0.5">→</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-12 py-8 flex justify-between items-center border-t border-[#e9e4db]/50">
        <span className="text-xs font-bold tracking-widest text-[#3d3a36] opacity-40">
          mesh bakery
        </span>
        <span className="text-xs font-bold tracking-widest text-[#3d3a36] opacity-40">
          brooklyn, ny
        </span>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#faf8f5] flex flex-col md:flex-row overflow-hidden w-full h-[100dvh]"
          >
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-6 right-6 md:top-8 md:right-12 z-50 w-12 h-12 rounded-full bg-white/50 backdrop-blur border border-[#3d3a36]/10 flex items-center justify-center hover:bg-white transition-colors shadow-sm text-[#2d2a26]"
            >
               ✕
            </button>
            
            <motion.div 
               initial={{ x: -50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: -20, opacity: 0 }}
               transition={{ delay: 0.1, duration: 0.4 }}
               className="w-full md:w-1/2 h-[50vh] md:h-full relative bg-[#e9e4db] overflow-y-auto no-scrollbar snap-y snap-mandatory"
            >
              {selectedProduct.media.map((m, i) => (
                <div key={i} className="w-full h-full relative shrink-0 snap-start">
                  {m.type === 'video' ? (
                    <video 
                      src={m.url}
                      className="w-full h-full object-cover"
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                    />
                  ) : (
                    <Image
                       src={m.url}
                       alt={`${selectedProduct.name} media ${i + 1}`}
                       fill
                       className="object-cover"
                       referrerPolicy="no-referrer"
                       sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  )}
                </div>
              ))}
            </motion.div>

            <motion.div 
               initial={{ x: 50, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               exit={{ x: 20, opacity: 0 }}
               transition={{ delay: 0.2, duration: 0.4 }}
               className="w-full md:w-1/2 h-auto md:h-full overflow-y-auto px-6 py-12 md:p-20 flex flex-col"
            >
              <div className="max-w-md mx-auto w-full mt-auto mb-auto">
                <div className="flex gap-3 mb-6">
                   {selectedProduct.tags.map(tag => (
                     <span key={tag} className="px-3 py-1 bg-[#2d2a26] text-[#faf8f5] text-[10px] font-bold tracking-widest rounded-full">
                       {tag}
                     </span>
                   ))}
                   <span className="px-3 py-1 bg-[#d8d0c5] text-[#3d3a36] text-[10px] font-bold tracking-widest rounded-full">
                     {selectedProduct.category}
                   </span>
                </div>
                
                <h2 className="text-4xl md:text-6xl font-serif font-light text-[#2d2a26] mb-4">
                  {selectedProduct.name}
                </h2>
                
                <div className="font-mono text-xl md:text-2xl mb-8">
                  ${selectedProduct.price.toFixed(2)}
                </div>
                
                <p className="text-lg text-[#3d3a36] opacity-80 leading-relaxed mb-8">
                  {selectedProduct.description}
                </p>
                
                <div className="border-y border-[#e9e4db] py-6 mb-10 flex flex-col gap-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold opacity-50 tracking-widest">size</span>
                    <span className="text-sm font-mono opacity-80">{selectedProduct.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-bold opacity-50 tracking-widest">material</span>
                    <span className="text-sm font-mono opacity-80">plant-based pla</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-sm font-bold opacity-50 tracking-widest">id</span>
                      <span className="text-sm font-mono opacity-80">{selectedProduct.id}</span>
                  </div>
                </div>
                
                <a 
                   href={`https://wa.me/1234567890?text=${encodeURIComponent(`hi mesh bakery, i'd like to order the ${selectedProduct.name} (${selectedProduct.id}).`)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-full bg-[#ff6b35] text-white h-16 rounded-full flex items-center justify-center text-sm font-bold tracking-widest hover:bg-[#e05a2b] transition-colors"
                >
                  order via whatsapp
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
