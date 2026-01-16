const problems = [
  {
    title: "No content chaos",
    description: "Every note organized by subject, chapter, and exam relevance. You find what you need in seconds."
  },
  {
    title: "No outdated syllabi",
    description: "Materials updated within 24 hours of any syllabus change. What you study is what they test."
  },
  {
    title: "No Telegram junk",
    description: "Zero random PDFs. Zero group chat confusion. Zero wasted hours searching."
  },
  {
    title: "No guessing games",
    description: "Clear marking of what matters for exams. No filler content, no distractions."
  }
];

const ProblemsEliminated = () => {
  return (
    <section className="py-32 md:py-40 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-16 text-center font-accent">
          What you won't find here
        </p>

        {/* Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-px bg-border/30">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="bg-background p-10 md:p-12"
            >
              <h3 className="font-display text-xl font-bold text-foreground mb-4 tracking-tight">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemsEliminated;
