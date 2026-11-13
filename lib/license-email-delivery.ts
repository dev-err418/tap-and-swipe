type Query = (sql: string, values: unknown[]) => Promise<{ rows: unknown[] }>;

// Keep delivery separate from key creation so a webhook retry can recover a
// failed send. The database claim serializes activation and payment webhooks.
export async function deliverLicenseEmailOnce(
  key: string,
  isNew: boolean,
  query: Query,
  send: () => Promise<boolean>,
): Promise<boolean> {
  const claim = await query(`UPDATE aso_licenses
    SET license_email_claimed_until = now() + interval '2 minutes',
        license_email_last_attempt_at = now(), license_email_last_error = NULL
    WHERE key = $1 AND active = true AND license_email_sent_at IS NULL
      AND (license_email_claimed_until IS NULL OR license_email_claimed_until < now())
      AND ($2::boolean OR created_at >= now() - interval '6 hours'
           OR license_email_last_attempt_at IS NOT NULL)
    RETURNING key`, [key, isNew]);
  if (!claim.rows.length) {
    const current = await query(`SELECT license_email_sent_at, license_email_claimed_until
      FROM aso_licenses WHERE key = $1`, [key]);
    const row = current.rows[0] as { license_email_sent_at: unknown; license_email_claimed_until: unknown } | undefined;
    if (!row) throw new Error("License missing during email delivery");
    if (!row.license_email_sent_at && row.license_email_claimed_until) {
      throw new Error("License email delivery is in progress; retry webhook");
    }
    return false;
  }
  let sent: boolean;
  try {
    sent = await send();
  } catch {
    sent = false;
  }
  if (!sent) {
    await query(`UPDATE aso_licenses SET license_email_claimed_until = NULL,
      license_email_last_error = 'plunk_send_failed' WHERE key = $1
      AND license_email_sent_at IS NULL`, [key]);
    throw new Error("License email failed; retry webhook");
  }
  await query(`UPDATE aso_licenses SET license_email_sent_at = now(),
    license_email_claimed_until = NULL, license_email_last_error = NULL WHERE key = $1`, [key]);
  return true;
}
