import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

export function SearchBar({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  inputRef,
  disabled = false,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <form className="flex-1" onSubmit={handleSubmit}>
      <div className="flex">
        <label htmlFor={id} className="sr-only">
          Search
        </label>
        <input
          ref={inputRef}
          id={id}
          name="search"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500 ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
        />
        <button
          type="submit"
          disabled={disabled}
          className={`px-4 py-2 bg-indigo-600 text-white border border-indigo-600 rounded-r-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-indigo-600' : ''}`}
        >
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Search</span>
        </button>
      </div>
    </form>
  );
}
