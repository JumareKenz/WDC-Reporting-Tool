import { Delete } from 'lucide-react';

const PinKeypad = ({ onDigit, onBackspace, disabled = false }) => {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back'],
  ];

  return (
    <div
      className={`grid grid-cols-3 gap-3 max-w-xs mx-auto select-none ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      {keys.flat().map((key, i) => {
        if (key === '') {
          return <div key={i} />;
        }

        if (key === 'back') {
          return (
            <button
              key={i}
              type="button"
              onClick={onBackspace}
              className="flex items-center justify-center min-h-[64px] min-w-[64px] rounded-xl bg-neutral-200 hover:bg-neutral-300 active:scale-95 transition-all duration-100"
              aria-label="Backspace"
            >
              <Delete className="w-6 h-6 text-neutral-700" />
            </button>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onDigit(key)}
            className="flex items-center justify-center min-h-[64px] min-w-[64px] rounded-xl bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 active:scale-95 active:bg-neutral-100 transition-all duration-100 text-2xl font-semibold text-neutral-800"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};

export default PinKeypad;
