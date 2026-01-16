const features = [
  {
    title: "Stream-Locked Access",
    lines: [
      "Your entire curriculum. Maths, Biology, Commerce, Arts, or Technology.",
      "Every subject in one place."
    ]
  },
  {
    title: "Exam-Ready Materials",
    lines: [
      "Past papers. Model answers. Structured notes.",
      "Organized exactly as your syllabus demands."
    ]
  },
  {
    title: "Offline Study",
    lines: [
      "Download PDFs for areas with limited connectivity.",
      "Your preparation doesn't depend on internet."
    ]
  }
];

const ContentPreview = () => {
  return (
    <section className="py-32 md:py-40 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-20 text-center font-accent">
          Built for focus
        </p>

        {/* Feature List */}
        <div className="max-w-2xl mx-auto space-y-0">
          {features.map((feature, index) => (
            <div key={index}>
              <div className="py-12">
                <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">
                  {feature.title}
                </h3>
                {feature.lines.map((line, lineIndex) => (
                  <p key={lineIndex} className="text-muted-foreground leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
              {index < features.length - 1 && (
                <div className="h-px bg-border/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContentPreview;
