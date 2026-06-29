export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-orange-500/5 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl animate-float-slower" />
      <div className="absolute -bottom-10 left-1/2 h-64 w-64 rounded-full bg-orange-500/3 blur-3xl animate-float-slow" />
    </div>
  );
}
