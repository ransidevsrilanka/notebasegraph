const stats = [
  {
    value: "24h",
    label: "Syllabus update response time"
  },
  {
    value: "100%",
    label: "Content organized by exam relevance"
  },
  {
    value: "0",
    label: "Ads. Creators. Distractions."
  }
];

const Credibility = () => {
  return (
    <section className="py-32 md:py-40 bg-background border-y border-border/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-4">
                <p className="font-display text-5xl md:text-6xl font-black text-foreground tracking-tight">
                  {stat.value}
                </p>
                <div className="w-12 h-px bg-border mx-auto" />
                <p className="text-muted-foreground text-sm font-accent">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Credibility;
