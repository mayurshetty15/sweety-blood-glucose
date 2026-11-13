import ReportsPanel from '../components/ReportsPanel.jsx'

function Reports() {
  return (
    <div className="page-content reports-page">
      <section className="page-heading">
        <div>
          <p className="section-eyebrow">Your records, your way</p>
          <h1>Reports</h1>
          <p>Generate a focused summary from your recorded glucose readings.</p>
        </div>
      </section>
      <ReportsPanel />
    </div>
  )
}

export default Reports
