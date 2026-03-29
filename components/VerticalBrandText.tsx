export default function VerticalBrandText() {
  return (
    <div className="fixed left-2 sm:left-6 top-1/2 z-40 hidden -translate-y-1/2 lg:flex mix-blend-screen">
      <div 
        className="flex items-center gap-6 text-[0.65rem] font-medium tracking-[0.4em] uppercase text-[#8a73a6]/70 transition-all duration-300 hover:text-[#f8fafc]"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        <span className="h-24 w-[1px] bg-gradient-to-t from-transparent via-[#8a73a6]/40 to-transparent"></span>
        University of Moratuwa
        <span className="h-24 w-[1px] bg-gradient-to-t from-transparent via-[#8a73a6]/40 to-transparent"></span>
      </div>
    </div>
  );
}
