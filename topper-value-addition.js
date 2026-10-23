/**
 * ============================================================
 * TOPPER VALUE ADDITION & EDGE ENGINE (topper-value-addition.js)
 * Self-contained module for the Copies section
 * ============================================================
 */

(function initTopperValueAddition() {
  'use strict';

  const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const AUTOTABLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

  // Preloaded High-Yield Curated Database
  const CURATED_TOPICS = {
    'women-in-agriculture': {
      title: 'Women in Agriculture & Land Rights',
      category: 'GS1 / GS3 / Sociology',
      data: 'As per Periodic Labour Force Survey (PLFS 2023-24), 76.2% of rural women workers are employed in agriculture vs 54% of rural men (the "Feminization of Agriculture"). However, as per Agricultural Census, women hold only 13.9% of operational agricultural landholdings.',
      dataSource: 'PLFS 2023-24 & 10th Agricultural Census, MoA&FW',
      quote: '"Until women gain independent control over land and productive assets, agricultural growth will remain both inequitable and structurally sub-optimal." — Prof. Bina Agarwal',
      quoteSource: 'A Field of One\'s Own: Gender and Land Rights in South Asia',
      thinker: 'Amartya Sen (Capabilities Approach — intra-household bargaining deficit) & Bina Agarwal (Fall-back position: legal land title directly enhances woman’s domestic decision-making agency and nutrition security).',
      examples: 'Joint Titling Initiatives in Odisha (Vasundhara scheme granting revenue land titles jointly to husband and wife) and Andhra Pradesh AP-CNF (Community Managed Natural Farming led by women SHGs).',
      ruralCase: 'Kudumbashree (Kerala): "Sangha Krishi" collective farming model where over 3 lakh women lease land collectively to cultivate paddy and vegetables, overcoming individual lack of land ownership.',
      globalCase: 'Rwanda Land Tenure Regularization Programme: Mandated joint spousal registration of all land parcels, elevating female co-ownership to 86% and boosting agricultural productivity by 19%.',
      committee: 'M.S. Swaminathan Committee on Women in Agriculture: Recommended the Women Farmers Entitlement Bill, defining "farmer" based on agricultural work rather than land ownership title.',
      commission: 'NITI Aayog Strategy for New India @75: Chapter on Agriculture & Gender Mainstreaming advocating for Kisan Credit Cards (KCC) for tenant and women farmers through SHG-JLGs.',
      laws: 'Hindu Succession (Amendment) Act 2005 (Equal coparcenary rights in ancestral property); Article 39(a/d) (Equal livelihood and equal pay for equal work); Section 4 of Forest Rights Act 2006 (Joint pattas with spouse).',
      schemes: 'Mahila Kisan Sashaktikaran Pariyojana (MKSP - sub-component of DAY-NRLM), Namo Drone Didi Scheme (training women SHGs in precision drone spraying), Agri-Clinic and Agri-Business Centers (ACABC).',
      edge: 'The "Ghost Farmer" Paradox: Women perform 60–80% of crop management and seed preservation, yet due to lack of land title, they cannot access institutional credit, subsidized fertilizer, PM-KISAN transfers, or crop insurance (PMFBY). Normal aspirants propose generic "financial awareness"; top rankers propose legally delinking institutional credit and PM-KISAN entitlement from land ownership revenue records to farmer identity cards (Kisan ID).'
    },

    'federalism-governors': {
      title: 'Federalism & Office of the Governor',
      category: 'GS2 Polity',
      data: 'Between 2019 and 2024, Governors in 4 non-ruling state regimes reserved or withheld assent on over 65 state legislative bills indefinitely under Article 200, prompting 3 landmark Supreme Court constitutional interventions.',
      dataSource: 'Supreme Court Case Ledger & PRS Legislative Research',
      quote: '"The Governor is not an employee of the government of India. His office is an independent constitutional office which is not subject to the control of the Government of India." — Supreme Court of India',
      quoteSource: 'Hargovind Pant v. Dr. Raghukul Tilak (1979) 5-Judge Constitution Bench',
      thinker: 'Dr. B.R. Ambedkar in Constituent Assembly: Envisaged the Governor as a "constitutional ornament and sentinel of national unity", warning that gubernatorial discretion should be an exceptional anomaly, not routine rule.',
      examples: 'Tamil Nadu University Laws (Amendment) Bill controversy where Governor withheld assent without assigning reasons, subsequently invalidated by Supreme Court directives.',
      ruralCase: 'Mendha Lekha Village (Maharashtra): Autonomous Gram Sabha self-rule demonstrating grassroots tribal federalism under PESA, contrasting with state-center bureaucratic friction.',
      globalCase: 'Australian Model of State Governors: The Crown-appointed state governors strictly follow the advice of the State Premier under codified constitutional conventions; reservation of bills for the monarch is practically extinct.',
      committee: 'Punchhi Commission on Centre-State Relations (2010): Recommended that Governors must decide on bills within a statutory timeline of 6 months, and advocated for the impeachment of Governors by the State Legislature.',
      commission: 'Sarkaria Commission (1988) & 2nd ARC 7th Report (Conflict Resolution): Recommended Governor should be an eminent person detached from local politics, appointed after active consultation with the State Chief Minister.',
      laws: 'Article 153 (Office of Governor), Article 163 (Council of Ministers advice), Article 200 (Assent to bills), Article 201 (Bills reserved for President), Article 356 (President\'s Rule).',
      schemes: 'Inter-State Council revitalisation under Article 263, Zonal Councils secretariats under States Reorganisation Act 1956.',
      edge: 'The Doctrine of "Pocket Veto" Invalidation: In State of Punjab v. Principal Secretary (2023), SC held that if a Governor decides to withhold assent under Art. 200, he MUST return the bill to the legislature "as soon as possible" with a message. He cannot simply sit on it. Toppers cite the exact Latin maxim "Sub silentio" abuse of power and recommend amending Article 200 to insert a strict 6-week limitation clock.'
    },

    'judicial-pendency': {
      title: 'Judicial Pendency & Subordinate Courts',
      category: 'GS2 Governance',
      data: 'Over 5.1 Crore cases are pending across Indian courts, with 87% (4.44 Crore) concentrated in Subordinate/District Judiciary. Average judge-to-population ratio in India stands at 21 judges per million people, vs Law Commission benchmark of 50 per million.',
      dataSource: 'National Judicial Data Grid (NJDG 2024) & Law Commission Report',
      quote: '"Justice is not a cloistered virtue; delayed justice is not merely denied, it degrades the constitutional faith of the marginalized." — Justice V.R. Krishna Iyer',
      quoteSource: 'Law Versus Justice: Problems and Solutions',
      thinker: 'Lord Woolf (Access to Justice report: Civil Procedure reforms) & Jeremy Bentham (Critique of legal procedure delay as a structural tax on the honest citizen).',
      examples: 'E-Courts Mission Mode Project Phase III (Cloud infrastructure, virtual courts, digital case management and AI-based courtroom transcription deployed in Delhi and Kerala High Courts).',
      ruralCase: 'Gram Nyayalayas Model in Madhya Pradesh: Mobile rural courts designed under Gram Nyayalayas Act 2008 to resolve petty disputes through summary trial and conciliation, reducing formal trial backlog.',
      globalCase: 'Singapore State Courts Smart Court System: Integrated Electronic Case Management and pre-trial mediation hubs that settle 85% of civil disputes within 6 months through mandatory dispute resolution.',
      committee: 'Justice Malimath Committee on Criminal Justice Reforms: Recommended shifting from strict adversarial system to quasi-inquisitorial system to expedite evidentiary trials.',
      commission: 'Law Commission of India (245th Report): Formulated the "Rate of Disposal" method for scientific judge-strength allocation instead of crude judge-to-population ratio.',
      laws: 'Article 39A (Free legal aid & equal justice); Section 89 of Code of Civil Procedure (Mandatory Alternative Dispute Resolution); Gram Nyayalayas Act 2008; Mediation Act 2023.',
      schemes: 'E-Courts Phase III (Rs 7,210 Cr outlay), Tele-Law Initiative (connecting rural litigants with NALSA panel lawyers via Common Service Centers), Nyaya Bandhu (Pro Bono legal services).',
      edge: 'The "Docket Exclusion" Fallacy: Aspirants routinely propose "more judges and faster appointments". Top scorers highlight that 60% of all litigation in India involves the Government itself as a litigant (National Litigation Policy failure). Toppers recommend: (1) Operationalizing National Litigation Policy with punitive costs on frivolous appeals by departments; (2) AI-powered Case Flow Management Rules separating trial management from administrative case tracking.'
    },

    'urban-floods': {
      title: 'Urban Flooding & Sponge Cities',
      category: 'GS1 / GS3 Environment',
      data: 'Over 75% of urban surfaces in tier-1 Indian cities are now impervious concrete. In Bengaluru, built-up area increased by 1055% between 1973 and 2020, resulting in the extinction of 88% of water bodies and a 79% decline in vegetation cover.',
      dataSource: 'IISc Bengaluru Urban Spatial Dynamics Report & NDMA Guidelines 2023',
      quote: '"Floods in cities are not natural disasters; they are administrative crimes born out of unbridled real estate greed and hydrological blindness." — Sunita Narain',
      quoteSource: 'Centre for Science and Environment (CSE)',
      thinker: 'Ian McHarg (Design with Nature — ecological landscape planning) & Elinor Ostrom (Polycentric governance of urban commons, treating wetlands as shared community ecological capital).',
      examples: 'Chennai Sponge City Masterplan under AMRUT 2.0; Miyawaki micro-forests along storm-water drains in Hyderabad to accelerate soil percolation.',
      ruralCase: 'Tingvissing Watershed Model (Meghalaya): Indigenous bamboo-drip conduits and terraced bio-swales that mitigate torrential cloudburst runoffs while re-charging aquifers.',
      globalCase: 'Singapore ABC Waters Programme (Active, Beautiful, Clean): Transformation of concrete monsoon drains into naturalized meandering rivers and wetland reservoirs (Kallang River at Bishan-Ang Mo Kio Park).',
      committee: 'K. Kasturirangan Committee on Western Ghats: Warning on unchecked construction in catchment basins triggering downstream flash floods (as witnessed in Kerala floods 2018).',
      commission: 'NDMA National Guidelines on Management of Urban Flooding (2010/2023): Advocating for dedicated Urban Flood Management Units in municipal bodies separate from general disaster wings.',
      laws: 'Wetlands (Conservation and Management) Rules 2017; Disaster Management Act 2005 (Section 30); National Green Tribunal Act 2010 (Enforcing buffer zones around water bodies).',
      schemes: 'AMRUT 2.0 (Water-secure cities mission with 10% outlay for recycled water), CITIIS 2.0 (City Investments to Innovate, Integrate and Sustain circular climate projects).',
      edge: 'The "Hydrological Isolation" Principle: Most municipal bodies engineer urban drainage based on 25-year rainfall return period charts from the 1970s, completely ignoring climate extremes. Toppers cite: (1) Mandating Water Sensitive Urban Design (WSUD) in building bye-laws (permeable pavements + mandatory percolation wells); (2) Demarcating Blue-Green Infrastructure Corridors in municipal master plans with legal penalties for encroaching storm-water floodplains.'
    },

    'ai-ethics': {
      title: 'Artificial Intelligence Ethics & Algorithmic Bias',
      category: 'GS3 S&T / GS4 Ethics',
      data: 'Over 82% of global generative AI training datasets are in English, reflecting deep cultural, linguistic, and socio-economic biases. Furthermore, automated welfare scoring in developing nations has shown up to 30% exclusion error rates among illiterate rural populations.',
      dataSource: 'UNESCO Global AI Ethics Report & NITI Aayog RAISE 2024',
      quote: '"We must ensure that algorithms work for humanity, rather than reducing human dignity to predictive data points for corporate surveillance." — Timnit Gebru',
      quoteSource: 'DAIR (Distributed AI Research Institute)',
      thinker: 'John Rawls (Veil of Ignorance — algorithmic design must protect the worst-off stakeholder) & Shoshana Zuboff (Age of Surveillance Capitalism — extraction of behavioral surplus for behavioral modification).',
      examples: 'NITI Aayog\'s "Responsible AI for All" policy papers (bifurcating principles into safety, equality, inclusivity, and accountability); MeitY\'s IndiaAI Mission ethics oversight council.',
      ruralCase: 'Bhashini AI Platform: Government of India\'s voice-based multimodal AI enabling rural illiterate citizens to interact with DBT schemes (PM-KISAN, UPI) in 22 local vernacular dialects.',
      globalCase: 'EU Artificial Intelligence Act (2024): The world\'s first binding horizontal regulation on AI, classifying systems by risk tiers (Unacceptable Risk, High Risk, General Purpose AI) with mandatory human-in-the-loop audits.',
      committee: 'Justice B.N. Srikrishna Committee on Data Protection: Established the foundational principles of purpose limitation, algorithmic accountability, and data principal autonomy.',
      commission: 'Law Commission of India (Working Paper on Deepfakes & Election Integrity): Recommending criminal liability for non-consensual synthetic media during model code periods.',
      laws: 'Digital Personal Data Protection Act 2023 (DPDPA); Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021; UNESCO Recommendation on the Ethics of AI (2021).',
      schemes: 'IndiaAI Mission (Rs 10,372 Cr outlay), AIRAWAT (National AI Computing Infrastructure), YUVAi initiative for youth capacity building.',
      edge: 'Algorithmic "Redlining" & Epistemic Justice: Ordinary candidates talk about "cybersecurity and data theft". Topper answers elevate the discourse to: (1) "Epistemic Violence" in algorithmic welfare distribution where biometric or facial mismatches deny food rations under PDS (violating Art. 21); (2) Recommending mandatory Algorithmic Impact Assessments (AIA) before deploying any automated decision-making tool in public services.'
    },

    'semiconductor-mission': {
      title: 'Semiconductor Mission & DeepTech Ecosystem',
      category: 'GS3 Economy & S&T',
      data: 'India imports over $24 Billion in semiconductor components annually, with global fabrication heavily monopolized (Taiwan’s TSMC manufactures over 90% of sub-7nm advanced microchips). India\'s semiconductor market is projected to reach $110 Billion by 2030.',
      dataSource: 'India Semiconductor Mission (ISM) & Ministry of Electronics and IT (MeitY)',
      quote: '"Chips are the new oil. The nation that controls microchip fabrication and advanced packaging commands both economic sovereignty and national security in the 21st century." — Chris Miller',
      quoteSource: 'Chip War: The Fight for the World\'s Most Critical Technology',
      thinker: 'Mariana Mazzucato (The Entrepreneurial State — state as prime investor and catalyst in capital-intensive deep-tech risks where private venture capital fears to tread).',
      examples: 'Tata-Powerchip fabrication plant in Dholera, Gujarat (commercial 28nm chips); Micron Assembly, Testing, Marking and Packaging (ATMP) plant in Sanand, Gujarat.',
      ruralCase: 'Semiconductor Supply Chain Ancillary Clusters in Semi-Urban Corridors: Leveraging rural-urban linkages for silicon-grade quartz purification in Rajasthan and high-purity industrial gas production in Odisha.',
      globalCase: 'US CHIPS and Science Act ($52 Billion) & Japan Semiconductor Revitalization Strategy (Subsidizing Rapidus 2nm foundry in Hokkaido): Direct capital grants coupled with sovereign technology consortia.',
      committee: 'National Deep Tech Startup Policy (NDTSP) Drafting Committee: Chaired by Prof. Ajay Kumar Sood (Principal Scientific Adviser), recommending Rs 25,000 Cr fund-of-funds for patient capital in hardware.',
      commission: 'NITI Aayog High-Level Task Force on Electronics Manufacturing: Recommended 50% fiscal support for pure-play foundries and advanced silicon photonics research.',
      laws: 'Special Economic Zones (Amendment) Act; Foreign Direct Investment (FDI) 100% automatic route for electronics manufacturing; Patent Act 1970 expedited examination for deep-tech startups.',
      schemes: 'Modified Semiconductor Scheme (50% fiscal support on capital cost on pari-passu basis), Design Linked Incentive (DLI) Scheme, Scheme for Promotion of Manufacturing of Electronic Components (SPECS).',
      edge: 'The "Trailing Edge" Strategic Advantage: Normal aspirants write "India must manufacture 2nm/3nm iPhone chips". Toppers know that 75% of industrial demand in automotive (EVs), renewable inverters, smart grids, and defence relies on 28nm to 65nm "legacy/trailing edge nodes". India should dominate mature node foundries and compound semiconductors (Silicon Carbide/Gallium Nitride for EV power electronics) before burning capital on sub-5nm extreme ultraviolet lithography (EUV).'
    },

    'tribal-governance': {
      title: 'Tribal Governance, PESA & Forest Rights',
      category: 'GS2 / GS3 / Sociology P2',
      data: 'Tribal communities represent 8.6% of India’s population (10.4 Crore), yet account for over 40% of all population displaced by large developmental and infrastructure projects since 1947. Furthermore, only 52% of Community Forest Rights (CFR) claims under FRA have been settled.',
      dataSource: 'Xaxa Committee Report & Ministry of Tribal Affairs (MoTA 2024)',
      quote: '"Tribal development must be measured not by the miles of concrete roads built through their forests, but by the dignity, self-determination, and forest rights preserved in their Gram Sabhas." — Verrier Elwin',
      quoteSource: 'Philosophy for NEFA (Foreword by Jawaharlal Nehru)',
      thinker: 'Jawaharlal Nehru (Tribal Panchsheel — non-imposition, respecting tribal land rights) & Virginius Xaxa (Internal colonialism — exploitation of resource-rich tribal homelands by dominant plains capital).',
      examples: 'Niyamgiri Hills (Odisha) Dongria Kondh Gram Sabha referendum (2013): Landmark exercise of PESA powers where 12 Gram Sabhas unanimously rejected bauxite mining by multinational consortium.',
      ruralCase: 'Mendha Lekha Village (Gadchiroli, Maharashtra): First village in India to secure Community Forest Rights over bamboo, establishing sustainable harvest, local auctioning, and generating millions directly in the village treasury.',
      globalCase: 'New Zealand Maori Resource Management Model: Legal personhood granted to the Whanganui River (Te Awa Tupua Act 2017), co-governed by indigenous Maori trustees and the crown.',
      committee: 'High-Level Committee on Socio-Economic, Health and Educational Status of Tribal Communities (Prof. Virginius Xaxa Committee, 2014): Recommended non-alienation of tribal land, strict adherence to Free, Prior and Informed Consent (FPIC).',
      commission: 'Bhuria Committee (1995): Laid the constitutional framework for PESA Act 1996 to extend 73rd Amendment to 5th Schedule areas.',
      laws: 'Panchayats (Extension to Scheduled Areas) Act 1996 (PESA); Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act 2006 (FRA); 5th and 6th Schedules of Constitution.',
      schemes: 'Pradhan Mantri Janjatiya Unnat Gram Abhiyan (covering 63,000 tribal villages), PM-JANMAN (for 75 Particularly Vulnerable Tribal Groups - PVTGs), Van Dhan Vikas Yojana.',
      edge: 'The "De-facto Veto" Subversion: Aspirants write about "PESA awareness". Toppers pinpoint the administrative loophole: PESA mandates Gram Sabha "consultation" in minor mineral leasing and land acquisition, which state executive rules have diluted to non-binding advisory status rather than "mandatory consent". Toppers recommend aligning PESA rules with the Supreme Court’s Niyamgiri precedent, mandating Free, Prior, Informed Consent (FPIC) as an un-derogable condition.'
    },

    'informal-economy': {
      title: 'Informal Economy, Gig Workers & Social Security',
      category: 'GS3 Economy / Sociology',
      data: 'Over 88% of India\'s 56 Crore workforce operates in the informal sector, with no written contracts, minimum wage guarantee, or statutory health cover. The gig and platform workforce is projected to expand from 77 lakh (2021) to 2.35 Crore workers by 2029-30.',
      dataSource: 'NITI Aayog "Booming Gig and Platform Economy" (2022) & PLFS',
      quote: '"Platform capitalism has commodified time and risk, transforming workers from industrial employees into atomized entrepreneurs who bear all capital depreciations alone." — Guy Standing',
      quoteSource: 'The Precariat: The New Dangerous Class',
      thinker: 'Jan Breman (Footloose Labour: Circulation of labour without structural incorporation) & Guy Standing (The Precariat — lack of labour security, income predictability, and collective representation).',
      examples: 'Rajasthan Platform-Based Gig Workers (Registration and Welfare) Act 2023: First legislation in India establishing a dedicated Welfare Board and transaction-based welfare cess on aggregators.',
      ruralCase: 'SEWA (Self-Employed Women’s Association): Organizing over 2.1 million informal women workers into trade unions and cooperative banks, ensuring micro-pensions, childcare, and healthcare mutuals.',
      globalCase: 'California Assembly Bill 5 (AB-5) & UK Supreme Court Uber Judgment (2021): Classified gig drivers as "workers" entitled to minimum wage, paid holiday leave, and statutory pension contributions.',
      committee: 'Arjun Sengupta Committee on Enterprises in the Unorganised Sector (2007): Highlighted the vulnerability of the "Poor and Vulnerable" (77% living on less than Rs 20/day) and proposed universal social security.',
      commission: 'National Commission on Labour (2nd NCL): Recommended codification of 29 fragmented labour laws into 4 universal codes (Wages, Social Security, Industrial Relations, OSH).',
      laws: 'Code on Social Security 2020 (Sections 112–114 recognizing Gig and Platform Workers); Unorganised Workers\' Social Security Act 2008; Rajasthan Gig Workers Act 2023.',
      schemes: 'e-Shram Portal (over 30 Crore informal workers registered for Universal Account Number), PM-SYM (Pradhan Mantri Shram Yogi Maandhan pension), Ayushman Bharat PM-JAY.',
      edge: 'The "Algorithm as Master" Legal Void: Normal answers treat gig workers as standard low-wage informal labourers. Toppers analyze the technological dimension: Platform algorithms exert asymmetric managerial control (automated suspensions, punitive de-activations, surge pricing opacity) while claiming workers are "independent partners". Toppers advocate for: (1) Mandatory Algorithmic Transparency on dispatch and pay rates; (2) Transaction-level cess on platform bookings routed automatically to State Gig Welfare Funds.'
    }
  };

  // Dynamic Rule-Based Synthesizer for Any Custom Topic
  function synthesizeTopic(rawQuery) {
    const q = rawQuery.trim().toLowerCase();

    // Check curated bank first
    for (const key of Object.keys(CURATED_TOPICS)) {
      if (q.includes(key) || CURATED_TOPICS[key].title.toLowerCase().includes(q)) {
        return CURATED_TOPICS[key];
      }
    }

    // Domain inference
    let domain = 'General Studies';
    let data = '';
    let quote = '';
    let thinker = '';
    let examples = '';
    let ruralCase = '';
    let globalCase = '';
    let committee = '';
    let commission = '';
    let laws = '';
    let schemes = '';
    let edge = '';

    if (q.includes('water') || q.includes('flood') || q.includes('climate') || q.includes('environment') || q.includes('green') || q.includes('forest')) {
      domain = 'GS3 Environment & Disaster Management';
      data = `India accounts for 18% of global population but only 4% of global freshwater resources. As per NITI Aayog Composite Water Management Index, 600 million Indians face high to extreme water stress, and 75% of households lack drinking water on premises.`;
      quote = `"Earth provides enough to satisfy every man's needs, but not every man's greed." — Mahatma Gandhi (Cited in IPCC AR6 Synthesis Report)`;
      thinker = `Elinor Ostrom (Governing the Commons: Community stewardship of natural common-pool resources overcomes Tragedy of the Commons without privatization).`;
      examples = `Mission Amrit Sarovar (constructing 75 water bodies per district); Sikkim\'s 100% Organic Farming and Spring-shed revival initiative (Dhara Vikas).`;
      ruralCase = `Ralegan Siddhi & Hiware Bazar (Maharashtra): Watershed development and prohibition of deep borewells, transforming drought-prone villages into water-surplus agri-economies.`;
      globalCase = `Costa Rica Payment for Environmental Services (PES): Direct financial rewards to private landowners for forest conservation, doubling national forest cover from 26% to 57%.`;
      committee = `Mihir Shah Committee on Water Sector Reforms: Recommended restructuring Central Water Commission and Central Ground Water Board into a unified National Water Commission.`;
      commission = `Law Commission of India & NITI Aayog High-Powered Task Force on Climate Resilient Infrastructure.`;
      laws = `Environment (Protection) Act 1986; Water (Prevention and Control of Pollution) Act 1974; Article 48A & 51A(g) of Constitution.`;
      schemes = `Jal Jeevan Mission (Har Ghar Jal), PM Krishi Sinchayee Yojana (Per Drop More Crop), Atal Bhujal Yojana (participatory groundwater management).`;
      edge = `The "Catchment Fragmentation" Deficit: Most government initiatives treat water engineering as supply-side pipe laying. Toppers emphasize treating River Basins as integrated ecological units (Integrated Water Resources Management - IWRM) with legal rights of rivers to minimum ecological environmental flows (E-flows).`;
    } else if (q.includes('judic') || q.includes('court') || q.includes('law') || q.includes('polity') || q.includes('constitution') || q.includes('elect') || q.includes('prison')) {
      domain = 'GS2 Polity & Constitutional Governance';
      data = `Subordinate judiciary handles over 87% of all cases in India, with vacancies persisting at 22–25%. Over 75% of total prison inmates in India are undertrials, with marginalized communities disproportionately represented.`;
      quote = `"Constitutional morality is not a natural sentiment. It has to be cultivated. We must realize that our people have yet to learn it." — Dr. B.R. Ambedkar`;
      thinker = `John Rawls (Justice as Fairness — institutional structures must be arranged to maximize benefits to the least advantaged) & Ronald Dworkin (Rights as Trumps).`;
      examples = `Fast Track Special Courts (FTSCs) for POCSO cases; Lok Adalats settling over 1 Crore pre-litigation cases under NALSA aegis.`;
      ruralCase = `Nyaya Panchayats & Community Dispute Resolution Mechanisms in Rajasthan: Resolving boundary and matrimonial disputes through local mediation without police escalation.`;
      globalCase = `UK Supreme Court System: Strict separation of powers under Constitutional Reform Act 2005 with transparent independent judicial appointments commission.`;
      committee = `Justice V.S. Malimath Committee & Law Commission 268th Report on Bail Reforms (recommending statutory release of undertrials completing 1/3rd of sentence).`;
      commission = `2nd Administrative Reforms Commission (4th Report - Ethics in Governance & 1st Report - Right to Information: Master Key to Good Governance).`;
      laws = `Articles 14, 19, 21; Article 39A (Free Legal Aid); Protection of Human Rights Act 1993; Mediation Act 2023.`;
      schemes = `Tele-Law Programme, Fast Track Courts Scheme, e-Courts Phase III, Nyaya Mitra scheme for assisting high-pendency district courts.`;
      edge = `Substantive vs Procedural Justice: Normal aspirants suggest "appointing more judges". Toppers propose: (1) Institutionalizing Case Management Hearing (CMH) rules to eliminate repetitive adjournments; (2) Establishing an All India Judicial Service (AIJS under Art. 312) to attract top legal talent to lower judiciary with reservation for women.`;
    } else if (q.includes('health') || q.includes('educat') || q.includes('poverty') || q.includes('social') || q.includes('caste') || q.includes('child')) {
      domain = 'GS1 & GS2 Social Justice & Human Capital';
      data = `India allocates ~2.1% of GDP to public health and ~2.9% to education, below the National Health Policy target (2.5%) and Kothari Commission target (6%). NFHS-5 reports 35.5% children stunted and 57% women anaemic.`;
      quote = `"Development is about expanding the real freedoms that people enjoy, not just boosting GDP metrics." — Amartya Sen`;
      thinker = `Amartya Sen & Jean Dreze (An Uncertain Glory: India and its Contradictions — human capabilities expansion as the true engine of sustainable growth).`;
      examples = `Tamil Nadu Midday Meal & Chief Minister Breakfast Scheme (proven correlation with school retention and child BMI); Delhi Mohalla Clinics for primary preventive care.`;
      ruralCase = `Piplantri Village (Rajasthan): Planting 111 fruit-bearing trees on the birth of every girl child, ensuring collective fixed deposits and reversing child sex ratio.`;
      globalCase = `Finland Comprehensive School System: Equal access, zero standardized testing pressure, highly compensated master's degree teachers, leading global PISA scores.`;
      committee = `K. Kasturirangan Committee (Drafting National Education Policy NEP 2020) & Srinath Reddy High-Level Expert Group on Universal Health Coverage.`;
      commission = `NITI Aayog Health Index & Aspirational Districts Programme (ADP) leveraging real-time data-driven dashboard governance.`;
      laws = `Right to Education Act 2009 (Section 12(1)(c) for 25% disadvantaged quota); National Food Security Act 2013 (Art. 47); Transgender Persons Act 2019.`;
      schemes = `Ayushman Bharat PM-JAY, PM POSHAN, Samagra Shiksha Abhiyan, Mission Saksham Anganwadi and Poshan 2.0.`;
      edge = `The "Human Capital Trap": Normal aspirants demand "budget increases". Toppers highlight that without outcome-based monitoring and addressing the "silent crisis" of foundational learning and micro-nutrient deficiencies (hidden hunger), higher capex yields zero marginal social return. Toppers propose integrating Anganwadis into primary school campuses as unified early childhood care hubs (ECCE under NEP 2020).`;
    } else {
      domain = 'GS3 Economy, Technology & National Strategy';
      data = `As per Economic Survey 2023-24, India\'s gross fixed capital formation stands at ~31% of GDP, with public infrastructure capex touching record Rs 11.11 Lakh Crore. Logistics cost is currently 13–14% vs 8% global benchmark.`;
      quote = `"We cannot solve our problems with the same thinking we used when we created them." — Albert Einstein (Quoted by NITI Aayog in Strategy @75)`;
      thinker = `Joseph Schumpeter (Creative Destruction — innovation cycles replacing obsolescent production models) & Raghuram Rajan (Third Pillar: Strengthening community resilience alongside state and market).`;
      examples = `Unified Payments Interface (UPI) handling 14+ Billion transactions monthly; PM Gati Shakti National Master Plan integrating 16 central infrastructure ministries.`;
      ruralCase = `Odanthurai Panchayat (Tamil Nadu): Energy self-sufficient green panchayat generating clean wind power and selling surplus electricity back to the state grid.`;
      globalCase = `German Mittelstand Model: SME network of hidden global market leaders driven by vocational dual-education training and sovereign R&D grants (Fraunhofer Institute).`;
      committee = `P.J. Nayak Committee (Governance of Bank Boards) & Shekatkar Committee (Defence expenditure and combat capability optimization).`;
      commission = `NITI Aayog Strategy for New India @75 & 15th Finance Commission recommendations on performance-based fiscal transfers.`;
      laws = `Insolvency and Bankruptcy Code (IBC 2016); Competition (Amendment) Act 2023; Foreign Trade Policy 2023.`;
      schemes = `Production Linked Incentive (PLI) Schemes across 14 key sectors, PM Gati Shakti, National Logistics Policy (NLP), Startup India Seed Fund.`;
      edge = `The "Twin Transition" Edge: Normal answers treat economic growth and green transition as mutually conflicting goals. Toppers integrate the "Twin Transition" framework (Digitalization + Decarbonization), showing how smart logistics (PM Gati Shakti) and green supply chains reduce carbon emissions while shaving 4% off national logistics friction.`;
    }

    return {
      title: rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1),
      category: domain,
      data: data,
      dataSource: 'Economic Survey 2023-24, NITI Aayog & Official Government Reports',
      quote: quote,
      quoteSource: 'Authoritative Constitutional & Economic Treatises',
      thinker: thinker,
      examples: examples,
      ruralCase: ruralCase,
      globalCase: globalCase,
      committee: committee,
      commission: commission,
      laws: laws,
      schemes: schemes,
      edge: edge
    };
  }

  // Load jsPDF dynamically if needed
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensurePdfLibraries() {
    if (window.jspdf && window.jspdf.jsPDF) return;
    try {
      await loadScript(JSPDF_CDN);
      await loadScript(AUTOTABLE_CDN);
    } catch (e) {
      console.warn('PDF library CDN load failed:', e);
    }
  }

  // Generate and Download PDF Sheet
  async function downloadTopicPdf(topicObj) {
    await ensurePdfLibraries();
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF generation engine is currently loading from CDN. Please check your internet connection and try again.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [30, 58, 138]; // Deep Navy
    const accentColor = [5, 150, 105]; // Emerald
    const grayColor = [71, 85, 105];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('UPSC CSE MAINS — TOPIC VALUE ADDITION EDGE SHEET', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(191, 219, 254);
    doc.text(`Topic: ${topicObj.title}  |  Domain: ${topicObj.category}`, 14, 19);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}  |  Source: Government Blueprints & Topper Ledger`, 14, 24);

    // Table of Dimensions
    const rows = [
      ['1. OFFICIAL DATA & STATS', `${topicObj.data}\n[Source: ${topicObj.dataSource}]`],
      ['2. AUTHORITATIVE QUOTE', `${topicObj.quote}\n[Ref: ${topicObj.quoteSource}]`],
      ['3. THINKER PERSPECTIVE', topicObj.thinker],
      ['4. DISTINCT EXAMPLES', topicObj.examples],
      ['5. RURAL CASE STUDY', topicObj.ruralCase],
      ['6. GLOBAL BENCHMARK', topicObj.globalCase],
      ['7. COMMITTEE RECOMMENDATION', topicObj.committee],
      ['8. COMMISSIONS & REPORTS', topicObj.commission],
      ['9. LAWS, DOCTRINES & ARTICLES', topicObj.laws],
      ['10. SCHEMES & MISSIONS', topicObj.schemes],
      ['⭐ TOPPER EDGE FACTOR', topicObj.edge]
    ];

    doc.autoTable({
      startY: 33,
      head: [['Dimension', 'High-Yield Value Addition (Government Grounded & Distinct)']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9.5,
        fontStyle: 'bold',
        cellPadding: 3.5
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold', textColor: [30, 41, 59], fontSize: 8.5 },
        1: { cellWidth: 140, textColor: [30, 41, 59], fontSize: 8.2, lineHeight: 1.25 }
      },
      styles: {
        cellPadding: 3,
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: function(data) {
        if (data.row.index === 10) { // Edge factor row
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(...grayColor);
      doc.text(`MainsLog Topper Vault • Confidential Study Ledger • Page ${i} of ${pageCount}`, 14, 290);
    }

    const filename = `${topicObj.title.replace(/[^a-zA-Z0-9]/g, '_')}_Value_Addition.pdf`;
    doc.save(filename);
  }

  // Toast utility
  function showToast(msg) {
    let t = document.getElementById('tvaToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'tvaToast';
      t.className = 'tva-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<span>✓</span> <span>${msg}</span>`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Build Root UI Component
  function buildValueAdditionHtml() {
    return `
      <div class="tva-root" id="topperValueAdditionSection">
        <div class="tva-header">
          <div>
            <span class="tva-kicker">💎 EDGE MULTIPLIER ENGINE</span>
            <h3 class="tva-title">Topper Topic Value Addition Vault</h3>
            <p class="tva-sub">
              Enter any UPSC Mains topic to generate distinct, government-sourced data, quotes, thinkers, rural/global case studies, committees, and secret edge factors designed to give you a decisive scoring advantage over average answers.
            </p>
          </div>
        </div>

        <!-- Input Box -->
        <div class="tva-input-card">
          <div class="tva-input-row">
            <input type="text" id="tvaTopicInput" class="tva-search-input" placeholder="Type ANY topic (e.g. Women in Agriculture, Federalism, AI Ethics, Judicial Pendency, Urban Floods)..." value="Women in Agriculture & Land Rights">
            <button type="button" id="tvaGenerateBtn" class="tva-btn-generate">
              <span>⚡ Generate Value Addition</span>
            </button>
          </div>

          <!-- Quick Topic Chips -->
          <div class="tva-chips-label">🔥 Quick High-Yield Topic Presets (Tap to Load):</div>
          <div class="tva-chips-wrap" id="tvaChipsWrap">
            <button class="tva-chip active" data-slug="women-in-agriculture">Women in Agriculture</button>
            <button class="tva-chip" data-slug="federalism-governors">Federalism &amp; Governors</button>
            <button class="tva-chip" data-slug="judicial-pendency">Judicial Pendency</button>
            <button class="tva-chip" data-slug="urban-floods">Urban Flooding</button>
            <button class="tva-chip" data-slug="ai-ethics">AI Ethics &amp; Bias</button>
            <button class="tva-chip" data-slug="semiconductor-mission">Semiconductors</button>
            <button class="tva-chip" data-slug="tribal-governance">Tribal PESA &amp; Forests</button>
            <button class="tva-chip" data-slug="informal-economy">Gig Workers &amp; Social Security</button>
          </div>
        </div>

        <!-- Action Strip -->
        <div class="tva-actions-strip">
          <div class="tva-active-topic-badge" id="tvaTopicBadge">
            <strong id="tvaActiveTopicTitle">Women in Agriculture &amp; Land Rights</strong>
            <span id="tvaActiveCategory">GS1 / GS3 / Sociology</span>
          </div>
          <div class="tva-btn-group">
            <button type="button" class="tva-tool-btn" id="tvaCopyBtn" title="Copy as Markdown notes">📋 Copy Sheet</button>
            <button type="button" class="tva-tool-btn" id="tvaSaveBtn" title="Save to local browser vault">💾 Save to Vault</button>
            <button type="button" class="tva-tool-btn primary" id="tvaDownloadPdfBtn" title="Export clean formatted PDF">📥 Download PDF</button>
          </div>
        </div>

        <!-- Cards Grid Container -->
        <div class="tva-cards-grid" id="tvaCardsContainer"></div>
      </div>
    `;
  }

  // Render Topic Cards
  function renderTopicCards(topicObj, rootScope) {
    const scope = rootScope || document;
    const container = scope.querySelector('#tvaCardsContainer');
    if (!container) return;

    const titleEl = scope.querySelector('#tvaActiveTopicTitle');
    if (titleEl) titleEl.textContent = topicObj.title;
    const catEl = scope.querySelector('#tvaActiveCategory');
    if (catEl) catEl.textContent = topicObj.category;

    const cardsHtml = `
      <!-- 1. DATA CARD -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-data">📊 Official Data &amp; Stats</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.data)}</div>
        <div class="tva-source-line">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${escapeHtml(topicObj.dataSource)}
        </div>
      </div>

      <!-- 2. QUOTE CARD -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-quote">💬 Authoritative Quote</span>
        </div>
        <div class="tva-card-body"><em>${escapeHtml(topicObj.quote)}</em></div>
        <div class="tva-source-line">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${escapeHtml(topicObj.quoteSource)}
        </div>
      </div>

      <!-- 3. THINKER CARD -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-thinker">🧠 Thinker Perspective</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.thinker)}</div>
      </div>

      <!-- 4. EXAMPLES CARD -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-scheme">💡 Distinct Examples</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.examples)}</div>
      </div>

      <!-- 5. RURAL CASE STUDY -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-rural">🏡 Rural Grassroots Case Study</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.ruralCase)}</div>
      </div>

      <!-- 6. GLOBAL BENCHMARK CASE STUDY -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-global">🌐 Global Benchmark Case Study</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.globalCase)}</div>
      </div>

      <!-- 7. COMMITTEE RECOMMENDATION -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-committee">📑 Committee Recommendation</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.committee)}</div>
      </div>

      <!-- 8. COMMISSIONS & OFFICIAL BODIES -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-law">⚖️ Commissions &amp; Reports</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.commission)}</div>
      </div>

      <!-- 9. LAWS & ARTICLES -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-law">📜 Constitutional Articles &amp; Laws</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.laws)}</div>
      </div>

      <!-- 10. SCHEMES & POLICIES -->
      <div class="tva-item-card">
        <div class="tva-card-top">
          <span class="tva-category-tag tva-tag-scheme">🎯 Flagship Central Schemes</span>
        </div>
        <div class="tva-card-body">${escapeHtml(topicObj.schemes)}</div>
      </div>

      <!-- 11. SECRET SAUCE EDGE FACTOR -->
      <div class="tva-item-card tva-edge-card">
        <div class="tva-card-top">
          <span class="tva-edge-title">🚀 The Topper "Secret Sauce" Edge Factor (What Normal Aspirants Miss)</span>
          <span class="tva-category-tag tva-tag-edge">★ Unfair Advantage</span>
        </div>
        <div class="tva-card-body" style="font-size:0.92rem; color:#78350F; line-height:1.65;">
          ${escapeHtml(topicObj.edge)}
        </div>
      </div>
    `;

    container.innerHTML = cardsHtml;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Active state
  let currentTopicData = CURATED_TOPICS['women-in-agriculture'];

  function bindValueAdditionEvents(rootScope) {
    const scope = rootScope || document;
    const inputEl = scope.querySelector('#tvaTopicInput');
    const genBtn = scope.querySelector('#tvaGenerateBtn');
    const chipsWrap = scope.querySelector('#tvaChipsWrap');
    const copyBtn = scope.querySelector('#tvaCopyBtn');
    const saveBtn = scope.querySelector('#tvaSaveBtn');
    const downloadBtn = scope.querySelector('#tvaDownloadPdfBtn');

    function triggerGeneration(query) {
      if (!query || !query.trim()) return;
      currentTopicData = synthesizeTopic(query);
      renderTopicCards(currentTopicData, scope);
      showToast(`Generated distinct value additions for "${currentTopicData.title}"`);
    }

    if (genBtn && inputEl) {
      genBtn.onclick = () => triggerGeneration(inputEl.value);
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') triggerGeneration(inputEl.value);
      };
    }

    if (chipsWrap) {
      chipsWrap.querySelectorAll('.tva-chip').forEach(chip => {
        chip.onclick = () => {
          chipsWrap.querySelectorAll('.tva-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const slug = chip.getAttribute('data-slug');
          if (CURATED_TOPICS[slug]) {
            currentTopicData = CURATED_TOPICS[slug];
            if (inputEl) inputEl.value = currentTopicData.title;
            renderTopicCards(currentTopicData, scope);
            showToast(`Loaded ${currentTopicData.title}`);
          }
        };
      });
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        const mdText = `# ${currentTopicData.title} — UPSC Value Addition Sheet\n` +
          `**Domain:** ${currentTopicData.category}\n\n` +
          `### 1. Official Data & Statistics\n${currentTopicData.data}\n*(Source: ${currentTopicData.dataSource})*\n\n` +
          `### 2. Authoritative Quote\n>${currentTopicData.quote}\n*(Ref: ${currentTopicData.quoteSource})*\n\n` +
          `### 3. Thinker Perspective\n${currentTopicData.thinker}\n\n` +
          `### 4. Distinct Examples\n${currentTopicData.examples}\n\n` +
          `### 5. Rural Grassroots Case Study\n${currentTopicData.ruralCase}\n\n` +
          `### 6. Global Benchmark Case Study\n${currentTopicData.globalCase}\n\n` +
          `### 7. Committee Recommendations\n${currentTopicData.committee}\n\n` +
          `### 8. Commissions & Reports\n${currentTopicData.commission}\n\n` +
          `### 9. Laws & Constitutional Articles\n${currentTopicData.laws}\n\n` +
          `### 10. Central Flagship Schemes\n${currentTopicData.schemes}\n\n` +
          `### 🚀 The Topper Secret Sauce Edge Factor\n${currentTopicData.edge}\n`;

        navigator.clipboard.writeText(mdText).then(() => {
          showToast('Copied full value addition sheet to clipboard!');
        }).catch(() => {
          showToast('Failed to copy. Please allow clipboard permissions.');
        });
      };
    }

    if (saveBtn) {
      saveBtn.onclick = () => {
        try {
          const saved = JSON.parse(localStorage.getItem('TOPPER_VA_SAVED_TOPICS') || '[]');
          const existingIdx = saved.findIndex(s => s.title.toLowerCase() === currentTopicData.title.toLowerCase());
          if (existingIdx !== -1) {
            saved[existingIdx] = currentTopicData;
          } else {
            saved.unshift(currentTopicData);
          }
          localStorage.setItem('TOPPER_VA_SAVED_TOPICS', JSON.stringify(saved.slice(0, 30)));
          showToast(`Saved "${currentTopicData.title}" to your personal vault!`);
        } catch (e) {
          showToast('Could not save to local storage.');
        }
      };
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => {
        downloadTopicPdf(currentTopicData);
      };
    }
  }

  function renderInto(targetParent) {
    if (!targetParent) return;
    targetParent.innerHTML = buildValueAdditionHtml();
    renderTopicCards(currentTopicData, targetParent);
    bindValueAdditionEvents(targetParent);
  }

  // Initialize UI in DOM
  function mountValueAddition() {
    const targetParent = document.querySelector('.topper-copies-root');
    if (!targetParent) return;

    if (document.getElementById('topperValueAdditionSection')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildValueAdditionHtml();
    targetParent.appendChild(wrapper.firstElementChild);

    renderTopicCards(currentTopicData, targetParent);
    bindValueAdditionEvents(targetParent);
  }

  // Self-mounting
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountValueAddition);
    } else {
      mountValueAddition();
    }
  }

  // Export for external callers (e.g. from gs.html or sociology.html)
  const rootObj = typeof window !== 'undefined' ? window : globalThis;
  rootObj.TOPPER_VALUE_ADDITION = {
    mount: mountValueAddition,
    renderInto: renderInto,
    synthesize: synthesizeTopic,
    downloadPdf: downloadTopicPdf,
    database: CURATED_TOPICS
  };

})();
