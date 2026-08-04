interface IntroductionHeaderProps {
  title: string;
  subtitle: string;
  description: string;
  miniText: string;
}

export function IntroductionHeader({
  title,
  subtitle,
  description,
  miniText,
}: IntroductionHeaderProps) {
  return (
    <section
      className="relative overflow-hidden border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-borderLight)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 sm:pb-16">
        <div className="max-w-4xl">
          <p className="text-special text-sm font-semibold uppercase tracking-wide mb-4">
            {miniText}
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">
            {title}
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold mb-5">
            {subtitle}
          </h2>
          <p className="text-base sm:text-lg max-w-2xl leading-8">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
