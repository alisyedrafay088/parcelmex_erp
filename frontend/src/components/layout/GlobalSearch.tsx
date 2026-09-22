import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Package, Search, Truck } from "lucide-react";
import { searchApi, type SearchResults } from "../../api/search";
import { useAuth } from "../../context/AuthContext";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function GlobalSearch() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!token || query.trim().length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchApi
        .search(token, query.trim(), controller.signal)
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults(null);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, query]);

  function goTo(path: string) {
    navigate(path);
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  const hasResults =
    results && (results.parcels.length > 0 || results.riders.length > 0 || results.clients.length > 0);
  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="app-topbar-search" ref={wrapRef}>
      <Search size={15} />
      <input
        type="text"
        placeholder="Search parcels, riders, clients..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {showDropdown && (
        <div className="global-search-dropdown">
          {loading && <div className="global-search-empty">Searching...</div>}

          {!loading && !hasResults && <div className="global-search-empty">No results for "{query}"</div>}

          {!loading && results && results.parcels.length > 0 && (
            <div className="global-search-group">
              <span className="global-search-group-label">Parcels</span>
              {results.parcels.map((p) => (
                <button
                  type="button"
                  key={`parcel-${p.id}`}
                  className="global-search-item"
                  onClick={() => goTo("/parcels")}
                >
                  <Package size={14} />
                  <span className="global-search-item-main">
                    <span className="global-search-item-title">{p.tracking_id}</span>
                    <span className="global-search-item-sub">
                      {p.client_name}
                      {p.destination_address ? ` · ${p.destination_address}` : ""}
                    </span>
                  </span>
                  <span className={`status-badge parcel-status-${p.status}`}>{p.status.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results && results.riders.length > 0 && (
            <div className="global-search-group">
              <span className="global-search-group-label">Riders</span>
              {results.riders.map((r) => (
                <button
                  type="button"
                  key={`rider-${r.id}`}
                  className="global-search-item"
                  onClick={() => goTo("/fleet")}
                >
                  <Truck size={14} />
                  <span className="global-search-item-main">
                    <span className="global-search-item-title">{r.name}</span>
                    {r.phone && <span className="global-search-item-sub">{r.phone}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && results && results.clients.length > 0 && (
            <div className="global-search-group">
              <span className="global-search-group-label">Clients</span>
              {results.clients.map((c) => (
                <button
                  type="button"
                  key={`client-${c.id}`}
                  className="global-search-item"
                  onClick={() => goTo("/clients")}
                >
                  <Building2 size={14} />
                  <span className="global-search-item-main">
                    <span className="global-search-item-title">{c.name}</span>
                    <span className="global-search-item-sub">{c.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
