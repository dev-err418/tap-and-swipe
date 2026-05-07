import type { Metadata } from "next";
import BookingConfirmedClient from "./booking-confirmed-client";

export const metadata: Metadata = {
  title: "Booking confirmed",
  description: "Your strategy call with Arthur is booked.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "/join/booking-confirmed",
  },
};

export default function BookingConfirmedPage() {
  return <BookingConfirmedClient />;
}
