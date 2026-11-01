// The long answer an agent usually gives, formatted the way agents format it:
// headings, nested lists, bold, inline code, a table, a code block. The stage
// scrolls through it before it collapses into six blocks.

export function WallText() {
  return (
    <>
      <p>
        Sure! I&apos;ll walk through the checkout flow end to end, from the moment the customer presses{' '}
        <strong>Pay</strong> to the nightly settlement. Here&apos;s a detailed breakdown.
      </p>

      <h4>Overview</h4>
      <p>
        The checkout spans <strong>six services</strong>. The web shop calls the <code>Checkout API</code>, which
        validates the cart, creates an order in the <code>pending</code> state and hands it to Payments. Order
        events are published on the bus and consumed by Notifications and Settlement.
      </p>

      <h4>1. Cart service</h4>
      <ul>
        <li>
          Keeps line items per session in <code>cart_items</code>
        </li>
        <li>
          Applies discounts in a fixed order:
          <ul>
            <li>item-level promotions first</li>
            <li>then cart-level coupons</li>
            <li>
              then loyalty points (capped at <strong>30%</strong>)
            </li>
          </ul>
        </li>
        <li>
          Prices are cached for <strong>10 minutes</strong>; a stale price forces a refresh before the order is
          created
        </li>
      </ul>

      <h4>2. Checkout API</h4>
      <p>The main entry point. On every request it:</p>
      <ol>
        <li>Validates the cart against current prices and stock</li>
        <li>
          Reserves stock for <strong>15 minutes</strong>
        </li>
        <li>
          Creates the order with an idempotency key from the <code>Idempotency-Key</code> header
        </li>
        <li>Calls the payment service and waits for the charge result</li>
      </ol>
      <pre>{`POST /v1/checkout
{
  "cartId": "c_8f2a",
  "paymentMethod": "card",
  "shippingAddressId": "a_19"
}`}</pre>

      <h4>3. Payments</h4>
      <p>
        Payments wraps the provider (PSP) behind an adapter, so switching providers touches one module. Key points:
      </p>
      <ul>
        <li>
          <strong>Charges:</strong> one per order, created with the order total and currency
        </li>
        <li>
          <strong>3-D Secure:</strong> redirects come back through <code>/payments/callback</code>
        </li>
        <li>
          <strong>Retries:</strong> twice with exponential backoff (2 s, 8 s), then the order moves to{' '}
          <code>failed</code>
        </li>
        <li>
          <strong>Refunds:</strong> create a credit note and never edit the original charge
        </li>
      </ul>

      <h4>4. Orders</h4>
      <p>Orders follow a strict state machine:</p>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>Next</th>
            <th>Event</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>pending</td>
            <td>paid, failed</td>
            <td>order.created</td>
          </tr>
          <tr>
            <td>paid</td>
            <td>packed, refunded</td>
            <td>order.paid</td>
          </tr>
          <tr>
            <td>packed</td>
            <td>shipped</td>
            <td>order.packed</td>
          </tr>
          <tr>
            <td>shipped</td>
            <td>delivered</td>
            <td>order.shipped</td>
          </tr>
        </tbody>
      </table>
      <p>
        Every transition emits an event on the bus. ⚠️ Transitions are <strong>not reversible</strong>: a cancelled
        shipment creates a new return order instead.
      </p>

      <h4>5. Notifications</h4>
      <ul>
        <li>
          Listens to <code>order.*</code> events
        </li>
        <li>Sends transactional emails through the mail provider, with templates per locale</li>
        <li>
          Calls partner webhooks with an <code>HMAC-SHA256</code> signature in <code>X-Signature</code>
        </li>
        <li>Failed webhooks are retried for 24 hours, then parked in a dead-letter queue</li>
      </ul>

      <h4>6. Settlement</h4>
      <p>
        A nightly job at <strong>02:00 UTC</strong> reconciles provider payouts with paid orders:
      </p>
      <ol>
        <li>Downloads the payout report from the PSP</li>
        <li>Matches each line to a charge by reference</li>
        <li>Reports mismatches to finance as a CSV</li>
      </ol>

      <h4>Key takeaways</h4>
      <ul>
        <li>
          The <strong>Checkout API</strong> is the only synchronous path; everything after payment is event-driven
        </li>
        <li>Payments is isolated behind an adapter</li>
        <li>Orders are append-only: corrections create new documents</li>
        <li>Settlement is the safety net for anything the events missed</li>
      </ul>
      <p>
        Let me know if you&apos;d like me to dig deeper into any of these, for example the retry policy or the
        webhook signature!
      </p>
    </>
  )
}
