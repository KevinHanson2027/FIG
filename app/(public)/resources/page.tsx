import type { Metadata } from 'next'
import { getPageContent, parseLinks } from '@/lib/getPageContent'

export const metadata: Metadata = { title: 'Resources' }

const DEFAULT_STOCKS = `Investment Research Guide | https://www.wallstreetprep.com/topics/investment-analysis/
Equity Valuation Template | https://corporatefinanceinstitute.com/resources/financial-modeling/equity-template/
Market Screener Tools | https://finviz.com/
Technical Analysis Basics | https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/technical-analysis/
Financial Ratios Reference | https://corporatefinanceinstitute.com/assets/CFI-Financial-Ratios-Cheat-Sheet-eBook.pdf`

const DEFAULT_RESUME = `Resume Template | https://corporatefinanceinstitute.com/resources/career/free-resume-templates/
Networking Email Guide | https://www.indeed.com/career-advice/career-development/networking-by-email
Banking Interview Prep Guide | https://www.wallstreetprep.com/knowledge/investment-banking-internship-guide/
Interview Preparation Course | https://www.coursera.org/specializations/job-interviewing
Recruiting Timeline & Strategy | https://www.themuse.com/advice/the-ultimate-guide-to-recruiting-season-in-finance`

const DEFAULT_CAREER = `Finance Career Roadmap | https://corporatefinanceinstitute.com/resources/career-map/
Guide to Professionalism in the Workplace | https://www.indeed.com/career-advice/career-development/the-ultimate-guide-to-professionalism
Exploring Finance Career Paths | https://www.efinancialcareers.com/news/finance-career-paths
Breaking Into Investment Banking | https://www.wallstreetoasis.com/resources/skills/investment-banking/how-to-break-into-investment-banking
Finding Mentorship in Finance | https://hbr.org/2022/05/how-to-find-a-mentor`

export default async function ResourcesPage() {
  const db = await getPageContent('resources')
  const c = (key: string, fallback: string) => db[key] || fallback

  const stockLinks  = parseLinks(c('stocks_links',  DEFAULT_STOCKS))
  const resumeLinks = parseLinks(c('resume_links',  DEFAULT_RESUME))
  const careerLinks = parseLinks(c('career_links',  DEFAULT_CAREER))

  return (
    <>
      <section className="resources-section alt-bg">
        <h2>Protected Resources</h2>
        <div className="vault-callout">
          <h3>{c('vault_title', '🔒 The Vault')}</h3>
          <p>{c('vault_text', 'Access exclusive FIG pitch decks, research materials, and internal resources.')}</p>
          <a href={c('vault_url', 'https://forms.gle/3rXfFHs9rLe9UtHt6')} className="vault-btn" target="_blank" rel="noopener noreferrer">
            {c('vault_btn', 'Access The Vault')}
          </a>
        </div>
      </section>

      <section className="resources-section">
        <h2>{c('stocks_title', 'Stocks')}</h2>
        <ul className="resource-list">
          {stockLinks.map(l => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="resource-link">{l.label}</a></li>
          ))}
        </ul>
      </section>

      <section className="resources-section alt-bg">
        <h2>{c('resume_title', 'Resume & Recruiting')}</h2>
        <ul className="resource-list">
          {resumeLinks.map(l => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="resource-link">{l.label}</a></li>
          ))}
        </ul>
      </section>

      <section className="resources-section">
        <h2>{c('career_title', 'Career Advice')}</h2>
        <ul className="resource-list">
          {careerLinks.map(l => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="resource-link">{l.label}</a></li>
          ))}
        </ul>
      </section>
    </>
  )
}
