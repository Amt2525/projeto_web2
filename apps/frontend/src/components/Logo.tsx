// Marca provisória do SolarSystem: um sol simples. É decorativa (aria-hidden): o nome vem sempre em texto.
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-bold text-blue-800">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
      </svg>
      SolarSystem
    </span>
  );
}
