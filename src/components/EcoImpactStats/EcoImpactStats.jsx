import './EcoImpactStats.css'

/**
 * EcoImpactStats — Customer-facing sustainability impact summary.
 *
 * Props:
 *   savedKg      number — kg of food rescued
 *   moneySaved   number — total ₪ saved through the app
 *   co2Kg        number — estimated CO₂ avoided
 *   ordersCount  number — total orders placed
 */
export default function EcoImpactStats({
  savedKg = 0,
  moneySaved = 0,
  co2Kg = 0,
  ordersCount = 0,
}) {
  return (
    <section className="eco-impact" aria-label="ההשפעה הסביבתית שלך">
      <header className="eco-impact__head">
        <span className="eco-impact__leaf" aria-hidden="true">🌿</span>
        <div>
          <h2 className="eco-impact__title">ההשפעה שלך</h2>
          <p className="eco-impact__sub">תודה שאת/ה חוסך/ת מזון</p>
        </div>
      </header>

      <div className="eco-impact__grid">
        <Stat icon="🥗" value={`${savedKg} ק"ג`}    label="מזון שניצל" />
        <Stat icon="💰" value={`₪${moneySaved}`}     label="כסף שנחסך" />
        <Stat icon="🌍" value={`${co2Kg} ק"ג CO₂`}   label="פליטות שנמנעו" />
        <Stat icon="🛍️" value={ordersCount}          label="הזמנות" />
      </div>
    </section>
  )
}

function Stat({ icon, value, label }) {
  return (
    <article className="eco-impact__stat">
      <span className="eco-impact__stat-icon" aria-hidden="true">{icon}</span>
      <span className="eco-impact__stat-value">{value}</span>
      <span className="eco-impact__stat-label">{label}</span>
    </article>
  )
}
