export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="section-divider" role="separator" aria-label={label}>
      <span className="section-divider-bar" />
      {label && <span className="section-divider-label">{label}</span>}
      <span className="section-divider-rail" />
      <span className="section-divider-dot" />
    </div>
  );
}
