import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Resources' }

export default function ResourcesPage() {
  return (
    <>
      <section className="resources-section alt-bg">
        <h2>Protected Resources</h2>
        <div className="vault-callout">
          <h3>🔒 The Vault</h3>
          <p>Access exclusive FIG pitch decks, research materials, and internal resources.</p>
          <a
            href="https://forms.gle/3rXfFHs9rLe9UtHt6"
            className="vault-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Access The Vault
          </a>
        </div>
      </section>

      <section className="resources-section">
        <h2>Stocks</h2>
        <ul className="resource-list">
          <li><a href="https://www.wallstreetprep.com/topics/investment-analysis/" target="_blank" rel="noopener noreferrer" className="resource-link">Investment Research Guide</a></li>
          <li><a href="https://corporatefinanceinstitute.com/resources/financial-modeling/equity-template/" target="_blank" rel="noopener noreferrer" className="resource-link">Equity Valuation Template</a></li>
          <li><a href="https://finviz.com/" target="_blank" rel="noopener noreferrer" className="resource-link">Market Screener Tools</a></li>
          <li><a href="https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/technical-analysis/" target="_blank" rel="noopener noreferrer" className="resource-link">Technical Analysis Basics</a></li>
          <li><a href="https://corporatefinanceinstitute.com/assets/CFI-Financial-Ratios-Cheat-Sheet-eBook.pdf" target="_blank" rel="noopener noreferrer" className="resource-link">Financial Ratios Reference</a></li>
        </ul>
      </section>

      <section className="resources-section alt-bg">
        <h2>Resume &amp; Recruiting</h2>
        <ul className="resource-list">
          <li><a href="https://corporatefinanceinstitute.com/resources/career/free-resume-templates/" target="_blank" rel="noopener noreferrer" className="resource-link">Resume Template</a></li>
          <li><a href="https://www.indeed.com/career-advice/career-development/networking-by-email" target="_blank" rel="noopener noreferrer" className="resource-link">Networking Email Guide</a></li>
          <li><a href="https://www.wallstreetprep.com/knowledge/investment-banking-internship-guide/" target="_blank" rel="noopener noreferrer" className="resource-link">Banking Interview Prep Guide</a></li>
          <li><a href="https://www.coursera.org/specializations/job-interviewing" target="_blank" rel="noopener noreferrer" className="resource-link">Interview Preparation Course</a></li>
          <li><a href="https://www.themuse.com/advice/the-ultimate-guide-to-recruiting-season-in-finance" target="_blank" rel="noopener noreferrer" className="resource-link">Recruiting Timeline &amp; Strategy</a></li>
        </ul>
      </section>

      <section className="resources-section">
        <h2>Career Advice</h2>
        <ul className="resource-list">
          <li><a href="https://corporatefinanceinstitute.com/resources/career-map/" target="_blank" rel="noopener noreferrer" className="resource-link">Finance Career Roadmap</a></li>
          <li><a href="https://www.indeed.com/career-advice/career-development/the-ultimate-guide-to-professionalism" target="_blank" rel="noopener noreferrer" className="resource-link">Guide to Professionalism in the Workplace</a></li>
          <li><a href="https://www.efinancialcareers.com/news/finance-career-paths" target="_blank" rel="noopener noreferrer" className="resource-link">Exploring Finance Career Paths</a></li>
          <li><a href="https://www.wallstreetoasis.com/resources/skills/investment-banking/how-to-break-into-investment-banking" target="_blank" rel="noopener noreferrer" className="resource-link">Breaking Into Investment Banking</a></li>
          <li><a href="https://hbr.org/2022/05/how-to-find-a-mentor" target="_blank" rel="noopener noreferrer" className="resource-link">Finding Mentorship in Finance</a></li>
        </ul>
      </section>
    </>
  )
}
