export function FilterBar({
  searchPlaceholder,
  filters
}: {
  searchPlaceholder: string;
  filters: Array<{ label: string; value: string; options: string[] }>;
}) {
  return (
    <form className="filter-bar">
      <div className="filter-field">
        <label htmlFor="keyword">Từ khóa</label>
        <input id="keyword" placeholder={searchPlaceholder} type="search" />
      </div>
      {filters.map((filter) => (
        <div className="filter-field" key={filter.label}>
          <label htmlFor={filter.value}>{filter.label}</label>
          <select id={filter.value} defaultValue="">
            <option value="">Tất cả</option>
            {filter.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      ))}
    </form>
  );
}
