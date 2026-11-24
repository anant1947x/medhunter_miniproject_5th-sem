import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { get } from "../../services/api";

function readSearchHistory(key, fallback = []) {
  if (!key) return fallback;

  try {
    const history = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(history)) {
      return history.filter((name) => typeof name === "string").slice(0, 10);
    }
  } catch {
    // Keep the current history if browser storage cannot be read.
  }

  return fallback;
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const historyKey = user?._id ? `medhunter_search_history_${user._id}` : null;

  const [searchName, setSearchName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [results, setResults] = useState([]);
  const [searchCount, setSearchCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] = useState(() => readSearchHistory(historyKey));

  const [userLocation, setUserLocation] = useState({
    lat: null,
    lng: null,
    display: "Location not fetched yet",
  });

  useEffect(() => {
    const name = searchName.trim();
    if (!showSuggestions || name.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await get(
          `/search/suggestions?name=${encodeURIComponent(name)}`,
          controller.signal
        );
        if (controller.signal.aborted) return;
        setSuggestions(data.suggestions);
        setSuggestionMessage(data.suggestions.length ? "" : "No matching medicines.");
      } catch (err) {
        if (controller.signal.aborted) return;
        setSuggestionMessage(
          err.status === 401
            ? "Sign in again to see medicine suggestions."
            : "Could not load medicine suggestions."
        );
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchName, showSuggestions]);

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    setSuggestionMessage("");
    setActiveSuggestion(-1);
  };

  const handleNameChange = (e) => {
    setSearchName(e.target.value);
    setSuggestions([]);
    setSuggestionMessage("");
    setActiveSuggestion(-1);
    setShowSuggestions(true);
  };

  const selectMedicine = (name) => {
    setSearchName(name);
    closeSuggestions();
  };

  const handleNameKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Escape") {
      closeSuggestions();
    }
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = e.key === "ArrowDown"
        ? Math.min(activeSuggestion + 1, suggestions.length - 1)
        : Math.max(activeSuggestion - 1, 0);
      setActiveSuggestion(nextIndex);
      document.getElementById(`medicine-suggestion-${nextIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectMedicine(suggestions[activeSuggestion]);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation((prev) => ({
        ...prev,
        display: "Geolocation is not supported by your browser",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          display: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        });
      },
      () => {
        setUserLocation((prev) => ({
          ...prev,
          display: "Unable to fetch location. Please allow location access.",
        }));
      }
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    closeSuggestions();
    setError("");
    const name = searchName.trim();

    if (!name) {
      setError("Please enter a medicine name");
      return;
    }
    if (!userLocation.lat || !userLocation.lng) {
      setError("Please fetch your location first using the button above");
      return;
    }

    setLoading(true);

    try {
      const data = await get(
        `/search?name=${encodeURIComponent(name)}&lat=${userLocation.lat}&lng=${userLocation.lng}&maxDistance=10000`
      );
      setResults(data.results || []);
      setSearchCount(data.count || 0);

      const history = readSearchHistory(historyKey, searchHistory);
      const updatedHistory = history.includes(name)
        ? history
        : [name, ...history].slice(0, 10);
      setSearchHistory(updatedHistory);

      if (historyKey) {
        try {
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        } catch {
          // Keep the history visible for this session if saving fails.
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-[#f4faf7] px-6 py-8 text-[#163832] md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#2d9b7d]">
              User Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Search medicines near your location
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Welcome, <span className="font-semibold">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#dff4ea] px-5 py-4">
              <p className="text-sm font-semibold text-[#1f6f5b]">
                Current Location
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {userLocation.display}
              </p>
              <button
                onClick={handleGetLocation}
                className="mt-3 rounded-full bg-[#1f6f5b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#185847]"
              >
                Use My Location
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Search Medicine</h2>
              <p className="mt-2 text-sm text-slate-600">
                Search by medicine name to see nearby stores.
              </p>

              <form onSubmit={handleSearch} className="mt-5 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    role="combobox"
                    aria-label="Medicine name"
                    aria-autocomplete="list"
                    aria-expanded={suggestions.length > 0}
                    aria-controls={suggestions.length > 0 ? "medicine-suggestions" : undefined}
                    aria-activedescendant={activeSuggestion >= 0 ? `medicine-suggestion-${activeSuggestion}` : undefined}
                    autoComplete="off"
                    placeholder="Enter medicine name"
                    value={searchName}
                    onChange={handleNameChange}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={closeSuggestions}
                    onKeyDown={handleNameKeyDown}
                    className="w-full rounded-2xl border border-[#d7e8e1] bg-[#f9fcfb] px-4 py-3 outline-none focus:border-[#1f6f5b]"
                  />

                  {suggestions.length > 0 && (
                    <ul
                      id="medicine-suggestions"
                      role="listbox"
                      aria-label="Medicine suggestions"
                      className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-[#d7e8e1] bg-white py-1 shadow-lg"
                    >
                      {suggestions.map((name, index) => (
                        <li
                          key={name}
                          id={`medicine-suggestion-${index}`}
                          role="option"
                          aria-selected={index === activeSuggestion}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectMedicine(name)}
                          className="cursor-pointer px-4 py-3 text-sm hover:bg-[#dff4ea] aria-selected:bg-[#dff4ea]"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {suggestionMessage && (
                    <p role="status" className="mt-2 px-1 text-sm text-slate-600">
                      {suggestionMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#1f6f5b] px-4 py-3 font-semibold text-white transition hover:bg-[#185847] disabled:opacity-60"
                >
                  {loading ? "Searching..." : "Search Now"}
                </button>
              </form>
            </div>

            {searchHistory.length > 0 && (
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold">Search History</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {searchHistory.map((name) => (
                    <button
                      key={name}
                      onClick={() => selectMedicine(name)}
                      className="block w-full rounded-2xl bg-[#f4faf7] px-4 py-3 text-left transition hover:bg-[#dff4ea]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="space-y-6">
            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Nearby Results</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {searchCount === null
                      ? "Search for a medicine to see nearby stores."
                      : `Showing shops that have your medicine.`}
                  </p>
                </div>

                {searchCount !== null && (
                  <div className="rounded-full bg-[#dff4ea] px-4 py-2 text-sm font-semibold text-[#1f6f5b]">
                    {searchCount} {searchCount === 1 ? "Shop" : "Shops"} Found
                  </div>
                )}
              </div>

              {results.length === 0 && searchCount !== null && (
                <div className="mt-6 rounded-2xl bg-[#f4faf7] px-4 py-8 text-center text-sm text-slate-600">
                  No nearby stores found with this medicine. Try a different
                  name or increase the search radius.
                </div>
              )}

              <div className="mt-6 grid gap-4">
                {results.map((item) => (
                  <div
                    key={item.shop._id}
                    className="rounded-3xl border border-[#e4efea] bg-[#fcfefd] p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          {item.shop.shopName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Owner: {item.shop.ownerName}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Address: {item.shop.shopAddress}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Distance: {item.shop.distanceInKm} km ({item.shop.distanceInMeters}m)
                        </p>

                        <div className="mt-3 space-y-1">
                          {item.medicines.map((med) => (
                            <div
                              key={med._id}
                              className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f4faf7] px-3 py-2 text-sm"
                            >
                              <span className="font-semibold">{med.name}</span>
                              <span className="text-slate-600">
                                ₹{med.price}
                              </span>
                              <span className="text-slate-500">
                                Stock: {med.stock}
                              </span>
                              {med.manufacturer && (
                                <span className="text-slate-400">
                                  by {med.manufacturer}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <span className="rounded-full bg-[#dff4ea] px-4 py-2 text-sm font-semibold text-[#1f6f5b]">
                          Available
                        </span>

                        <div className="flex flex-wrap gap-3">
                          {item.shop.contactNumber && (
                            <a
                              href={`tel:${item.shop.contactNumber}`}
                              className="rounded-full border border-[#1f6f5b] px-4 py-2 text-sm font-semibold text-[#1f6f5b] transition hover:bg-[#1f6f5b] hover:text-white"
                            >
                              Call Shop
                            </a>
                          )}
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${item.shop.coordinates[1]},${item.shop.coordinates[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-[#1f6f5b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#185847]"
                          >
                            View Route
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
