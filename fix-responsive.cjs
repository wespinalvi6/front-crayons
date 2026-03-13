const fs = require('fs');

function fixBody() {
  const file = 'src/view/public/body.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  // Hero
  content = content.replace('text-6xl md:text-8xl', 'text-4xl md:text-6xl lg:text-8xl');
  // Pilares title
  content = content.replace('text-4xl md:text-5xl font-light', 'text-3xl md:text-4xl lg:text-5xl font-light');
  // Educacion title
  content = content.replace('text-4xl md:text-6xl font-light', 'text-3xl md:text-4xl lg:text-6xl font-light');
  // Niveles title
  content = content.replace('text-5xl md:text-7xl font-light', 'text-4xl md:text-5xl lg:text-7xl font-light');
  // Ecos title
  content = content.replace('text-4xl md:text-6xl font-bold', 'text-3xl md:text-4xl lg:text-6xl font-bold');
  // Instalaciones title
  content = content.replace('text-5xl md:text-7xl font-serif', 'text-4xl md:text-5xl lg:text-7xl font-serif');
  // Final title
  content = content.replace('text-6xl md:text-8xl font-serif text-slate-900 leading-[0.95] mb-12', 'text-4xl md:text-6xl lg:text-8xl font-serif text-slate-900 leading-[0.95] mb-8 lg:mb-12');
  
  // Stats grid gap
  content = content.replace('grid grid-cols-2 lg:grid-cols-4 gap-12', 'grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12');

  // Stats values text sizes
  content = content.replace('text-3xl md:text-4xl font-bold', 'text-2xl md:text-4xl font-bold');
  
  // Margin adjustment on Final Section (image overlay)
  content = content.replace('relative h-[600px] w-full mt-12 lg:mt-0', 'relative h-[400px] lg:h-[600px] w-full mt-12 lg:mt-0');

  // Hero margin on mobile
  content = content.replace('pt-32 pb-20 lg:pt-40', 'pt-24 pb-16 lg:pt-40 lg:pb-20');

  // Pillares padding
  content = content.replace('py-24 px-6', 'py-16 lg:py-24 px-4 lg:px-6');

  // Niveles Section py
  content = content.replace('py-32 bg-[#0a0a0c]', 'py-16 lg:py-32 bg-[#0a0a0c]');

  // Testimonios padding
  content = content.replace('py-36 px-6', 'py-20 lg:py-36 px-4 lg:px-6');
  
  // Instalaciones padding
  content = content.replace('py-20 lg:py-32', 'py-16 lg:py-32');
  
  // Final padding
  content = content.replace('py-32 overflow-hidden', 'py-16 lg:py-32 overflow-hidden');

  // Footer padding
  content = content.replace('pt-24 pb-8', 'pt-16 lg:pt-24 pb-8');

  // Niveles image min-h
  content = content.replace('aspect-[4/5] rounded-tl-[60px]', 'aspect-[4/5] md:aspect-[3/4] rounded-tl-[60px]');

  fs.writeFileSync(file, content);
  console.log('Fixed body.tsx');
}

function fixHome() {
  const file = 'src/view/public/Home.tsx';
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix header h-8 constraint
  content = content.replace('flex justify-between items-center h-8', 'flex justify-between items-center py-2 min-h-[4rem]');
  
  // Adjust logo size on mobile
  content = content.replace('h-11" : "h-14', 'h-8 md:h-11" : "h-10 md:h-14');
  
  // Mobile menu top padding
  content = content.replace('p-6 h-full flex flex-col', 'p-4 sm:p-6 h-full flex flex-col');

  fs.writeFileSync(file, content);
  console.log('Fixed Home.tsx');
}

fixBody();
fixHome();
