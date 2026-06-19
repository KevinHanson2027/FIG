'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Field & Page Definitions ────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'image' | 'url'

type Field = {
  key: string
  label: string
  type: FieldType
  default: string
  hint?: string
}

type Section = { title: string; fields: Field[] }
type PageConfig = { slug: string; name: string; previewPath: string; sections: Section[] }

const PAGES: PageConfig[] = [
  {
    slug: 'home', name: 'Homepage', previewPath: '/',
    sections: [
      {
        title: 'Hero Banner', fields: [
          { key: 'hero_image',        label: 'Hero Image',       type: 'image',    default: '/Website Assets/Home/Dolan.jpeg' },
          { key: 'hero_title',        label: 'Hero Title',       type: 'text',     default: 'Fairfield Investment Group' },
          { key: 'hero_btn_text',     label: 'Button Text',      type: 'text',     default: 'Learn More' },
          { key: 'hero_btn_url',      label: 'Button URL',       type: 'url',      default: '/about' },
        ],
      },
      {
        title: 'History Section', fields: [
          { key: 'history_title', label: 'Title',     type: 'text',     default: 'Established in 2013' },
          { key: 'history_text',  label: 'Paragraph', type: 'textarea', default: 'Fairfield Investment Group was founded in 2013 with $50,000 in seed money. The group was established to bring together motivated students who share a passion for investing and understanding the dynamics of financial markets. Since its inception, Fairfield Investment Group has challenged students through collaboration and hands-on experience, helping prepare them for future careers in the finance industry.' },
        ],
      },
      {
        title: 'Facts & Figures', fields: [
          { key: 'stat_1_value', label: 'Stat 1 — Number',  type: 'text', default: '$230K+' },
          { key: 'stat_1_label', label: 'Stat 1 — Label',   type: 'text', default: 'Assets Under Management' },
          { key: 'stat_2_value', label: 'Stat 2 — Number',  type: 'text', default: '60+' },
          { key: 'stat_2_label', label: 'Stat 2 — Label',   type: 'text', default: 'Active Members' },
          { key: 'stat_3_value', label: 'Stat 3 — Number',  type: 'text', default: '8' },
          { key: 'stat_3_label', label: 'Stat 3 — Label',   type: 'text', default: 'Investment Sectors' },
        ],
      },
      {
        title: 'About FIG Section', fields: [
          { key: 'about_title', label: 'Heading',  type: 'text',     default: 'About FIG' },
          { key: 'about_text',  label: 'Body',     type: 'textarea', default: "Discover the Fairfield Investment Group's mission, history, and vision. Learn how we provide unparalleled hands-on portfolio management experience, educational resources, and professional development opportunities to prepare students for successful careers in finance." },
          { key: 'about_btn',   label: 'Button',   type: 'text',     default: 'Learn More' },
          { key: 'about_image', label: 'Photo',    type: 'image',    default: '/Website Assets/Home/IEX Trip.jpeg' },
        ],
      },
      {
        title: 'Our Holdings Section', fields: [
          { key: 'holdings_title', label: 'Heading', type: 'text',     default: 'Our Holdings' },
          { key: 'holdings_text',  label: 'Body',    type: 'textarea', default: 'See exactly how the Fairfield Investment Group manages its real-capital portfolio. This page provides full transparency into our current investments, including real-time performance data, asset allocation, and the rationale behind our investment decisions.' },
          { key: 'holdings_btn',   label: 'Button',  type: 'text',     default: 'View Holdings' },
          { key: 'holdings_image', label: 'Photo',   type: 'image',    default: '/Website Assets/Home/Fairfield University Campus Home Background.png' },
        ],
      },
      {
        title: 'Resources Section', fields: [
          { key: 'resources_title', label: 'Heading', type: 'text',     default: 'Resources' },
          { key: 'resources_text',  label: 'Body',    type: 'textarea', default: 'Access a curated vault of exclusive materials, including protected educational documents, stock research guides, resume templates, and essential recruiting advice. These resources are designed to give our members a competitive edge in their finance careers.' },
          { key: 'resources_btn',   label: 'Button',  type: 'text',     default: 'Explore Resources' },
          { key: 'resources_image', label: 'Photo',   type: 'image',    default: '/Website Assets/Home/Alumni Panel.jpeg' },
        ],
      },
      {
        title: 'Get Involved Section', fields: [
          { key: 'getinvolved_title', label: 'Heading', type: 'text',     default: 'Get Involved' },
          { key: 'getinvolved_text',  label: 'Body',    type: 'textarea', default: 'Ready to take your passion for finance to the next level? Learn more about the recruitment timeline, the application process, and the exclusive professional development and networking opportunities that come with being an active member of the Fairfield Investment Group.' },
          { key: 'getinvolved_btn',   label: 'Button',  type: 'text',     default: 'Join Us' },
          { key: 'getinvolved_image', label: 'Photo',   type: 'image',    default: '/Website Assets/Home/IEX Trip (2).jpeg' },
        ],
      },
    ],
  },
  {
    slug: 'about', name: 'About', previewPath: '/about',
    sections: [
      {
        title: 'Hero Banner', fields: [
          { key: 'hero_image',    label: 'Hero Image',    type: 'image', default: '/Website Assets/About/About Header Background.JPG' },
          { key: 'hero_title',    label: 'Hero Title',    type: 'text',  default: 'Established in 2013' },
          { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text',  default: 'Educating Fairfield students through real investing experience and financial leadership.' },
        ],
      },
      {
        title: 'About Us', fields: [
          { key: 'about_title', label: 'Heading',     type: 'text',     default: 'About Us' },
          { key: 'about_p1',    label: 'Paragraph 1', type: 'textarea', default: "The Fairfield Investment Group (FIG) is Fairfield University's premier student-run fund. The group was first established with a small group of ten students and has since grown exponentially, developing a robust network of alumni and maintaining a significant presence on campus." },
          { key: 'about_p2',    label: 'Paragraph 2', type: 'textarea', default: "FIG's core mandate is to educate all students at Fairfield on the skills needed to become a proficient investor. We achieve this by providing a unique, hands-on opportunity to research and pitch investments, effectively bridging the gap between classroom theory and real-world application." },
          { key: 'about_p3',    label: 'Paragraph 3', type: 'textarea', default: 'Our analysts and members regularly spend time discussing the linkages in the economy, the impact of major market players, central bank policy, and other current events that actively affect financial markets.' },
          { key: 'about_image', label: 'Photo',        type: 'image',    default: '/Website Assets/About/Serious Group Photo.png' },
        ],
      },
      {
        title: 'About the Group — Card 1', fields: [
          { key: 'card1_image', label: 'Image', type: 'image',    default: '/Website Assets/About/IEX Trip (2).jpeg' },
          { key: 'card1_title', label: 'Title', type: 'text',     default: 'Portfolio Performance Group' },
          { key: 'card1_text',  label: 'Body',  type: 'textarea', default: "The Portfolio Performance Group focuses on analyzing and tracking FIG's portfolio performance across sectors, comparing returns to key benchmarks. Members gain experience in data analysis, financial modeling, and portfolio management while identifying opportunities and improving investment strategy." },
        ],
      },
      {
        title: 'About the Group — Card 2', fields: [
          { key: 'card2_image', label: 'Image', type: 'image',    default: '/Website Assets/About/Alumni Panel.jpeg' },
          { key: 'card2_title', label: 'Title', type: 'text',     default: 'Meeting Details' },
          { key: 'card2_text',  label: 'Body',  type: 'textarea', default: "FIG holds weekly general meetings where members discuss and vote on stock proposals and share insights on the economy, the Fed, and market trends. Students can also write for The Stag Market, FIG's weekly newsletter featuring key economic and market updates." },
        ],
      },
      {
        title: 'About the Group — Card 3', fields: [
          { key: 'card3_image', label: 'Image', type: 'image',    default: '/Website Assets/About/IEX Trip.jpeg' },
          { key: 'card3_title', label: 'Title', type: 'text',     default: 'Special Events' },
          { key: 'card3_text',  label: 'Body',  type: 'textarea', default: 'FIG members and alumni bring experience from all areas of the financial services industry, offering opportunities for members to network and build connections. The club regularly hosts alumni panels and exclusive recruiting events to help members prepare for future careers.' },
        ],
      },
      {
        title: 'Our Placements', fields: [
          { key: 'placements_title', label: 'Heading',     type: 'text',     default: 'Our Placements' },
          { key: 'placements_text',  label: 'Description', type: 'textarea', default: "FIG members represent Fairfield's most committed candidates for employment in finance. This section highlights our members' dedication and success in securing roles across top firms in investment banking, wealth management, and consulting." },
          { key: 'placements_image', label: 'Image',       type: 'image',    default: '/Website Assets/About/Our Placements.png' },
          { key: 'placements_class', label: 'Class Label', type: 'text',     default: 'Class of 2026' },
          {
            key: 'placements_list', label: 'Placement List (one per line)', type: 'textarea',
            hint: 'One placement per line, e.g.:  Sara Wentland - Debt Capital Markets Analyst, Bank of America',
            default: `Sara Wentland - Debt Capital Markets Analyst, Bank of America
Matthew Byrnes - Wealth Management Intern, UBS
Andrew Burke - Marketing/Sales Analyst, REX Financial
Natalia Adamski - Real Estate & Private Markets Summer Analyst, UBS
Kelsey Volker - Investment and Sales Analyst, PGIM Investments
Lila Sullivan - Relationship Manager, MONECO Advisors
Matthew Celentano - Audit Intern, Forvis Mazars
Thomas Healey - Expert Services Analyst, Kroll
Paul Knieriem - Financial Advisor, Equitable Advisors
Brian Burke - Teaching Assistant Intern, Knopman Marks
Margaux Doran - Wealth Management Intern, UBS
Caleb Birchem - Sales Development Representative, GreenIRR`,
          },
        ],
      },
    ],
  },
  {
    slug: 'holdings', name: 'Holdings', previewPath: '/holdings',
    sections: [
      {
        title: 'Hero Banner', fields: [
          { key: 'hero_image', label: 'Hero Image', type: 'image', default: '/Website Assets/Holdings/Our Holdings Header Background.png' },
          { key: 'hero_title', label: 'Hero Title', type: 'text',  default: 'Portfolio Holdings' },
        ],
      },
      {
        title: 'Google Sheet Embed', fields: [
          { key: 'sheet_title', label: 'Section Title', type: 'text', default: 'Live Portfolio Tracker' },
          {
            key: 'sheet_url', label: 'Google Sheet Embed URL', type: 'url',
            hint: 'In Google Sheets: File → Share → Publish to web → choose "Web page" → copy the URL',
            default: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDYPOaxpRAbVrWFUUrspX2DnOKFDemKW7J55Y93kM_n-wG2xzutbMdWIbZv6aip6CmzNmVh4YaVlKL/pubhtml?gid=706692621&single=true&widget=true&headers=false',
          },
        ],
      },
    ],
  },
  {
    slug: 'portfolio-reporting', name: 'Portfolio Reporting', previewPath: '/portfolio-reporting',
    sections: [
      {
        title: 'Hero Banner', fields: [
          { key: 'hero_image', label: 'Hero Image', type: 'image', default: '/Website Assets/Home/Dolan.jpeg' },
          { key: 'hero_title', label: 'Hero Title', type: 'text',  default: 'Portfolio Reporting' },
          { key: 'section_title', label: 'Section Heading', type: 'text', default: 'Quarterly & Annual Reports' },
        ],
      },
      {
        title: 'Report Buttons',
        fields: [
          { key: 'report_1_label', label: 'Report 1 — Label', type: 'text', default: 'November 2025 Report' },
          { key: 'report_1_url',   label: 'Report 1 — PDF URL', type: 'url', default: '/Website Assets/Portfolio Reporting/Novemeber Report.pdf', hint: 'Leave URL blank to show button as "coming soon"' },
          { key: 'report_2_label', label: 'Report 2 — Label', type: 'text', default: 'December 2025 Report' },
          { key: 'report_2_url',   label: 'Report 2 — PDF URL', type: 'url', default: '' },
          { key: 'report_3_label', label: 'Report 3 — Label', type: 'text', default: 'January 2026 Report' },
          { key: 'report_3_url',   label: 'Report 3 — PDF URL', type: 'url', default: '' },
          { key: 'report_4_label', label: 'Report 4 — Label', type: 'text', default: 'February 2026 Report' },
          { key: 'report_4_url',   label: 'Report 4 — PDF URL', type: 'url', default: '' },
          { key: 'report_5_label', label: 'Report 5 — Label', type: 'text', default: 'March 2026 Report' },
          { key: 'report_5_url',   label: 'Report 5 — PDF URL', type: 'url', default: '' },
          { key: 'report_6_label', label: 'Report 6 — Label', type: 'text', default: 'April 2026 Report' },
          { key: 'report_6_url',   label: 'Report 6 — PDF URL', type: 'url', default: '' },
          { key: 'report_7_label', label: 'Report 7 — Label', type: 'text', default: 'May 2026 Report' },
          { key: 'report_7_url',   label: 'Report 7 — PDF URL', type: 'url', default: '' },
          { key: 'report_8_label', label: 'Report 8 — Label', type: 'text', default: 'Annual Report 2025-2026' },
          { key: 'report_8_url',   label: 'Report 8 — PDF URL', type: 'url', default: '' },
        ],
      },
    ],
  },
  {
    slug: 'resources', name: 'Resources', previewPath: '/resources',
    sections: [
      {
        title: 'The Vault', fields: [
          { key: 'vault_title', label: 'Title',       type: 'text',     default: '🔒 The Vault' },
          { key: 'vault_text',  label: 'Description', type: 'textarea', default: 'Access exclusive FIG pitch decks, research materials, and internal resources.' },
          { key: 'vault_url',   label: 'Button URL',  type: 'url',      default: 'https://forms.gle/3rXfFHs9rLe9UtHt6' },
          { key: 'vault_btn',   label: 'Button Text', type: 'text',     default: 'Access The Vault' },
        ],
      },
      {
        title: 'Stocks Links',
        fields: [
          { key: 'stocks_title', label: 'Section Heading', type: 'text', default: 'Stocks' },
          {
            key: 'stocks_links', label: 'Links (Label | URL — one per line)', type: 'textarea',
            hint: 'Format each line as:  Link Label | https://the-url.com',
            default: `Investment Research Guide | https://www.wallstreetprep.com/topics/investment-analysis/
Equity Valuation Template | https://corporatefinanceinstitute.com/resources/financial-modeling/equity-template/
Market Screener Tools | https://finviz.com/
Technical Analysis Basics | https://corporatefinanceinstitute.com/resources/career-map/sell-side/capital-markets/technical-analysis/
Financial Ratios Reference | https://corporatefinanceinstitute.com/assets/CFI-Financial-Ratios-Cheat-Sheet-eBook.pdf`,
          },
        ],
      },
      {
        title: 'Resume & Recruiting Links',
        fields: [
          { key: 'resume_title', label: 'Section Heading', type: 'text', default: 'Resume & Recruiting' },
          {
            key: 'resume_links', label: 'Links (Label | URL — one per line)', type: 'textarea',
            hint: 'Format each line as:  Link Label | https://the-url.com',
            default: `Resume Template | https://corporatefinanceinstitute.com/resources/career/free-resume-templates/
Networking Email Guide | https://www.indeed.com/career-advice/career-development/networking-by-email
Banking Interview Prep Guide | https://www.wallstreetprep.com/knowledge/investment-banking-internship-guide/
Interview Preparation Course | https://www.coursera.org/specializations/job-interviewing
Recruiting Timeline & Strategy | https://www.themuse.com/advice/the-ultimate-guide-to-recruiting-season-in-finance`,
          },
        ],
      },
      {
        title: 'Career Advice Links',
        fields: [
          { key: 'career_title', label: 'Section Heading', type: 'text', default: 'Career Advice' },
          {
            key: 'career_links', label: 'Links (Label | URL — one per line)', type: 'textarea',
            hint: 'Format each line as:  Link Label | https://the-url.com',
            default: `Finance Career Roadmap | https://corporatefinanceinstitute.com/resources/career-map/
Guide to Professionalism in the Workplace | https://www.indeed.com/career-advice/career-development/the-ultimate-guide-to-professionalism
Exploring Finance Career Paths | https://www.efinancialcareers.com/news/finance-career-paths
Breaking Into Investment Banking | https://www.wallstreetoasis.com/resources/skills/investment-banking/how-to-break-into-investment-banking
Finding Mentorship in Finance | https://hbr.org/2022/05/how-to-find-a-mentor`,
          },
        ],
      },
    ],
  },
  {
    slug: 'get-involved', name: 'Get Involved', previewPath: '/get-involved',
    sections: [
      {
        title: 'Hero Banner', fields: [
          { key: 'hero_image',    label: 'Hero Image',    type: 'image', default: '/Website Assets/Get Involved/Get Involved Background Header.png' },
          { key: 'hero_title',    label: 'Hero Title',    type: 'text',  default: 'Get Involved' },
          { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text',  default: 'Join Fairfield Investment Group and start building your career in finance today.' },
        ],
      },
      {
        title: 'Recruitment Timeline', fields: [
          { key: 'recruit_title', label: 'Heading',     type: 'text',     default: "Recruitment Timeline (Spring Semester 26')" },
          { key: 'recruit_text',  label: 'Description', type: 'textarea', default: 'Applications open DATE TBD. Resume screenings and interviews will take place in early December. Final decisions are sent out over winter break, before our first spring meeting.' },
          { key: 'recruit_image', label: 'Photo',       type: 'image',    default: '/Website Assets/Get Involved/Alumni Panel.jpeg' },
        ],
      },
      {
        title: 'Application Process', fields: [
          { key: 'app_title', label: 'Heading',     type: 'text',     default: 'Application Process' },
          { key: 'app_text',  label: 'Intro Text',  type: 'textarea', default: 'The Fairfield Investment Group application process is designed to identify driven, collaborative students who share a passion for investing and learning. The process includes:' },
          {
            key: 'app_steps', label: 'Steps (one per line)', type: 'textarea',
            hint: 'Each line becomes a bullet point',
            default: `Submit your application
Resume screening
In-person interview with a Portfolio Manager`,
          },
          { key: 'app_image', label: 'Photo', type: 'image', default: '/Website Assets/Event Photos/Guy Adami/DSC_0197.JPG' },
        ],
      },
      {
        title: 'What We Offer', fields: [
          { key: 'offer_title', label: 'Heading', type: 'text', default: 'What We Offer' },
          {
            key: 'offer_items', label: 'Offer Items (one per line)', type: 'textarea',
            hint: 'Each line becomes a bullet. Use "Bold Label: description" format.',
            default: `Hands-On Experience: Manage a live portfolio worth over $250K+ contributing to real investment decisions that drive our fund's performance.
Professional Development: Learn critical skills in financial modeling, analysis, and presentation under the guidance of experienced portfolio managers.
Exclusive Career & Networking Opportunities: Access alumni mentorship, internship pipelines, and recruiting events with leading financial firms.`,
          },
          { key: 'offer_image', label: 'Photo', type: 'image', default: '/Website Assets/Get Involved/IEX Trip.jpeg' },
        ],
      },
      {
        title: 'Call to Action', fields: [
          { key: 'cta_title',    label: 'CTA Heading',       type: 'text', default: 'Ready to Join?' },
          { key: 'cta_form_url', label: 'Interest Form URL', type: 'url',  default: 'https://forms.gle/84qCM2sGMZpJTaba8' },
          { key: 'cta_form_btn', label: 'Form Button Text',  type: 'text', default: 'Interest Form' },
        ],
      },
    ],
  },
]

// ─── Image Upload Helper ──────────────────────────────────────────────────────

function ImageField({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError('')
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `content/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('images')
      .upload(path, file, { upsert: true })
    if (error) {
      setUploadError('Upload failed: ' + error.message)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(data.path)
      onChange(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div
      style={{
        border: '2px dashed #ddd', borderRadius: '10px', padding: '1.25rem',
        background: '#fafafa', textAlign: 'center',
      }}
    >
      {/* Current image preview */}
      {value && (
        <div style={{ marginBottom: '1rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="current"
            style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '6px', objectFit: 'cover', border: '1px solid #eee' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}

      {/* Primary action: Upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '0.7rem 1.5rem', background: '#C80F2E', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 600,
        }}
      >
        {uploading ? 'Uploading…' : value ? '📷 Replace Image' : '📷 Upload Image'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*, .heic, .heif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
      />

      {uploadError && (
        <p style={{ color: '#C80F2E', fontSize: '0.8rem', marginTop: '0.5rem' }}>{uploadError}</p>
      )}

      {/* Secondary: paste URL toggle */}
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setShowUrl(s => !s)}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {showUrl ? 'Hide URL field' : 'or paste an image URL instead'}
        </button>
      </div>

      {showUrl && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          style={{
            marginTop: '0.5rem', width: '100%', padding: '0.6rem 0.75rem',
            border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem',
          }}
        />
      )}

      {value && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            ✕ Remove image
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function ContentPage() {
  const supabase = createClient()
  const [activePage, setActivePage] = useState(PAGES[0].slug)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const pageConfig = PAGES.find(p => p.slug === activePage)!

  const loadPage = useCallback(async (slug: string) => {
    setMessage('')
    const { data } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_slug', slug)
      .maybeSingle()
    const saved = (data?.content as Record<string, string>) ?? {}
    // Merge: saved values override defaults, but defaults fill anything missing
    const merged: Record<string, string> = {}
    PAGES.find(p => p.slug === slug)!.sections.forEach(s =>
      s.fields.forEach(f => { merged[f.key] = saved[f.key] ?? f.default })
    )
    setValues(merged)
  }, [supabase])

  useEffect(() => { loadPage(activePage) }, [activePage, loadPage])

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('page_content')
      .upsert({ page_slug: activePage, content: values, updated_at: new Date().toISOString() }, { onConflict: 'page_slug' })
    if (error) setMessage('Error: ' + error.message)
    else setMessage('Saved! Changes are live on the site.')
    setSaving(false)
  }

  async function handleReset() {
    if (!confirm('Reset all fields on this page to the original defaults?')) return
    const defaults: Record<string, string> = {}
    pageConfig.sections.forEach(s => s.fields.forEach(f => { defaults[f.key] = f.default }))
    setValues(defaults)
  }

  return (
    <>
      <div className="admin-header">
        <h1>Page Content Editor</h1>
        <p>Edit every piece of text, image, and link on the public website.</p>
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {PAGES.map(p => (
          <button
            key={p.slug}
            onClick={() => setActivePage(p.slug)}
            className={`admin-btn ${activePage === p.slug ? '' : 'admin-btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      {/* Section editors */}
      {pageConfig.sections.map(section => (
        <div key={section.title} className="admin-section" style={{ marginBottom: '1.5rem' }}>
          <div className="admin-section-header">
            <h2>{section.title}</h2>
          </div>
          {section.fields.map(field => (
            <div key={field.key} className="admin-form-group">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span>{field.label}</span>
                {field.hint && (
                  <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#888' }}>{field.hint}</span>
                )}
              </label>
              {field.type === 'image' ? (
                <ImageField value={values[field.key] ?? field.default} onChange={v => set(field.key, v)} />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={values[field.key] ?? field.default}
                  onChange={e => set(field.key, e.target.value)}
                  rows={field.default.length > 200 ? 6 : 3}
                />
              ) : (
                <input
                  type="text"
                  value={values[field.key] ?? field.default}
                  onChange={e => set(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Save / Reset / Preview */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingBottom: '4rem' }}>
        <button className="admin-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
        <button className="admin-btn admin-btn-secondary" onClick={handleReset}>
          Reset to Defaults
        </button>
        <a
          href={pageConfig.previewPath}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-secondary"
        >
          🌐 Preview Live Page
        </a>
      </div>
    </>
  )
}
