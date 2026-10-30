export function Spinner({ large = false, label }: { large?: boolean; label?: string }) {
  return (
    <>
      <span className={large ? 'spinner spinner--lg' : 'spinner'} aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}
