interface Props {
  value: number | null;
  onChange?: (v: number | null) => void;
}

/** Voto da 1 a 5. Toccando di nuovo la stessa stella il voto si cancella. */
export default function Stars({ value, onChange }: Props) {
  return (
    <div className="stars" role="group" aria-label="Voto">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${value && n <= value ? "on" : ""}`}
          aria-label={`${n} su 5`}
          aria-pressed={value === n}
          disabled={!onChange}
          onClick={() => onChange?.(value === n ? null : n)}
        >
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
