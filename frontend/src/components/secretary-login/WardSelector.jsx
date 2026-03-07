import { useState } from 'react';
import { Search } from 'lucide-react';

const WardSelector = ({ wards = [], onSelect, lastWardId = null }) => {
  const [search, setSearch] = useState('');
  const showSearch = wards.length > 10;

  const filtered = search
    ? wards.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase())
      )
    : wards;

  return (
    <div className="flex flex-col h-full">
      {showSearch && (
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wards..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-neutral-500 py-8 text-base">
            {search ? 'No wards match your search.' : 'No wards available.'}
          </p>
        ) : (
          filtered.map((ward) => {
            const isLast = String(ward.id) === String(lastWardId);
            return (
              <button
                key={ward.id}
                type="button"
                onClick={() => onSelect(ward)}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-100 active:scale-[0.98] ${
                  isLast
                    ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
                style={{ minHeight: 56 }}
              >
                <span className="text-xl font-medium text-neutral-800 block">
                  {ward.name}
                </span>
                {isLast && (
                  <span className="text-xs font-semibold text-amber-700 mt-1 inline-block">
                    Last used
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WardSelector;
