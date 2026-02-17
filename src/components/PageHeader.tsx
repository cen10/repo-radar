import type { ReactElement, ReactNode } from 'react';
import { SearchBar } from './SearchBar';
import { SortDropdown } from './SortDropdown';

export interface PageHeaderProps<T extends string> {
  title: string;
  titleIcon: ReactElement;
  subtitle?: string;
  titleTourId?: string;
  showSearchBar: boolean;

  // Search configuration
  searchId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  searchPlaceholder: string;
  searchTourId?: string;

  // Sort configuration
  sortValue: T;
  onSortChange: (sort: T) => void;
  sortOptions: { value: T; label: string }[];
  sortDisabled?: boolean;
  sortTourId?: string;

  // Optional action menu (for RadarPage kebab menu if needed)
  actionMenu?: ReactNode;
}

export function PageHeader<T extends string>({
  title,
  titleIcon,
  subtitle,
  titleTourId,
  showSearchBar,
  searchId,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  searchTourId,
  sortValue,
  onSortChange,
  sortOptions,
  sortDisabled,
  sortTourId,
  actionMenu,
}: PageHeaderProps<T>) {
  return (
    <div className="mb-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="flex items-center gap-2 text-2xl font-semibold text-gray-900"
            data-tour={titleTourId}
          >
            {titleIcon}
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 min-h-5">{subtitle}</p>
        </div>
        {actionMenu}
      </div>

      {/* Search and Sort row */}
      {showSearchBar && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
          <div className="flex-1" data-tour={searchTourId}>
            <SearchBar
              id={searchId}
              value={searchValue}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder={searchPlaceholder}
            />
          </div>
          <div data-tour={sortTourId}>
            <SortDropdown
              value={sortValue}
              onChange={onSortChange}
              options={sortOptions}
              disabled={sortDisabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
