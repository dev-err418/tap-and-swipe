"use client";

import { AsYouType, type CountryCode } from "libphonenumber-js";

const COUNTRY_CODES = [
  { code: "+1", iso2: "US" as CountryCode, label: "US/Canada (+1)", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "+44", iso2: "GB" as CountryCode, label: "UK (+44)", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "+33", iso2: "FR" as CountryCode, label: "France (+33)", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "+49", iso2: "DE" as CountryCode, label: "Germany (+49)", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "+61", iso2: "AU" as CountryCode, label: "Australia (+61)", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "+91", iso2: "IN" as CountryCode, label: "India (+91)", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "+55", iso2: "BR" as CountryCode, label: "Brazil (+55)", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "+34", iso2: "ES" as CountryCode, label: "Spain (+34)", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "+39", iso2: "IT" as CountryCode, label: "Italy (+39)", flag: "\u{1F1EE}\u{1F1F9}" },
  { code: "+31", iso2: "NL" as CountryCode, label: "Netherlands (+31)", flag: "\u{1F1F3}\u{1F1F1}" },
  { code: "+46", iso2: "SE" as CountryCode, label: "Sweden (+46)", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "+41", iso2: "CH" as CountryCode, label: "Switzerland (+41)", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "+32", iso2: "BE" as CountryCode, label: "Belgium (+32)", flag: "\u{1F1E7}\u{1F1EA}" },
  { code: "+351", iso2: "PT" as CountryCode, label: "Portugal (+351)", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "+48", iso2: "PL" as CountryCode, label: "Poland (+48)", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "+212", iso2: "MA" as CountryCode, label: "Morocco (+212)", flag: "\u{1F1F2}\u{1F1E6}" },
  { code: "+234", iso2: "NG" as CountryCode, label: "Nigeria (+234)", flag: "\u{1F1F3}\u{1F1EC}" },
];

export { COUNTRY_CODES };

export default function PhoneInput({
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
}: {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
}) {
  function handlePhoneChange(value: string) {
    const entry = COUNTRY_CODES.find((c) => c.code === countryCode);
    const iso2 = entry?.iso2 || ("US" as CountryCode);
    const formatted = new AsYouType(iso2).input(value);
    onPhoneChange(formatted);
  }

  return (
    <div className="flex gap-2">
      <select
        value={countryCode}
        onChange={(e) => onCountryCodeChange(e.target.value)}
        className="w-[130px] shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#f1ebe2] outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code} className="bg-[#2a2725]">
            {c.flag} {c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder="Your phone number"
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
    </div>
  );
}
