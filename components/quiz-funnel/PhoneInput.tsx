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
  return (
    <div className="flex gap-2">
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value as Country)}
        className="w-[130px] shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#f1ebe2] outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2} className="bg-[#2a2725]">
            {countryToFlag(c.iso2)} {c.label} (+{getCountryCallingCode(c.iso2)})
          </option>
        ))}
      </select>
      <PhoneInputLib
        country={country}
        value={value}
        onChange={onChange}
        placeholder="Your phone number"
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
    </div>
  );
}
