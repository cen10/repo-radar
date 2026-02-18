import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

// Union of all possible sort option values across pages
export type SortOption = 'updated' | 'created' | 'stars' | 'forks' | 'help-wanted' | 'best-match';

interface SortDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}

export function SortDropdown<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: SortDropdownProps<T>) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative w-full sm:w-auto">
        <ListboxButton
          aria-label="Sort repositories"
          className="relative w-full sm:w-[200px] cursor-pointer rounded-lg bg-white py-2 pl-4 pr-10 text-left border border-gray-300 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block truncate">{selectedOption?.label}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute right-0 z-dropdown mt-1 max-h-60 min-w-[200px] w-max overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white whitespace-nowrap"
            >
              <span className="block font-normal group-data-[selected]:font-semibold">
                {option.label}
              </span>
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600 group-data-[focus]:text-white [.group:not([data-selected])_&]:hidden">
                <CheckIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
