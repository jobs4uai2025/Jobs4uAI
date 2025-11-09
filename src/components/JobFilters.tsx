import { useState } from "react";
import Select from "react-select";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { JobSearchFilters } from "../services/jobService";

interface JobFiltersProps {
  filters: JobSearchFilters;
  onFilterChange: (filters: JobSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  totalResults: number;
}

interface SelectOption {
  value: string;
  label: string;
}

const locationOptions: SelectOption[] = [
  { value: "Remote", label: "🌐 Remote" },
  { value: "New York, NY", label: "New York, NY" },
  { value: "San Francisco, CA", label: "San Francisco, CA" },
  { value: "Los Angeles, CA", label: "Los Angeles, CA" },
  { value: "Chicago, IL", label: "Chicago, IL" },
  { value: "Boston, MA", label: "Boston, MA" },
  { value: "Austin, TX", label: "Austin, TX" },
  { value: "Seattle, WA", label: "Seattle, WA" },
  { value: "Denver, CO", label: "Denver, CO" },
  { value: "Atlanta, GA", label: "Atlanta, GA" },
];

const experienceLevelOptions = [
  { value: "ENTRY", label: "Entry Level" },
  { value: "MID", label: "Mid Level" },
  { value: "SENIOR", label: "Senior Level" },
  { value: "LEAD", label: "Lead" },
  { value: "EXECUTIVE", label: "Executive" },
];

const datePostedOptions = [
  { value: "all", label: "All Time" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

export function JobFilters({
  filters,
  onFilterChange,
  onSearch,
  onReset,
  totalResults,
}: JobFiltersProps) {
  const [selectedLocations, setSelectedLocations] = useState<SelectOption[]>([]);
  const [salaryRange, setSalaryRange] = useState([0, 200000]);
  const [datePosted, setDatePosted] = useState("all");

  const handleLocationChange = (selected: readonly SelectOption[] | null) => {
    const locations = selected ? Array.from(selected) : [];
    setSelectedLocations(locations);

    // Update filter with comma-separated locations
    const locationString = locations.map((l) => l.value).join(",");
    onFilterChange({ ...filters, location: locationString });
  };

  const handleSalaryChange = (value: number[]) => {
    setSalaryRange(value);
    onFilterChange({
      ...filters,
      salaryMin: value[0],
      salaryMax: value[1],
    });
  };

  const handleDatePostedChange = (value: string) => {
    setDatePosted(value);
    // You can add logic to convert this to a date filter in the backend
    // For now, we'll just store it
    onFilterChange({ ...filters, datePosted: value });
  };

  const activeFilterCount = [
    filters.query,
    filters.location,
    filters.employmentType,
    filters.visaSponsorship,
    filters.experienceLevel,
    filters.remote,
    salaryRange[1] < 200000,
    datePosted !== "all",
  ].filter(Boolean).length;

  return (
    <Card className="sticky top-4">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Badge variant="secondary">{totalResults} jobs</Badge>
        </div>

        {/* Keyword Search */}
        <div className="space-y-2">
          <Label>Search Keywords</Label>
          <Input
            placeholder="Job title, company, keywords..."
            value={filters.query}
            onChange={(e) =>
              onFilterChange({ ...filters, query: e.target.value })
            }
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
        </div>

        {/* Multi-Select Location */}
        <div className="space-y-2">
          <Label>Location</Label>
          <Select
            isMulti
            options={locationOptions}
            value={selectedLocations}
            onChange={handleLocationChange}
            placeholder="Select locations..."
            className="text-sm"
            classNamePrefix="select"
            styles={{
              control: (base) => ({
                ...base,
                minHeight: "40px",
                borderColor: "hsl(var(--input))",
                backgroundColor: "hsl(var(--background))",
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? "hsl(var(--primary))"
                  : state.isFocused
                  ? "hsl(var(--accent))"
                  : "transparent",
                color: state.isSelected
                  ? "hsl(var(--primary-foreground))"
                  : "hsl(var(--foreground))",
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: "hsl(var(--secondary))",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "hsl(var(--secondary-foreground))",
              }),
            }}
          />
        </div>

        {/* Visa Sponsorship */}
        <div className="space-y-2">
          <Label>Visa Sponsorship</Label>
          <select
            value={filters.visaSponsorship || "all"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                visaSponsorship:
                  e.target.value === "all" ? undefined : (e.target.value as any),
              })
            }
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Types</option>
            <option value="opt">OPT</option>
            <option value="stemOpt">STEM OPT</option>
            <option value="h1b">H1B</option>
          </select>
        </div>

        {/* Job Type */}
        <div className="space-y-2">
          <Label>Job Type</Label>
          <select
            value={filters.employmentType || "all"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                employmentType: e.target.value === "all" ? "" : e.target.value,
              })
            }
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Types</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <Label>Experience Level</Label>
          <select
            value={filters.experienceLevel || "all"}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                experienceLevel: e.target.value === "all" ? "" : e.target.value,
              })
            }
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Levels</option>
            {experienceLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Salary Range */}
        <div className="space-y-3">
          <Label>
            Salary Range: ${(salaryRange[0] / 1000).toFixed(0)}k - $
            {salaryRange[1] >= 200000
              ? "200k+"
              : (salaryRange[1] / 1000).toFixed(0) + "k"}
          </Label>
          <Slider
            min={0}
            max={200000}
            step={5000}
            value={salaryRange}
            onValueChange={handleSalaryChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>$200k+</span>
          </div>
        </div>

        {/* Date Posted */}
        <div className="space-y-2">
          <Label>Date Posted</Label>
          <select
            value={datePosted}
            onChange={(e) => handleDatePostedChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {datePostedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Remote Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="remote">Remote Only</Label>
          <Switch
            id="remote"
            checked={filters.remote}
            onCheckedChange={(checked) =>
              onFilterChange({ ...filters, remote: checked })
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button className="w-full" onClick={onSearch}>
            Apply Filters
          </Button>
          <Button className="w-full" variant="outline" onClick={onReset}>
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
