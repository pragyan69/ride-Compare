/** Stacked wordmark: RIDE over COMP + outlined ARE. */
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "wordmark wordmark-small" : "wordmark"} aria-label="RideCompare">
      <span>RIDE</span>
      <span>
        COMP<em>ARE</em>
      </span>
    </span>
  );
}
