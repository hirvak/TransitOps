import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search...",
  initialValue = "",
  debounceMs = 400,
  className = "",
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, debounceMs, onSearch]);

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className={`relative flex items-center w-full max-w-sm ${className}`}>
      <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 border rounded-lg bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 font-sans"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
