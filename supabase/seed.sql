-- ================================================
-- FIG Members Directory — Seed Data
-- Run in Supabase SQL Editor AFTER running schema.sql
-- This imports all members from the original website.
-- Edit freely via /admin/members after import.
-- ================================================

insert into public.members_directory
  (name, title, sector, email, linkedin_url, bio, headshot_url, is_active, sort_order)
values

-- ── Executive Board ──────────────────────────────────────────────
(
  'Sara Wentland', 'President', 'Executive Board',
  'sara.wentland@student.fairfield.edu',
  'https://www.linkedin.com/in/sara-wentland/',
  'Sara Wentland is a Senior double-majoring in Finance and Business Analytics with a minor in English. As President of the Fairfield Investment Group, Sara leads a team of over 60 students managing a $230,000+ portfolio and drives key initiatives to enhance members'' investment and presentation skills. Sara''s professional experience includes internships at Moneco Advisors (Wealth Management) and Vanguard (Corporate Finance). Most recently, she interned in Debt Capital Markets at Bank of America, where she will be returning as a Full-time Analyst upon graduation. Outside of FIG, she is the Co-President of the Fairfield Finance Club, coordinating events with alumni across the finance industry. Sara also competed in the CFA Institute Equity Research Challenge, helping lead Fairfield University to its first-ever regional victory in New York City.',
  '/Website Assets/Members/Executive Board/Sara Wentland.jpeg',
  true, 0
),
(
  'Matt Byrnes', 'Vice President', 'Executive Board',
  'matthew.byrnes@student.fairfield.edu',
  'https://linkedin.com/in/matthew-byrnes-430327260',
  'Matt Byrnes is a Senior Finance major and the Vice President of the Fairfield Investment Group, where he spearheads portfolio management and oversees the Tech sector. Matt''s early impact included a successful pitch on Broadcom (AVGO), which is currently up ~100% in the portfolio. As VP, Matt founded the Portfolio Performance Group (PPG), a new data-driven subsector dedicated to monthly performance reporting. He gained professional experience as a Wealth Management Intern at UBS, where he completed his SIE exam, and he is focused on continuing his career in the Wealth/Private Wealth Management space post-graduation.',
  '/Website Assets/Members/Executive Board/Matthew Byrnes.jpeg',
  true, 1
),

-- ── Consumers ────────────────────────────────────────────────────
(
  'Kevin Hanson', 'Consumers Portfolio Manager', 'Consumers',
  'kevin.hanson@student.fairfield.edu',
  'https://www.linkedin.com/in/kevinhanson2027/',
  'Kevin Hanson is a Junior Honors Student at the University, triple-majoring in Computer Science, Business Analytics, and Management with an entrepreneurship concentration. He serves as a Portfolio Manager (PM) for the Fairfield Investment Group (FIG), where he oversees portfolio performance and mentors new analysts. Outside of FIG, Kevin is the President of the Business Analytics Group and a key member of the Fairfield Start-up Club, where he is developing his marketplace startup, Cruise. Showing significant entrepreneurial drive, he also owns WebForge Creative, a web development business, and manages growth for his non-profit, Happy Dog Surf Shop. Last summer, Kevin gained corporate experience as a Sales Strategy Intern at Henkel. In his free time, he enjoys playing four instruments, with the electric guitar being his favorite, and celebrating his Irish culture.',
  '/Website Assets/Members/Consumers/Kevin Hanson.png',
  true, 0
),
(
  'Preet Patel', 'Consumers Analyst', 'Consumers',
  'preet.patel@student.fairfield.edu',
  'https://www.linkedin.com/in/preet-patel123/',
  'Preet Patel is a second-year sophomore at Fairfield University''s Dolan School of Business, double-majoring in Accounting and Finance. He currently serves as a Consumers Sector Analyst for the Fairfield Investment Group (FIG), where he applies his strong interest in financial services to equity research and valuation work. Preet has already gained meaningful experience across the industry, including two sell-side M&A roles, a buy-side private equity internship, and a wealth management position. On campus, he is a Leadership member of the Fairfield Investment Banking Society, a Residence Assistant in Loyola Hall, and a member of the Fairfield Men''s Rugby team. He was also accepted into the prestigious Access Distributed Fellowship, where he is partnered with leading firms such as Carlyle and TPG. In his free time, Preet enjoys black coffee, house music, and traveling.',
  '/Website Assets/Members/Consumers/Preet_Patel.jpg',
  true, 1
),
(
  'Sean Kramer', 'Consumers Analyst', 'Consumers',
  'sean.kramer@student.fairfield.edu',
  'https://www.linkedin.com/in/sean-kramer6',
  'Sean Kramer is a sophomore double-majoring in Finance and Accounting at Fairfield University''s Dolan School of Business. He serves as a Consumers Sector Analyst and a member of the Portfolio Performance Group for the Fairfield Investment Group (FIG), where he contributes to equity research and portfolio analysis aimed at enhancing fund performance. Sean is currently interning at Union Park Capital, a lower middle market private equity firm, gaining hands-on experience in deal evaluation and financial modeling. He is also a co-author of Stagonomics, a freelance finance newsletter that features interviews with professionals across the financial industry. Outside of academics and work, Sean enjoys hiking, playing basketball and golf, weightlifting, and following the Boston Celtics.',
  '/Website Assets/Members/Consumers/Sean Kramer.png',
  true, 1
),
(
  'Grace Hall', 'Consumers Analyst', 'Consumers',
  'grace.hall@student.fairfield.edu',
  'https://www.linkedin.com/in/gracevhall',
  'Grace Hall is a second-year student majoring in Finance and Accounting at Fairfield University''s Dolan School of Business. She serves as an Analyst in the Consumers Sector for the Fairfield Investment Group (FIG), where she contributes to the management of a student-led investment fund through equity research, investment pitches, and market analysis. Beyond FIG, Grace is highly involved on campus as the Founder and Leader of the Women''s Run Club, a Finance Representative for Women in Business, and a Junior Analyst for the Fairfield Wealth Management Club. She has gained professional experience as a Finance and Operations Intern at GAB-On! and as a Treasury Intern for the Fairfield University Student Association. Grace was also recognized as the annual PB Abate Scholar at The Island School, an honor awarded to one student worldwide for leadership. In her free time, she enjoys running half and full marathons, traveling, and volunteering at a local marine life conservation project.',
  '/Website Assets/Members/Consumers/Grace Hall.png',
  true, 1
),
(
  'Luke Meierjohan', 'Consumers Analyst', 'Consumers',
  'luke.meierjohan@student.fairfield.edu',
  'https://www.linkedin.com/in/luke-meierjohan/',
  'Luke Meierjohan is a second-year student at Fairfield University''s Dolan School of Business, double-majoring in Finance and Accounting. He currently serves as a Consumers Sector Analyst for the Fairfield Investment Group (FIG), where he evaluates corporate earnings, supports equity research, and contributes to stock pitch presentations. Outside of FIG, Luke is actively involved in the Investment Banking Society and continues to build his technical foundation, having recently passed the Securities Industry Essentials (SIE) Exam. In his free time, he enjoys skiing, golfing, and playing poker.',
  '/Website Assets/Members/Consumers/Luke Meierjohan.png',
  true, 1
),
(
  'Will Kelley', 'Consumers Analyst', 'Consumers',
  'william.kelley@student.fairfield.edu',
  'https://www.linkedin.com/in/will4kelley/',
  'Will Kelley is a third-year student at Fairfield University''s Charles F. Dolan School of Business, double-majoring in Finance and Business Analytics. He joined the Fairfield Investment Group (FIG) in March 2024, initially working in the Real Estate sector before transitioning to the Consumers sector, where he now contributes to research and investment decision-making. Outside of FIG, Will is an active member of the University Honors Program, further enriching his academic experience. In his free time, he enjoys golfing and skiing.',
  '/Website Assets/Members/Consumers/Will Kelley.png',
  true, 1
),

-- ── Energy & Utilities ────────────────────────────────────────────
(
  'Andrew Burke', 'Energy & Utilities Portfolio Manager', 'Energy & Utilities',
  'andrew.burke2@student.fairfield.edu',
  'https://www.linkedin.com/in/andrew-burke-9915b5272/',
  'Andrew Burke is a junior majoring in Finance with a minor in Economics at Fairfield University''s Dolan School of Business. He serves as the Energy & Utilities Sector Portfolio Manager for the Fairfield Investment Group (FIG), leading a team of analysts and managing a portion of the student-run fund with a focus on equity research and macroeconomic analysis. Andrew recently worked as a Summer Analyst at REX Financial, where he supported ETF strategy development and client engagement initiatives, and he continues to be involved with the firm as a Marketing and Sales Analyst. He is passionate about financial markets, particularly within the energy and aerospace industries, and enjoys cooking and exploring new restaurants in his free time.',
  '/Website Assets/Members/Energy & Utilities/Andrew Burke.png',
  true, 0
),
(
  'Paul Knieriem', 'Energy & Utilities Analyst', 'Energy & Utilities',
  'paul.knieriem@student.fairfield.edu',
  'https://www.linkedin.com/in/paul-knieriem',
  'Paul Knieriem is a senior double-majoring in Finance and Accounting at Fairfield University''s Dolan School of Business. As an Analyst in the Fairfield Investment Group (FIG), he contributes to market research and portfolio management within the Energy & Utilities sector. Paul has developed a strong professional background through internships at Union Park Capital, a private equity firm where he assisted with valuation analysis, and in corporate audit with the Town of Huntington. He also holds an offer to join Equitable Advisors as a Financial Advisor. Outside of finance, Paul is the co-founder of Sports Equipment for All Child Program, a non-profit dedicated to providing athletic equipment to children in need. In his free time, he enjoys following the markets, watching football, and staying active.',
  '/Website Assets/Members/Energy & Utilities/Paul Knieriem.png',
  true, 1
),
(
  'Patrick Donohue', 'Energy & Utilities Analyst', 'Energy & Utilities',
  'patrick.donohue@student.fairfield.edu',
  'https://www.linkedin.com/in/patrick-c-donohue',
  'Patrick Donohue is a sophomore majoring in Finance with a minor in Accounting at Fairfield University''s Dolan School of Business. He is an Analyst in the Fairfield Investment Group (FIG), where he contributes to equity research, valuation, and portfolio management within the Energy & Utilities sector. Outside of FIG, Patrick is involved in the Investment Banking Society, further developing his technical and professional skills. He is currently gaining industry experience as a Wealth Management Intern at Oppenheimer & Co., supporting portfolio analysis and client deliverables. Previously, he interned at Houlihan Lokey in the Portfolio Valuation Group and will be returning there for an internship in Summer 2026. In April 2025, Patrick passed the Securities Industry Essentials (SIE) exam. Beyond finance, he plays rugby for Fairfield''s club team.',
  '/Website Assets/Members/Energy & Utilities/Patrick Donohue.png',
  true, 1
),
(
  'Thomas Healey', 'Energy & Utilities Analyst', 'Energy & Utilities',
  'thomas.healey@student.fairfield.edu',
  'https://www.linkedin.com/in/thomas-healey-/',
  'Thomas Healey is a senior double-majoring in Finance and Business Analytics at Fairfield University''s Dolan School of Business. He serves as an Analyst in the Energy & Utilities sector for the Fairfield Investment Group (FIG), where he helps conduct equity research and sector analysis. Thomas has developed a strong professional foundation through internships at Moneco Advisors and Daniel Dennis LLP, as well as working as an Expert Services Analyst at Kroll. On campus, he is the President of the Men''s Club Soccer team, which recently completed its first-ever undefeated fall season. In his free time, Thomas enjoys lifting, running, listening to country music, and spending time at the beach.',
  '/Website Assets/Members/Energy & Utilities/Thomas Healey.png',
  true, 1
),
(
  'Michael Byrnes', 'Energy & Utilities Analyst', 'Energy & Utilities',
  'michael.byrnes@student.fairfield.edu',
  'https://www.linkedin.com/in/michael-byrnes-9a0610286/',
  'Michael Byrnes is a sophomore double-majoring in Finance and Accounting at Fairfield University''s Dolan School of Business. He serves as an Analyst in the Energy & Utilities sector for the Fairfield Investment Group (FIG) and is also a member of the FIG Portfolio Performance Group, where he helps evaluate investment ideas and monitor fund performance. In addition to his involvement in finance, Michael is a member of the Fairfield Accounting Club and the Knights of Columbus. In his free time, he enjoys playing intramural sports, blackjack, and listening to podcasts.',
  '/Website Assets/Members/Energy & Utilities/Michael Byrnes.png',
  true, 1
),

-- ── Financials ────────────────────────────────────────────────────
(
  'Kelsey Volker', 'Financials Portfolio Manager', 'Financials',
  'kelsey.volker@student.fairfield.edu',
  'https://www.linkedin.com/in/kelsey-volker/',
  'Kelsey Volker is a senior Finance major at Fairfield University who has been an active member of the Fairfield Investment Group (FIG) since her sophomore year. She currently serves as the Financials Sector Portfolio Manager, overseeing research and investment decisions within the sector. Kelsey has gained significant professional experience through two consecutive summer internships at Prudential Financial, including one summer at PGIM Investments, the firm''s asset management arm. Following graduation, she will return to PGIM full-time as an Investment and Sales Analyst. Outside of academics and markets, Kelsey enjoys spending time with friends and family, going to the beach, and cheering on the Pittsburgh Steelers.',
  '/Website Assets/Members/Financials/Kelsey Volker.png',
  true, 0
),
(
  'Anthony Terrano', 'Financials Analyst', 'Financials',
  'anthony.terrano@student.fairfield.edu',
  'https://www.linkedin.com/in/anthony-terrano/',
  'Anthony Terrano is a junior double-majoring in Accounting and Finance at Fairfield University''s Dolan School of Business. He serves as an Analyst in the Financials sector for the Fairfield Investment Group (FIG), where he helps his team work toward outperforming the XLF benchmark through rigorous equity research and valuation. Anthony is highly involved across campus, participating in the Accounting Club, Beta Alpha Psi, and the Finance Club, while also serving on the Dolan Student Advisory Board and as a member of the Honors Program. He has secured internships with Heritage Strategies LLC for Summer 2025 and an Assurance Summer Internship with EY for Summer 2026. In his free time, Anthony enjoys running, lifting weights, cooking, and watching the Yankees and Knicks.',
  '/Website Assets/Members/Financials/Anthony Terrano.png',
  true, 1
),
(
  'Gregg Bursey', 'Financials Analyst', 'Financials',
  'gregg.bursey@student.fairfield.edu',
  'https://www.linkedin.com/in/greggbursey/',
  'Gregg Bursey is a third-year Finance major at Fairfield University''s Dolan School of Business. He serves as an Analyst in the Financials sector for the Fairfield Investment Group (FIG), where he conducts equity research, valuation, and macroeconomic analysis. Gregg is highly active in the Investment Banking Society, leading technical discussions and helping prepare students for recruiting. He will be joining JPMorgan Chase in Summer 2026 as a Commercial & Investment Banking Summer Analyst and previously gained experience as an Investment Banking Intern at The Rockwell Financial Group, as well as completing a Nonprofit Consulting Externship with PwC. Outside the classroom, Gregg is involved in the Real Estate Co-Star Group, Ski Club, and Finance Club.',
  '/Website Assets/Members/Financials/Gregg Bursey.png',
  true, 1
),
(
  'Margaux Doran', 'Financials Analyst', 'Financials',
  'margaux.doran@student.fairfield.edu',
  'https://www.linkedin.com/in/margaux-doran/',
  'Margaux Doran is a senior double-majoring in Finance and International Business at Fairfield University''s Dolan School of Business. She serves as a Financials Analyst in the Fairfield Investment Group (FIG), conducting in-depth equity research and valuation within the sector. Margaux has gained hands-on experience through an internship with UBS Wealth Management, where she supported client strategy development and portfolio analysis for the Global Family and Institutional Wealth division, and she continues to intern there during the school year. Outside of academics and finance, she is an avid tennis player and enjoys staying active both on and off the court.',
  '/Website Assets/Members/Financials/Margaux Doran.png',
  true, 1
),
(
  'Eva Weyman', 'Financials Analyst', 'Financials',
  'eva.weyman@student.fairfield.edu',
  'http://linkedin.com/in/eva-weyman-ba2a17390',
  'Eva Weyman is a freshman double-majoring in Finance and Accounting at Fairfield University. She serves as an Analyst in the Financials sector for the Fairfield Investment Group (FIG), where she is eager to deepen her understanding of markets and contribute to the team''s research efforts. Outside of FIG, Eva is a member of the Women in Business club, expanding her professional network and leadership skills. She has prior work experience as a hostess and as a tennis coach at a country club outside of Chicago. In her free time, Eva enjoys playing tennis, running, and spending time with family and friends.',
  '/Website Assets/Members/Financials/Eva Weyman.png',
  true, 1
),

-- ── Fixed Income ──────────────────────────────────────────────────
(
  'Craig Raskin', 'Fixed Income Portfolio Manager', 'Fixed Income',
  'craig.raskin@student.fairfield.edu',
  'https://www.linkedin.com/in/craigraskin/',
  'Craig Raskin is a third-year student double-majoring in Finance and Accounting at Fairfield University''s Dolan School of Business. He serves as a Portfolio Manager for the Fairfield Investment Group (FIG), leading the Fixed Income team, overseeing investment presentations, and ensuring alignment with the fund''s objectives. Professionally, Craig was a Summer Credit Analyst at Chatham Asset Management and previously interned in wealth management with WealthPlan Advantage. On campus, he is a member of the Dolan Student Advisory Board. Outside of his academic and finance commitments, Craig performs clarinet with the Pep Band and Grace Notes Church Ensemble and is passionate about skiing, golf, and pickleball.',
  '/Website Assets/Members/Fixed Income/Craig_Raskin.jpg',
  true, 0
),
(
  'Drew Lottier', 'Fixed Income Analyst', 'Fixed Income',
  'drew.lottier@student.fairfield.edu',
  'https://www.linkedin.com/in/drewlottier/',
  'Drew Lottier is a sophomore majoring in Finance at Fairfield University''s Dolan School of Business. Within the Fairfield Investment Group (FIG), he serves as a Fixed Income Analyst and Co-Leader of the Portfolio Performance Group, supporting data-driven investment decisions across the fund. Outside of FIG, Drew is a Treasury Intern for the Fairfield University Student Association and serves as President of two residence halls within the Residential Housing Association. He previously held a Private Equity Search Fund Internship with Northern Purchase, LLC. Beyond academics and finance, Drew enjoys playing and watching a variety of sports, especially golf, soccer, and football.',
  '/Website Assets/Members/Fixed Income/Drew Lottier.png',
  true, 1
),
(
  'Jack McLaughlin', 'Fixed Income Analyst', 'Fixed Income',
  'jack.mclaughlin@student.fairfield.edu',
  'https://www.linkedin.com/in/jack-mclaughlin0/',
  'Jack McLaughlin is a sophomore double-majoring in Finance and Business Analytics at Fairfield University. He serves as a Fixed Income Analyst and is a founding member of the Portfolio Performance Group within the Fairfield Investment Group (FIG), where he supports quantitative and performance-driven analysis of the fund. Demonstrating strong entrepreneurial spirit, Jack is the Founder and President of the Fairfield Trading Group and the Co-Founder and COO of Stock Social, a social investing platform startup. This fall, he is gaining professional experience as a Private Equity Analyst Intern at Union Park Capital, supporting deal sourcing and LBO modeling. In his free time, Jack enjoys snowboarding, golf, poker, and rock climbing.',
  '/Website Assets/Members/Fixed Income/Jack McLaughlin.png',
  true, 1
),
(
  'Matthew Borella', 'Fixed Income Analyst', 'Fixed Income',
  'matthew.borella@student.fairfield.edu',
  'https://www.linkedin.com/in/matthew-borella-a39651292/',
  'Matthew Borella is a junior double-majoring in Finance and International Business at Fairfield University. He serves as a Fixed Income Analyst for the Fairfield Investment Group (FIG), where he conducts macroeconomic and company-specific research to support the student-managed portfolio. Matthew has gained professional experience through internships with Haymarket Media US, where he performed financial analysis, and as an Accounting Intern at Robert B. Borella, CPA. Outside the classroom, he is involved with the Investment Banking Society, Start Up Club, and Knights of Columbus. In his free time, Matthew enjoys working out, playing sports, and spending time with friends.',
  '/Website Assets/Members/Fixed Income/Matthew Borella.png',
  true, 1
),
(
  'Brian Reis', 'Fixed Income Analyst', 'Fixed Income',
  'brian.lourenco-reis@student.fairfield.edu',
  'https://www.linkedin.com/in/brianlreis',
  'Brian Reis is a sophomore double-majoring in Finance and Business Analytics with a minor in Marketing at Fairfield University. He is an active member of the Fairfield Investment Group (FIG), serving in the Fixed Income sector and contributing to research and portfolio monitoring. Brian is highly engaged in campus life as a class representative for the Fairfield University Student Association (FUSA). Demonstrating entrepreneurial drive, he founded his own e-commerce apparel company, Solvn, where he leads brand development and marketing. He also has professional experience as a Business Operations Manager, improving efficiency and supporting organizational growth. In his free time, Brian enjoys playing and watching sports, organizing competitive campus events, and designing promotional materials.',
  '/Website Assets/Members/Fixed Income/Brian Reis.png',
  true, 1
),
(
  'Ethan Thomas', 'Fixed Income Analyst', 'Fixed Income',
  'ethan.thomas@student.fairfield.edu',
  'https://www.linkedin.com/in/ethanthomas06',
  'Ethan Thomas is a sophomore double-majoring in Finance and Management at Fairfield University. He serves as a Fixed Income Analyst for the Fairfield Investment Group (FIG), contributing to portfolio strategy and providing macroeconomic overviews for the fund. Ethan previously interned as an Investment Analyst at Rice Heard & Bigelow, gaining hands-on experience in equity research and portfolio management. Outside of finance, he is an entrepreneurial leader and Co-Founder of Wellesley Home & Lawn, a residential landscaping business he launched and operated throughout high school, overseeing all operations and customer relations. His professional interests aim to combine capital markets with a long-term career in real estate. In his free time, Ethan enjoys fishing, boating, and skiing.',
  '/Website Assets/Members/Fixed Income/Ethan Thomas.png',
  true, 1
),

-- ── Healthcare ────────────────────────────────────────────────────
(
  'Thomas Fitzmaurice', 'Healthcare Portfolio Manager', 'Healthcare',
  'thomas.fitzmaurice@student.fairfield.edu',
  'http://linkedin.com/in/thomas-fitzmaurice',
  'Thomas Fitzmaurice is a junior double-majoring in Accounting and Finance at Fairfield University''s Dolan School of Business. He currently serves as the Portfolio Manager for the Healthcare Sector within the Fairfield Investment Group (FIG), successfully leading his analysts in stock pitches and sector strategy. Outside of FIG, Thomas is the President for the Class of 2027 on the Student Senate and chairs the Community Safety Committee. Professionally, he has secured an Audit Intern role in Financial Services with KPMG. In his free time, Thomas enjoys playing sports, going to the gym, and is a musician who plays the banjo, guitar, and piano, and is a member of a local bagpipe band in Fairfield.',
  '/Website Assets/Members/Healthcare/Thomas Fitzmaurice.png',
  true, 0
),
(
  'Drew Fitzgerald', 'Healthcare Analyst', 'Healthcare',
  'drew.fitzgerald@student.fairfield.edu',
  'https://www.linkedin.com/in/drew-fitzgerald-684259309/',
  'Drew Fitzgerald is a first-year sophomore double-majoring in Finance and Economics at Fairfield University''s Dolan School of Business. He serves as a Healthcare and Biotech Analyst for the Fairfield Investment Group (FIG), conducting due diligence and creating research materials to support investment decisions. Outside of the fund, Drew is the Vice President for Fairfield''s Public Speaking Club and a freelance author and editor for the biweekly newsletter Stagonomics. He is an Incoming Remote Private Equity Analyst for Union Park Capital. In his free time, Drew enjoys working out, relaxing at the beach, and mixing music on his DJ board.',
  '/Website Assets/Members/Healthcare/Drew Fitzgerald.png',
  true, 1
),
(
  'Preston Biedenkapp', 'Healthcare Analyst', 'Healthcare',
  'preston.biedenkapp@student.fairfield.edu',
  'https://www.linkedin.com/in/preston-biedenkapp/',
  'Preston Biedenkapp is a student at Fairfield University who serves as an Analyst in the Healthcare Sector for the Fairfield Investment Group (FIG). Outside of FIG, he is the Treasurer of the Accounting Club, a member of the Wrestling Club, and runs a charity initiative supporting Autism Speaks. Preston has gained professional experience through an Accounting Internship at Richard A. Fineli, CPA, a Private Equity Internship at Union Park Capital, and will be an Incoming Intern at Nassau Global Credit. Beyond academics and finance, he enjoys staying active through biking, wrestling, and rowing.',
  '/Website Assets/Members/Healthcare/Preston Biedenkapp.png',
  true, 1
),
(
  'Cooper Bateson', 'Healthcare Analyst', 'Healthcare',
  'cooper.bateson@student.fairfield.edu',
  'https://www.linkedin.com/in/cooper-bateson',
  'Cooper Bateson is a senior majoring in Finance with a minor in International Business at Fairfield University''s Dolan School of Business. He currently serves as an Analyst in the Healthcare Sector for the Fairfield Investment Group (FIG), conducting fundamental equity research and valuation. Cooper has held leadership roles on campus, including Finance Chair for Stagathon and serving as an Honors Program Mentor. Professionally, he has gained hands-on experience through internships with the Connecticut Judicial Branch and on the Treasury team at Wheels, Inc., an Apollo Global Management portfolio company. In his free time, Cooper enjoys weightlifting, playing basketball, and following financial markets.',
  '/Website Assets/Members/Healthcare/Cooper Bateson.png',
  true, 1
),
(
  'Brian Burke', 'Healthcare Analyst', 'Healthcare',
  'brian.burke1@student.fairfield.edu',
  'https://www.linkedin.com/in/brian-burke-3b35a629a/',
  'Brian Burke is a senior majoring in Finance with an Economics minor at Fairfield University, where he serves as a Healthcare Sector Analyst for the Fairfield Investment Group (FIG). He is dedicated to finance and investing, focusing his research efforts within the Healthcare sector. Brian is scheduled to intern as a Teaching Assistant for Knopman Marks in Summer 2025, further strengthening his technical finance foundation. Outside of his academic and finance pursuits, he enjoys bodybuilding, snowboarding, and cycling.',
  '/Website Assets/Members/Healthcare/Brian Burke.png',
  true, 1
),

-- ── Industrials & Materials ───────────────────────────────────────
(
  'Natalia Adamski', 'Industrials & Materials Portfolio Manager', 'Industrials & Materials',
  'natalia.adamski@student.fairfield.edu',
  'https://www.linkedin.com/in/natalia-adamski/',
  'Natalia Adamski is a Senior double-majoring in Finance and Accounting with a minor in Business Analytics. She joined the Fairfield Investment Group as an Analyst and now serves as the Industrials & Materials Sector Portfolio Manager (PM). Natalia was previously a Summer Analyst at UBS in their Asset Management division. Outside of FIG, she is an active member of the Finance Club and works as a Senior Admission Fellow for the university. After graduation, Natalia will pursue her Master of Science in Finance (MSF) at Boston College. In her free time, she enjoys reading psychological thrillers, shopping, and cooking.',
  '/Website Assets/Members/Industrials & Materials/Natalia Adamski.jpeg',
  true, 0
),
(
  'Juliana Elloian', 'Industrials & Materials Analyst', 'Industrials & Materials',
  'juliana.elloian@student.fairfield.edu',
  'https://www.linkedin.com/in/juliana-elloian/',
  'Juliana Elloian is a Junior double-majoring in Finance and Economics at Fairfield University. She serves as an Analyst in the Industrials & Materials Sector for the Fairfield Investment Group (FIG). Outside of the fund, she is the Vice President of the Economics Club, where she helps organize events and discussions connecting students with real-world economic issues. Passionate about markets, Juliana enjoys exploring the intersection of finance and policy through coursework and extracurricular involvement. In her free time, she enjoys playing tennis, golf, pickleball, and traveling.',
  '/Website Assets/Members/Industrials & Materials/Juliana Elloian.jpeg',
  true, 1
),
(
  'Sarah Gibney', 'Industrials & Materials Analyst', 'Industrials & Materials',
  'sarah.gibney@student.fairfield.edu',
  'https://www.linkedin.com/in/sarah-gibney/',
  'Sarah Gibney is a Junior double-majoring in Economics and Finance at Fairfield University''s Dolan School of Business, where she serves as an Industrial Analyst for the Fairfield Investment Group (FIG). She is currently a part-time Intern at Principal Financial Group, having successfully extended her summer Group Benefits Internship and looks forward to returning next summer. Sarah is also the President of the Fairfield University Economics Club, a member of the Dolan Student Advisory Board, and an active volunteer through the Service Leadership Council. In her free time, she enjoys surfing, spin classes, and traveling.',
  '/Website Assets/Members/Industrials & Materials/Sarah Gibney.png',
  true, 1
),
(
  'Joseph Knapik', 'Industrials & Materials Analyst', 'Industrials & Materials',
  'joseph.knapik@student.fairfield.edu',
  'https://www.linkedin.com/in/joseph-knapik/',
  'Joseph Knapik is a Senior at Fairfield University majoring in Accounting and International Business with a minor in French. He is an Analyst in the Industrials & Materials Sector for the Fairfield Investment Group (FIG) and is a member of the Fairfield Car Club. Joseph plans to continue his education to obtain his Master''s of Accounting and CPA, aiming for a career in corporate accounting. In his free time, Joseph enjoys playing guitar, playing poker, and learning languages.',
  '/Website Assets/Members/Industrials & Materials/Joey Knapik.png',
  true, 1
),
(
  'Luke Castanho', 'Industrials & Materials Analyst', 'Industrials & Materials',
  'luke.castanho@student.fairfield.edu',
  'https://www.linkedin.com/in/luke-c-castanho/',
  'Luke Castanho is a Sophomore Finance major and an Analyst in the Industrials & Materials Sector for the Fairfield Investment Group (FIG), where he researches market trends and presents potential investment opportunities. Last summer, Luke worked as a Field Marketing Representative for Accounting Connections, selling accounting products to small businesses across Central Connecticut. Other than FIG, he stays busy on campus by attending Startup Club and Finance Club events, participating in intramural sports, and lifting and running throughout the week. Luke''s favorite interests include listening to rock music (especially Boston and Led Zeppelin), watching the Pittsburgh Steelers, and watching Game of Thrones.',
  '/Website Assets/Members/Industrials & Materials/Luke Castanho.png',
  true, 1
),

-- ── Real Estate ───────────────────────────────────────────────────
(
  'Liam Collins', 'Real Estate Portfolio Manager', 'Real Estate',
  'liam.collins@student.fairfield.edu',
  'https://www.linkedin.com/in/liam-collins03/',
  'Liam Collins is a third-year student double-majoring in Management and Marketing at Fairfield University. He serves as the Real Estate Portfolio Manager (PM) for the Fairfield Investment Group, leading his sector to outperform the S&P 500. A successful entrepreneur, Liam is the Founder of Clean N'' Go Powerwashing, overseeing sales, fulfillment, and marketing. He is also highly involved in the Fairfield StartUp Competition, having won first place in 2025 and now serving as a mentor. Liam enjoys playing lacrosse, basketball, and guitar, and is passionate about studying entrepreneurship principles.',
  '/Website Assets/Members/Real Estate/Liam Collins.png',
  true, 0
),
(
  'Billy Ryan', 'Real Estate Analyst', 'Real Estate',
  'william.ryan@student.fairfield.edu',
  'https://www.linkedin.com/in/williamryan2/',
  'Billy Ryan is a Junior Finance major at Fairfield University, serving as an Analyst in the Fairfield Investment Group (FIG). He has gained professional experience as an Analyst Intern at both Union Park Capital and Yorkville Advisors. Outside of the investment group, he is an active member of the Investment Banking Society and the Finance Club. Billy also serves as a Manager for the basketball team and enjoys playing golf in his free time.',
  '/Website Assets/Members/Real Estate/Billy Ryan.png',
  true, 1
),
(
  'Caleb Birchem', 'Real Estate Analyst', 'Real Estate',
  'caleb.birchem@student.fairfield.edu',
  'https://www.linkedin.com/in/caleb-birchem/',
  'Caleb Birchem is a Senior double-majoring in Finance and Economics at Fairfield University. Within the Fairfield Investment Group (FIG), he is an Analyst in the Real Estate sector, contributing to equity research and market analysis. Caleb has gained hands-on experience in commercial real estate at Horvath & Tremblay and currently works in business development as a Sales Development Representative at GreenIRR, a carbon-accounting company. Outside of academics, Caleb is a member of the Club Baseball team at Fairfield University and spends an equal amount of time on the golf course.',
  '/Website Assets/Members/Real Estate/Caleb Birchem.png',
  true, 1
),
(
  'William Guider', 'Real Estate Analyst', 'Real Estate',
  'john.guider@student.fairfield.edu',
  'https://www.linkedin.com/in/william-guider-a60255327/',
  'William Guider is a Sophomore Finance major at the Dolan School of Business. He serves as an Analyst in the Real Estate sector for the Fairfield Investment Group (FIG) and is a Co-Founder of the Portfolio Performance sub-sector. Will is actively involved with other campus organizations, including the Finance Club, and is a writer for the freelance financial newsletter, Stagonomics. Outside of the investment group, Will is a member of the club golf team and enjoys visiting New York City.',
  '/Website Assets/Members/Real Estate/William Guider.png',
  true, 1
),
(
  'Nicholas Guariniello', 'Real Estate Analyst', 'Real Estate',
  'nicholas.guariniello@student.fairfield.edu',
  'https://www.linkedin.com/in/nicholas-guariniello',
  'Nicholas Guariniello is a Junior double-majoring in Accounting and Finance at Fairfield University, where he maintains a 3.98 GPA and is a Dean''s List scholar. He gained valuable professional experience as an Accounting and Finance Intern at Littlejohn & Co., a private equity firm, and will be joining Ernst & Young''s New York City office this summer as an Audit & Assurance Intern. On campus, he serves as an Office Assistant in the Dean''s Office of the Egan School of Nursing and is an active member of the Business Analytics and Start Up Clubs. Beyond his academic and professional endeavors, Nicholas enjoys participating in intramural sports, including volleyball, soccer, flag football, and kickball.',
  '/Website Assets/Members/Real Estate/Nicholas Guariniello.png',
  true, 1
),

-- ── Technology ────────────────────────────────────────────────────
(
  'Renata Bayazitova', 'Technology Portfolio Manager', 'Technology',
  'renata.bayazitova@student.fairfield.edu',
  'https://www.linkedin.com/in/renatabayazitova/',
  'Renata is a junior majoring in Finance and Business Analytics at Fairfield University and serves as the Technology Sector Portfolio Manager for the Fairfield Investment Group. Outside of FIG, she''s involved in the Startup Club and enjoys trips to New York City, yoga, shopping with friends, and exploring new coffee shops. Her previous experience includes a Summer 2025 Affiliate Product Strategy Intern at Affiliate Managers Group (AMG), and she is an Incoming Summer 2026 Equity Research Intern at Barclays.',
  '/Website Assets/Members/Technology/Renata Bayazitova.png',
  true, 0
),
(
  'Matthew Celentano', 'Technology Analyst', 'Technology',
  'matthew.celentano@student.fairfield.edu',
  'https://www.linkedin.com/in/matthew-celentano03',
  'Matthew Celentano is a Finance and Accounting double major at Fairfield University. He serves as an Analyst in the Tech Sector for the Fairfield Investment Group (FIG). Matthew deepened his involvement in the university community by supporting alumni entrepreneurs through Lantern Point Labs and working as an editor for the Apollon Journal. His previous experience includes an Equity Research Internship at Gabelli Funds, and he is an Incoming Audit Intern at Forvis Mazars. Outside of his work, Matthew enjoys reading, playing golf, and skiing.',
  '/Website Assets/Members/Technology/Matthew Celentano.png',
  true, 1
),
(
  'Lila Sullivan', 'Technology Analyst', 'Technology',
  'lila.sullivan@student.fairfield.edu',
  'https://www.linkedin.com/in/lilacsullivan',
  'Lila Sullivan is a Senior majoring in Finance with a minor in Marketing. She is an Analyst in the Technology sector for the Fairfield Investment Group (FIG). Lila has extensive professional experience, including internships with the Private Client Group at Janney Montgomery Scott and as a Legal Intern. She previously interned at MONECO Advisors (wealth management) and has accepted a full-time Relationship Manager position there following her graduation in May 2026. In her free time, Lila enjoys skiing, golfing, spending time at the beach, and hanging out with friends, family, and her dogs.',
  '/Website Assets/Members/Technology/Lila Sullivan.png',
  true, 1
),
(
  'Mark Costolo', 'Technology Analyst', 'Technology',
  'william.costolo@student.fairfield.edu',
  'https://www.linkedin.com/in/mark-costolo/',
  'Mark Costolo is a Sophomore Honors Student pursuing a Bachelor of Science in Mathematics and Business Economics at Fairfield University. He serves as a Technology, Media, and Telecommunications Analyst for the Fairfield Investment Group (FIG) and is part of the portfolio performance group. Mark is an active member of the Investment Banking Society, where he was a finalist in the M&A case competition. He has gained experience in both private equity (Union Park Capital) and corporate development (Primoris Services Corporation) and passed the SIE exam in August. Beyond finance, Mark volunteers with the Boys and Girls Club of Bridgeport and enjoys speed chess, lifting weights, and collecting historical artifacts.',
  '/Website Assets/Members/Technology/Mark Costollo.png',
  true, 1
),
(
  'Charlie Brenneman', 'Technology Analyst', 'Technology',
  'charles.brenneman@student.fairfield.edu',
  'https://www.linkedin.com/in/charlie-brenneman-872731324/',
  'Charlie Brenneman is a Sophomore pursuing a major in Finance and a minor in Data Analytics. He is an Analyst in the Tech sector for the Fairfield Investment Group (FIG) and is a Co-Founder of the Portfolio Performance Group, where he helps conduct data-driven analyses of portfolio performance. Charlie is an Incoming Wealth Management Intern at Morgan Stanley, focused on developing his understanding of portfolio strategy and client relations. He continues to deepen his interest in financial markets, with a particular focus on Sales & Trading and Capital Markets. In his free time, he enjoys golf, sailing, and exploring the intersection between data and investing.',
  '/Website Assets/Members/Technology/Charlie Brenneman.png',
  true, 1
),

-- ── Marketing ─────────────────────────────────────────────────────
(
  'Kate Wittenauer', 'Marketing Team Member', 'Marketing',
  'kathryn.wittenauer@student.fairfield.edu',
  'https://www.linkedin.com/in/kathryn-wittenauer',
  'Kate Wittenauer is a student at Fairfield University who will be joining Conair LLC in Summer 2025 as a Product Marketing Intern. She is a member of the Marketing Team for the Fairfield Investment Group (FIG).',
  '/Website Assets/Members/Marketing/Kathryn Wittenauer.png',
  true, 1
),
(
  'Kaitlyn Curcy', 'Marketing Team Member', 'Marketing',
  'Kaitlyn.Curcy@student.fairfield.edu',
  'https://www.linkedin.com/in/kaitlyncurcy',
  'Kaitlyn Curcy is a Junior double-majoring in Public Relations and Sports Media with a minor in Marketing. She is a founding member of the Marketing Team for the Fairfield Investment Group (FIG), helping shape the organization''s brand voice. Kaitlyn currently serves as a Content Strategy Intern for Fairfield Athletics and is the Social Media and Marketing Coordinator for the Fairfield Family Business Club. Last summer, she gained valuable experience through an Accounts Team Internship with Pursuit in NYC luxury real estate advertising. In her free time, she enjoys watching football, listening to music, and spending time with family and friends.',
  '/Website Assets/Members/Marketing/Kaitlyn Curcy.png',
  true, 1
),
(
  'Reiley Walsh', 'Marketing Committee Member', 'Marketing',
  'reiley.walsh@student.fairfield.edu',
  'https://www.linkedin.com/in/reileywalsh',
  'Reiley Walsh is a Junior double-majoring in Marketing and Finance at the Dolan School of Business. She is an active member of the Marketing Committee in the Fairfield Investment Group (FIG), where she assists in creating content for their LinkedIn page and posting the "Stag Market" Newsletter weekly. Reiley previously completed a Marketing Internship in the Fairfield University Athletics Department and remains involved by assisting at athletic events. She will be completing a marketing internship in Florence, Italy, during her study abroad next semester. In her free time, Reiley enjoys spending time at the beach, traveling, and surrounding herself with family and friends.',
  '/Website Assets/Members/Marketing/Reiley Walsh.png',
  true, 1
);
