const LgaSelector = ({ lgas = [], onSelect, lastLgaId = null }) => {
  return (
    <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
      {lgas.length === 0 ? (
        <p className="text-center text-neutral-500 py-8 text-base">
          No LGAs available.
        </p>
      ) : (
        lgas.map((lga) => {
          const isLast = String(lga.id) === String(lastLgaId);
          return (
            <button
              key={lga.id}
              type="button"
              onClick={() => onSelect(lga)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-100 active:scale-[0.98] ${
                isLast
                  ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50'
              }`}
              style={{ minHeight: 56 }}
            >
              <span className="text-xl font-medium text-neutral-800 block">
                {lga.name}
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
  );
};

export default LgaSelector;
