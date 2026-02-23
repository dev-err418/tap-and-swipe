"use client";

const COUNTRY_CODES = [
  { code: "+1", label: "US/Canada (+1)", flag: "🇺🇸" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+33", label: "France (+33)", flag: "🇫🇷" },
  { code: "+49", label: "Germany (+49)", flag: "🇩🇪" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺" },
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+55", label: "Brazil (+55)", flag: "🇧🇷" },
  { code: "+34", label: "Spain (+34)", flag: "🇪🇸" },
  { code: "+39", label: "Italy (+39)", flag: "🇮🇹" },
  { code: "+31", label: "Netherlands (+31)", flag: "🇳🇱" },
  { code: "+46", label: "Sweden (+46)", flag: "🇸🇪" },
  { code: "+41", label: "Switzerland (+41)", flag: "🇨🇭" },
  { code: "+32", label: "Belgium (+32)", flag: "🇧🇪" },
  { code: "+351", label: "Portugal (+351)", flag: "🇵🇹" },
  { code: "+48", label: "Poland (+48)", flag: "🇵🇱" },
  { code: "+212", label: "Morocco (+212)", flag: "🇲🇦" },
  { code: "+234", label: "Nigeria (+234)", flag: "🇳🇬" },
];

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
    // Only allow digits, spaces, and dashes
    const cleaned = value.replace(/[^\d\s\-]/g, "");
    // Limit to 15 digits (E.164 max)
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length <= 15) {
      onPhoneChange(cleaned);
    }
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
        maxLength={20}
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
      />
    </div>
  );
}
