import { useState, useRef, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SearchBar } from './SearchBar';
import { Button } from './Button';

interface CollapsibleSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  className?: string;
}

function getShortcutHint(): string {
  const isMac =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
  return isMac ? '⌘K' : 'Ctrl+K';
}

export function CollapsibleSearch({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  className = '',
}: CollapsibleSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldFocusToggle, setShouldFocusToggle] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const shortcutHint = getShortcutHint();

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    setShouldFocusToggle(true);
  }, []);

  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      // Small delay to ensure the element is rendered and visible
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isExpanded]);

  // Return focus to toggle button after collapse
  useEffect(() => {
    if (!isExpanded && shouldFocusToggle) {
      const timeoutId = setTimeout(() => {
        toggleButtonRef.current?.focus();
        setShouldFocusToggle(false);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isExpanded, shouldFocusToggle]);

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle with Cmd+K or Ctrl+K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (isExpanded) {
          collapse();
        } else {
          expand();
        }
      }

      // Close with Escape (only when expanded)
      if (event.key === 'Escape' && isExpanded) {
        collapse();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, expand, collapse]);

  const handleCloseClick = () => {
    collapse();
  };

  return (
    <div
      className={`flex items-center gap-2 flex-1 min-h-[42px] mr-2 ${isExpanded ? '' : 'justify-end'} ${className}`}
    >
      {/* Collapsed state: Hint + search icon */}
      {!isExpanded && (
        <Button
          ref={toggleButtonRef}
          variant="ghost"
          size="md"
          onClick={expand}
          aria-expanded={isExpanded}
          aria-controls={`${id}-container`}
          aria-label="Open search"
          className="flex items-center gap-2"
        >
          <kbd
            className="text-xs text-gray-400 font-sans bg-gray-100 px-1.5 py-0.5 rounded"
            aria-hidden="true"
          >
            {shortcutHint}
          </kbd>
          <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}

      {/* Expanded state: Search bar + close button */}
      {isExpanded && (
        <div id={`${id}-container`} className="flex items-center gap-2 flex-1">
          <SearchBar
            id={id}
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={placeholder}
            inputRef={inputRef}
          />
          <Button variant="ghost" size="md" onClick={handleCloseClick} aria-label="Close search">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
