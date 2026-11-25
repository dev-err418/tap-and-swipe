// Paris install cohorts and lifetime booked proceeds, including direct purchases and refunds.
export const blendedCohortQuery = (since: string) => `WITH
  toDateTime64('${since} 00:00:00', 6, 'Europe/Paris') AS floor_ts,
  now64(3) AS cutoff_ts,
  toUnixTimestamp64Milli(cutoff_ts) AS cutoff_ms,
  toStartOfHour(now() - INTERVAL 167 HOUR) AS raw_floor,
  recent_installs AS (
    SELECT applicationId, JSONExtractString(meta,'vendorId') AS device, min(ts) AS installed,
      argMin(appUserId,ts) AS uid,
      argMin(JSONExtractString(headers,'Cf-Ipcountry'),ts) AS install_country
    FROM sw.events_rep
    WHERE applicationId IN (51393,58115) AND isSandbox=0 AND isDeleted=0 AND name='first_seen'
      AND ts > toStartOfHour(now() - INTERVAL 167 HOUR) AND ts >= floor_ts AND ts < cutoff_ts AND ts < now()
      AND notEmpty(device) AND notEmpty(appUserId)
    GROUP BY applicationId,device
  ),
  older_devices AS (
    SELECT toUInt32(applicationId) AS applicationId,appUserId AS uid,
      anyIf(value,key='$vendorId') AS device,
      parseDateTime64BestEffortOrNull(anyIf(value,key='$appInstallDate'),6,'UTC') AS installed,
      anyIf(value,key='$ipCountry') AS install_country
    FROM sw.device_attributes_rep FINAL
    WHERE applicationId IN (51393,58115) AND isSandbox=0 AND isDeleted=0
      AND ts >= floor_ts AND ts < cutoff_ts AND ts < now()
      AND key IN ('$vendorId','$appInstallDate','$ipCountry')
    GROUP BY applicationId,uid
    HAVING installed >= floor_ts AND installed <= raw_floor AND notEmpty(device) AND notEmpty(uid)
  ),
  installs AS (
    SELECT applicationId,device,argMin(installed,priority) AS installed,
      argMin(uid,priority) AS uid,argMin(install_country,priority) AS install_country
    FROM (
      SELECT applicationId,device,installed,uid,install_country,0 AS priority FROM recent_installs
      UNION ALL
      SELECT applicationId,device,assumeNotNull(installed),uid,install_country,1 AS priority FROM older_devices
    )
    GROUP BY applicationId,device
  ),
  attrs AS (
    SELECT applicationId, appUserId, coalesce(nullIf(anyIf(value,key='country'),''), anyIf(value,key='ipCountry')) AS reported_country
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId IN (51393,58115) AND isSandbox=0 AND isDeleted=0
      AND ts >= floor_ts - INTERVAL 1 DAY AND ts < cutoff_ts AND key IN ('country','ipCountry')
    GROUP BY applicationId,appUserId
  ),
  ledger AS (
    SELECT applicationId, assumeNotNull(vendorId) AS device, originalTransactionId,
      coalesce(nullIf(transactionId,''), id) AS txn, isRefund AS refund, (name='cancellation' AND isRefund=0) AS trial_cancel,
      argMax(name, tuple(attributionTs,insertedAt)) AS kind,
      argMax(ifNull(lower(periodType),''), tuple(attributionTs,insertedAt)) AS period,
      argMax(toUnixTimestamp64Milli(if(isRefund=1 OR name='cancellation',ts,purchasedAt)), tuple(attributionTs,insertedAt)) AS occurred,
      argMax(tuple(proceeds,price), tuple(attributionTs,insertedAt)) AS amounts
    FROM open_revenue.attributed_events_by_ts_rep FINAL
    WHERE applicationId IN (51393,58115) AND isSandbox=0 AND isFamilyShare=0
      AND integration IN ('app_store_connect','google_play')
      AND ts >= floor_ts AND ts < cutoff_ts AND ts < now()
      AND notEmpty(ifNull(vendorId,''))
      AND (name IN ('initial_purchase','renewal','non_renewing_purchase') OR isRefund=1
           OR (name='cancellation' AND lower(periodType)='trial'))
    GROUP BY applicationId,device,originalTransactionId,txn,refund,trial_cancel
  ),
  people AS (
    SELECT i.applicationId AS app,i.device AS device,toDate(i.installed,'Europe/Paris') AS day,
      toUnixTimestamp64Milli(i.installed) AS installed_ms,
      upper(if(match(reported_country,'^[A-Za-z]{2}$'),reported_country,
        if(match(i.install_country,'^[A-Za-z]{2}$'),i.install_country,'ZZ'))) AS country
    FROM installs i LEFT JOIN attrs a ON toUInt64(i.applicationId)=a.applicationId AND i.uid=a.appUserId
  )
SELECT toString(p.day) AS day,p.country AS country,uniqExact(tuple(p.app,p.device)) AS installs,
  sumIf(if(l.refund=1,-abs(ifNull(l.amounts.1,0)),ifNull(l.amounts.1,0)),
    (l.kind IN ('initial_purchase','renewal','non_renewing_purchase') OR l.refund=1)
    AND l.occurred BETWEEN p.installed_ms-60000 AND cutoff_ms) AS booked_usd,
  countIf((l.refund=1 OR (l.kind IN ('initial_purchase','renewal','non_renewing_purchase')
    AND (l.period!='trial' OR ifNull(l.amounts.2,0)>0))) AND isNull(l.amounts.1)
    AND l.occurred BETWEEN p.installed_ms-60000 AND cutoff_ms) AS missing_money
FROM people p LEFT JOIN ledger l ON p.app=l.applicationId AND p.device=l.device
GROUP BY p.day,p.country LIMIT 50000 FORMAT JSON
`;
