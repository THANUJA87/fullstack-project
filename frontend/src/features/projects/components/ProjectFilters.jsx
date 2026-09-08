export default function ProjectFilters({ query, setQuery, filter, setFilter }) {
  return (
    <div className="toolbar">
      <div className="search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects"
        />
      </div>
      <select value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option>All projects</option>
        <option>Active</option>
        <option>Inactive</option>
        <option>Draft</option>
      </select>
    </div>
  );
}
