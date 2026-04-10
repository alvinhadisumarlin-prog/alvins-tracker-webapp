export default function MarkCircle({ marked, onClick, title }) {
  if (!onClick) {
    return (
      <span className={`mark-circle ${marked ? 'done' : ''}`} title={title}>
        {marked ? '✓' : ''}
      </span>
    );
  }

  return (
    <button
      className={`mark-circle ${marked ? 'done' : ''}`}
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
    >
      {marked ? '✓' : ''}
    </button>
  );
}
