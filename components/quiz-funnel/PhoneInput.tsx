"use client";

import PhoneInputLib from "react-phone-number-input/input";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js/core";

function countryToFlag(iso2: string) {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const COUNTRIES: { iso2: Country; label: string }[] = [
  { iso2: "US", label: "US" },
  { iso2: "CA", label: "Canada" },
  { iso2: "GB", label: "UK" },
  { iso2: "FR", label: "France" },
  { iso2: "DE", label: "Germany" },
  { iso2: "ES", label: "Spain" },
  { iso2: "IT", label: "Italy" },
  { iso2: "PT", label: "Portugal" },
  { iso2: "NL", label: "Netherlands" },
  { iso2: "BE", label: "Belgium" },
  { iso2: "CH", label: "Switzerland" },
  { iso2: "SE", label: "Sweden" },
  { iso2: "PL", label: "Poland" },
  { iso2: "AU", label: "Australia" },
  { iso2: "IN", label: "India" },
  { iso2: "BR", label: "Brazil" },
  { iso2: "MA", label: "Morocco" },
  { iso2: "NG", label: "Nigeria" },
  { iso2: "JP", label: "Japan" },
  { iso2: "KR", label: "South Korea" },
  { iso2: "MX", label: "Mexico" },
];

const MAX_NATIONAL_DIGITS: Record<string, number> = {
  US: 10, CA: 10, GB: 11, FR: 9, DE: 12, ES: 9, IT: 11,
  PT: 9, NL: 9, BE: 9, CH: 9, SE: 13, PL: 9, AU: 9,
  IN: 10, BR: 11, MA: 9, NG: 8, JP: 10, KR: 11, MX: 10,
};

export default function PhoneInput({
  country,
  value,
  onCountryChange,
  onChange,
}: {
  country: Country;
  value: E164Number | undefined;
  onCountryChange: (country: Country) => void;
  onChange: (value: E164Number | undefined) => void;
}) {
  function handleChange(newValue: E164Number | undefined) {
    if (newValue) {
      const prefix = `+${getCountryCallingCode(country)}`;
      const nationalDigits = newValue.startsWith(prefix)
        ? newValue.slice(prefix.length)
        : newValue.slice(1);
      if (nationalDigits.length > (MAX_NATIONAL_DIGITS[country] ?? 15)) return;
    }
    onChange(newValue);
  }

  return (
    <div className="flex gap-2">
      <div className="relative shrink-0">
        <div className="pointer-events-none flex h-full items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#f1ebe2]">
          <span>{countryToFlag(country)}</span>
          <span>{country} (+{getCountryCallingCode(country)})</span>
        </div>
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value as Country)}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {countryToFlag(c.iso2)} {c.label} (+{getCountryCallingCode(c.iso2)})
            </option>
          ))}
        </select>
      </div>
      <PhoneInputLib
        country={country}
        value={value}
        onChange={handleChange}
        placeholder="Your phone number"
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
    </div>
  );
}
