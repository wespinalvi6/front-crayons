const fs = require('fs');
const file = 'src/view/public/Home.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the mobile menu wrapper div to properly position it and not cause horizontal scroll
// Current: `<div className={`lg:hidden fixed inset-0 top-0 bg-white z-[100] transition-transform duration-500 ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>`
// Issue 1: `fixed inset-0` on something that gets `translate-x-full` will make the page wider and cause horizontal scroll if body doesn't have overflow-x-hidden. We should use `fixed top-0 right-0 w-full h-screen`.
// Issue 2: `overflow-y-auto` is correctly set, but the container height might be messed up. 

content = content.replace(
  '<div className={`lg:hidden fixed inset-0 top-0 bg-white z-[100] transition-transform duration-500 ${isMenuOpen ? "translate-x-0" : "translate-x-full"\\n          }`}>',
  '<div className={`lg:hidden fixed top-0 right-0 w-full h-screen bg-white z-[100] transition-transform duration-500 ${isMenuOpen ? "translate-x-0" : "translate-x-full"\\n          }`}>'
);

content = content.replace(
  '<div className={`lg:hidden fixed inset-0 top-0 bg-white z-[100] transition-transform duration-500 ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>',
  '<div className={`lg:hidden fixed top-0 right-0 w-full h-screen bg-white z-[100] transition-transform duration-500 ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>'
);

// We should also add body lock to prevent scrolling background when menu is open
// Since it's React, useEffect can be used, but let's just use CSS for now or update useEffect in HomePage component
if (!content.includes('document.body.style.overflow')) {
  content = content.replace(
    'const toggleMenu = () => setIsMenuOpen(!isMenuOpen);',
    'const toggleMenu = () => { setIsMenuOpen(!isMenuOpen); };\\n  \\n  useEffect(() => {\\n    if (isMenuOpen) {\\n      document.body.style.overflow = "hidden";\\n    } else {\\n      document.body.style.overflow = "unset";\\n    }\\n    return () => { document.body.style.overflow = "unset"; };\\n  }, [isMenuOpen]);'
  );
}

// Add overflow-x-hidden to the root div of Home to prevent the horizontal scrollbar entirely just in case
content = content.replace(
  '<div className="min-h-screen font-sans bg-white text-[#0D0D0D] flex flex-col">',
  '<div className="min-h-screen font-sans bg-white text-[#0D0D0D] flex flex-col overflow-x-hidden relative">'
);

fs.writeFileSync(file, content);
console.log('Fixed mobile menu in Home.tsx');
