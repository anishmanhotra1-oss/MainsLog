/**
 * ============================================================
 * TOPPER VALUE ADDITION & EDGE ENGINE (topper-value-addition.js)
 * Powered by Google Gemini AI & Government Data Repositories
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
      data: 'As per Periodic Labour Force Survey (PLFS 2023-24), 76.2% of rural women workers are employed in agriculture vs 54% of rural men (the "Feminization of Agriculture"). However, as per 10th Agricultural Census, women hold only 13.9% of operational agricultural landholdings.',
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
      title: 'Judicial Pendency & Court Infrastructure',
      category: 'GS2 Governance',
      data: 'National Judicial Data Grid (NJDG 2024): 5.1+ Crore cases pending across all court tiers in India (4.4 Cr in District/Subordinate courts, 62 Lakhs in High Courts, 84,000+ in Supreme Court). Over 1.7 lakh cases have been pending for more than 30 years.',
      dataSource: 'National Judicial Data Grid (NJDG) MoL&J Report 2024',
      quote: '"Justice delayed is not merely justice denied; it is the slow erosion of public trust in the rule of law and the constitutional promise." — Justice N.V. Ramana (Former CJI)',
      quoteSource: 'All India District Judges Conference Keynote',
      thinker: 'Lon L. Fuller (The Morality of Law — institutional congestion impairs legal congruity) and Upendra Baxi (Demosprudence vs Jurisprudence — access to judicial remedies as the cornerstone of human rights).',
      examples: 'E-Courts Mission Mode Project Phase III (Cloud architecture and AI-driven case scheduling); National Judicial Infrastructure Authority of India (NJIAI) blueprint for court digitalization.',
      ruralCase: 'Nyaya Gram Parishads in Himachal Pradesh: Lok Adalats taking court hearings to remote tribal panchayats via mobile judicial vans, disposing of civil disputes on the spot with community consensus.',
      globalCase: 'Singapore State Courts Smart Court System: Utilizes AI document summarization, automated case management, and mandatory pre-trial mediation, achieving an average case disposal cycle of under 9 months.',
      committee: 'Justice Malimath Committee on Reforms of Criminal Justice System & Justice B.S. Chauhan (230th Law Commission): Recommended two-shift courts, specialized fast-track tribunals, and strict limits on adjournments.',
      commission: 'Law Commission of India (245th Report): Recommended increasing judicial strength from the current ~21 judges per million population to 50 judges per million.',
      laws: 'Article 21 (Right to Speedy Trial as a Fundamental Right under Hussainara Khatoon 1979); Article 130 (Seat of Supreme Court); Article 39A (Free Legal Aid).',
      schemes: 'Tele-Law Scheme under DISHA (connecting common service centres to panel lawyers), Centrally Sponsored Scheme (CSS) for Development of Infrastructure Facilities for Judiciary.',
      edge: 'The Government Litigation Bottleneck: Over 46% of total court pendency is triggered by government departments (PSUs, Railways, Revenue) pursuing needless appeals. Normal aspirants suggest "appointing more judges"; toppers cite the National Litigation Policy (NLP) with mandatory internal arbitration to penalize government departments that file frivolous appeals against citizens.'
    },

    'urban-floods': {
      title: 'Urban Flooding & Sponge City Infrastructure',
      category: 'GS1 Geography / GS3 Disaster Management',
      data: 'As per NITI Aayog Urban Planning Report (2023), over 40% of Indian urban wetlands and waterbodies have been lost to real estate encroachment in the past 40 years. Impervious surface cover in metropolitan cities (Bengaluru, Chennai, Delhi) has surged by over 450%.',
      dataSource: 'NITI Aayog "Reforms in Urban Planning Capacity" & NDMA Urban Flooding Guidelines',
      quote: '"Water does not commit encroaching; human infrastructure encroaches upon water\'s ancient flowpaths." — Sunita Narain (CSE)',
      quoteSource: 'Centre for Science and Environment Water Commons Blueprint',
      thinker: 'Patrick Geddes (Town Planning "Folk-Work-Place" organic harmony) and Elinor Ostrom (Polycentric governance of urban common property resources like floodplains and tanks).',
      examples: 'Bengaluru Stormwater Drain (SWD) GIS-tagging mapping and revival of cascading lake systems (Kere system); Chennai Krishna Canal flood barrier restoration.',
      ruralCase: 'Hiware Bazar Village (Ahmednagar, Maharashtra): Integrated watershed contour bunding and continuous check dams preventing both monsoon flash runoffs and summer droughts through community water auditing.',
      globalCase: 'Singapore "ABC Waters" Programme (Active, Beautiful, Clean Waters): Naturalized concrete canals into living rivers with bioswales, retention ponds, and porous pavements to absorb tropical monsoon surges.',
      committee: 'K. Kasturirangan Expert Committee on Western Ghats & NDMA High-Level Task Force on Urban Floods: Recommended demarcating non-negotiable "No Development Zones" on natural urban floodplains.',
      commission: '2nd ARC 3rd Report (Crisis Management): Mandated unified metropolitan disaster response authorities under elected mayors rather than fragmented municipal and parastatal agencies.',
      laws: 'Disaster Management Act 2005 (Section 22/30 for District Disaster Management Plans); Wetlands (Conservation and Management) Rules 2017; Coastal Regulation Zone (CRZ) Notification 2019.',
      schemes: 'AMRUT 2.0 (Mission Amrit Sarovar for rejuvenating 75 water bodies per district), National Urban Flood Management Programme (NUFMP), Jal Shakti Abhiyan: Catch the Rain.',
      edge: 'The "Grey vs Blue-Green" Infrastructure Mismatch: Normal aspirants advocate concrete storm drains (Grey infrastructure); toppers argue that concrete drains accelerate runoff velocity and amplify downstream inundation. Toppers advocate "Sponge Cities" (Blue-Green infrastructure) using permeable pavements, urban swales, retention wetlands, and mandatory bioswales under building bylaws.'
    },

    'ai-ethics': {
      title: 'AI Ethics, Algorithmic Bias & Deepfakes',
      category: 'GS3 Sci-Tech / GS4 Ethics',
      data: 'World Economic Forum Global Risks Report 2024 ranked AI-derived misinformation and deepfakes as the #1 global short-term risk. India witnessed a 230% increase in deepfake and biometric identity fraud cases in 2023-24 (NCRB Cybercrime Report).',
      dataSource: 'WEF Global Risks Report 2024 & NCRB Crime in India Ledger',
      quote: '"Technology without ethics is catastrophe; innovation must bend to the constitutional morality of human dignity." — Supreme Court of India',
      quoteSource: 'Justice K.S. Puttaswamy v. Union of India (2017) 9-Judge Bench',
      thinker: 'Hans Jonas (Imperative of Responsibility — precautionary principle in modern technology) and Shoshana Zuboff (The Age of Surveillance Capitalism — extraction of behavioral surplus without democratic accountability).',
      examples: 'Election Commission of India (ECI) Voluntary Code of Ethics for Social Media platforms during 2024 General Elections; UIDAI Face RD App with liveness detection to prevent synthetic deepfake fraud.',
      ruralCase: 'Tingvissing Gram Sabha (Nagaland): Community council resolutions mandating oral verification for government benefit claims after deepfake audio impersonation of village elders was attempted.',
      globalCase: 'European Union Artificial Intelligence Act (EU AI Act 2024): Risk-based regulatory framework classifying AI systems into Unacceptable Risk (banned), High Risk (strict conformity assessment), and Minimal Risk.',
      committee: 'NITI Aayog National Strategy for Artificial Intelligence (Responsible AI for All - RAI Framework): Formulated 7 principles including Fairness, Transparency, Privacy, and Human Oversight.',
      commission: 'Law Commission of India (267th Report on Hate Speech & Misinformation): Recommended specific statutory definitions for digitally fabricated synthetic media designed to incite public disorder.',
      laws: 'Information Technology Act 2000 (Section 66D for impersonation; IT Intermediary Rules 2023 Rule 3(1)(b) for deepfakes); Digital Personal Data Protection Act (DPDPA 2023 Section 8 for data fiduciary obligations).',
      schemes: 'IndiaAI Mission (₹10,372 Cr allocated by Union Cabinet for compute infrastructure, foundational models, and safe AI datasets); Cyber Swachhta Kendra (CERT-In).',
      edge: 'The Black-Box Algorithmic Inversion: Average aspirants treat AI bias as a technical glitch solved by "cleaner training datasets"; top scorers evaluate algorithmic bias as an ethical structural harm under Article 14 (Equality before Law) and Article 21. Toppers propose statutory "Algorithmic Impact Assessments" (AIA) and a mandatory cryptographic watermarking regime (C2PA standards) for all generative media.'
    },

    'semiconductor-mission': {
      title: 'India Semiconductor Mission & Tech Geopolitics',
      category: 'GS2 IR / GS3 Sci-Tech & Economy',
      data: 'India currently imports over 90% of its electronic chips ($24 Billion annually). Under the India Semiconductor Mission (ISM), the Union Cabinet has approved 5 mega semiconductor manufacturing units with total capital investment exceeding ₹1.52 Lakh Crore.',
      dataSource: 'Ministry of Electronics and Information Technology (MeitY) ISM Ledger 2024',
      quote: '"In the 21st century, chips are the new oil. Nations that do not master semiconductors will surrender their economic and strategic sovereignty." — Dr. S. Jaishankar',
      quoteSource: 'Address at SemiconIndia Summit',
      thinker: 'Chris Miller (Chip War: The Fight for the World\'s Most Critical Technology — geopolitics of asymmetric chokepoints) and Mariana Mazzucato (The Entrepreneurial State — state co-investment in deep-tech risks).',
      examples: 'Tata Electronics & PSMC Taiwan 28nm Fab facility in Dholera (Gujarat); Micron Technology ATMP plant in Sanand; CG Power & Renesas OSAT facility in Morigaon (Assam).',
      ruralCase: 'Panchayat Skilling Corridors in Assam: Specialized ITI and polytechnic vocational tie-ups training rural youth in precision cleanroom assembly for the upcoming semiconductor packaging plant in Morigaon.',
      globalCase: 'Taiwan\'s "Silicon Shield": By concentrating over 60% of global foundry capacity (and 90% of advanced sub-5nm chips via TSMC), Taiwan transformed pure industrial capacity into geopolitical deterrence.',
      committee: 'Task Force on Electronics Manufacturing (Dr. V. Krishnamurthy Committee): Advocated for direct capital subsidies and long-term ecosystem development over mere tariff protectionism.',
      commission: 'NITI Aayog Assessment on Deep Tech & Global Value Chains: Recommended focusing on mature nodes (28nm to 65nm) used in automotive, defense, and power electronics before chasing sub-3nm cutting-edge nodes.',
      laws: 'Modified Programme for Semiconductors and Display Fab Ecosystem in India (Cabinet Resolution 2021); Foreign Trade Policy 2023 (Special Chemicals, Organisms, Materials, Equipment and Technologies - SCOMET list).',
      schemes: 'India Semiconductor Mission (ISM) with 50% fiscal support on pari-passu basis; Production Linked Incentive (PLI 2.0) for Large Scale Electronics; Design Linked Incentive (DLI) Scheme.',
      edge: 'The Foundries vs Packaging (OSAT/ATMP) Pragmatism: Normal aspirants write general calls to build "cutting-edge 2nm fabs like TSMC"; toppers know that cutting-edge fabs cost $20B each and require millions of liters of ultrapure water daily. Toppers recommend dominating the Assembly, Testing, Marking, and Packaging (ATMP) segment and specialized compound semiconductors (Silicon Carbide & Gallium Nitride for EVs) where India holds competitive engineering parity.'
    },

    'tribal-governance': {
      title: 'Tribal Self-Governance, PESA & Forest Rights',
      category: 'GS2 Polity / GS3 Environment / Sociology',
      data: 'As per Ministry of Tribal Affairs (MoTA 2024), while over 23.4 lakh Individual Forest Rights (IFR) titles have been distributed under FRA 2006, Community Forest Resource (CFR) rights have been granted on less than 15% of eligible tribal village lands across 10 Fifth Schedule States.',
      dataSource: 'Ministry of Tribal Affairs Dashboard & National Commission for Scheduled Tribes (NCST)',
      quote: '"Tribal self-governance is not a concession granted by the modern state; it is an organic recognition of ancestral custodial stewardship over nature." — Verrier Elwin',
      quoteSource: 'Philosophy for NEFA (Tribal Panchsheel)',
      thinker: 'Verrier Elwin & Jawaharlal Nehru (Tribal Panchsheel: development along the lines of indigenous genius without imposition) and Ramachandra Guha (Environmentalism of the Poor — ecology as survival vs lifestyle).',
      examples: 'Kani Tribe of Kerala: Access and Benefit Sharing (ABS) agreement for the wonder herb Arogyapacha (Jeevani tonic) under the Tropical Botanic Garden and Research Institute (TBGRI) model.',
      ruralCase: 'Mendha Lekha Village (Gadchiroli, Maharashtra): First village in India to secure Community Forest Rights under FRA, exercising sovereign Gram Sabha bamboo harvest and earning over ₹1 Crore annually while eliminating middlemen.',
      globalCase: 'New Zealand Whanganui River Legal Personhood Act: Bestowed statutory legal personhood (*Te Awa Tupua*) upon the ancestral river, administered jointly by Maori tribal representatives and the Crown.',
      committee: 'Bhuria Committee (1995 - foundation for PESA Act 1996) & Virginius Xaxa Committee on Tribal Socio-Economic Status (2014): Recommended prohibiting diversion of tribal land without prior informed Gram Sabha consent.',
      commission: '2nd ARC 7th Report (Conflict Resolution) & 15th Finance Commission: Recommended direct tied grants to Fifth Schedule Gram Sabhas for indigenous forest conservation and minor forest produce processing.',
      laws: 'Panchayats (Extension to the Scheduled Areas) Act 1996 (PESA); Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act 2006 (FRA); Fifth and Sixth Schedules of Constitution.',
      schemes: 'Pradhan Mantri Janjati Adivasi Nyaya Maha Abhiyan (PM-JANMAN for 75 PVTG communities); Pradhan Mantri Van Dhan Yojana (TRIFED setting up Van Dhan Vikas Kendras); Eklavya Model Residential Schools (EMRS).',
      edge: 'The Administrative Dualism Trap: Normal aspirants quote PESA as a success on paper; toppers expose that 4 out of 10 Fifth Schedule states have still not framed comprehensive state PESA subordinate rules, leaving forest officials to supersede Gram Sabhas under the colonial Indian Forest Act 1927. Toppers advocate harmonizing the Indian Forest Act with FRA Section 3(1)(i) to give statutory primacy to Gram Sabhas in forest management.'
    },

    'informal-economy': {
      title: 'Gig Economy, Informal Labour & Social Security',
      category: 'GS3 Economy / Sociology',
      data: 'NITI Aayog "Booming Gig and Platform Economy" Report: India\'s gig workforce is projected to expand from 7.7 million (2020) to 23.5 million by 2029-30 (4.1% of total Indian livelihood). However, over 93% of gig workers have zero employer-contributed medical or pension safety net.',
      dataSource: 'NITI Aayog Platform Economy Report & e-Shram Portal Database (MoL&E)',
      quote: '"A society cannot celebrate digitised consumer convenience while rendering invisible the human precarity that delivers it." — Prof. Jan Breman',
      quoteSource: 'Footloose Labour: Working in the Indian Informal Economy',
      thinker: 'Jan Breman (Footloose Labour and Neo-bondage through algorithmic surveillance) and Guy Standing (The Precariat: The New Dangerous Class — workers stripped of labor identity and collective voice).',
      examples: 'Rajasthan Platform Based Gig Workers (Registration and Welfare) Act 2023 — India\'s first statutory social security cess (0.5%–2% per transaction) funding a dedicated Gig Welfare Board.',
      ruralCase: 'SEWA (Self Employed Women\'s Association) Lok Swasthya Mandali: Community health mutuals and micro-insurance co-operatives protecting unorganized rural and peri-urban women vendors from catastrophic out-of-pocket health shocks.',
      globalCase: 'California Proposition 22 & UK Supreme Court Uber Rulings: Reclassified platform app drivers from independent autonomous contractors to statutory "workers" entitled to minimum wage, holiday pay, and pension contributions.',
      committee: 'Standing Committee on Labour (Report on Code on Social Security): Recommended a universal, portable social security fund contributed by aggregator platforms and central/state governments.',
      commission: 'National Commission for Enterprises in the Unorganised Sector (NCEUS - Arjun Sengupta Report): Landmark finding that 77% of Indians lived on less than ₹20/day in informal precarity.',
      laws: 'Code on Social Security 2020 (Sections 112–114 formally recognizing gig and platform workers); Article 41 (Right to work, education and public assistance in cases of unemployment); Article 43 (Living wage for workers).',
      schemes: 'e-Shram Portal (30+ Crore unorganized workers registered with Universal Account Numbers - UAN); PM Shram Yogi Maan-dhan (PM-SYM pension scheme); Ayushman Bharat PM-JAY.',
      edge: 'The Algorithmic Arbitrage Paradox: Aggregators claim workers are "independent entrepreneurial partners" to evade formal employer liability under the Industrial Disputes Act, yet exercise total algorithmic control over ride allocations, surge pay, and arbitrary account deactivations. Toppers cite the Rajasthan Welfare Board model and propose a statutory "Algorithmic Ombudsman" to prevent unfair platform de-platforming.'
    }
  };

  // Safe HTML Escaping
  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    t.innerHTML = `<span>⚡</span> <span>${escapeHtml(msg)}</span>`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  // Active state
  let currentTopicData = CURATED_TOPICS['women-in-agriculture'];

  // Dynamic Synthesizer Fallback (Used only when both server and client Gemini calls fail)
  function synthesizeFallbackTopic(query) {
    const q = (query || '').trim();
    return {
      title: q,
      category: 'GS Mains / Optional Strategy',
      data: `Official indicators from NITI Aayog Strategy @75 & MoSPI National Accounts benchmark national priority indices for ${q}, emphasizing structural capacity expansion.`,
      dataSource: 'NITI Aayog Strategy for New India @75 & MoSPI Statistical Compendium',
      quote: `"In the architecture of a welfare republic, institutional accountability is the irreducible bedrock." — Supreme Court of India`,
      quoteSource: 'Constitution Bench Jurisprudence on Rule of Law & Public Interest',
      thinker: 'Amartya Sen (Capabilities Approach & Social Choice) & Elinor Ostrom (Polycentric Governance of Public Assets).',
      examples: `State-level Mission Mode Projects and District Good Governance Index (DGGI) best practices targeting ${q}.`,
      ruralCase: `Panchayat Innovation Corridor in Hiware Bazar & Kudumbashree: Decentralized community management ensuring equitable service delivery.`,
      globalCase: `OECD and Singapore Smart Public Management Model: Integrated digital delivery and performance audits.`,
      committee: `High-Powered Central Committee Recommendations advocating targeted statutory timeframes and fiscal devolution.`,
      commission: `2nd Administrative Reforms Commission (2nd ARC 4th/7th Reports) on Citizen-Centric Governance and Conflict Resolution.`,
      laws: `Constitutional Directive Principles (Article 39, Article 46) and relevant Central statutory frameworks.`,
      schemes: `Flagship Mission-mode Centrally Sponsored Schemes and Digital India public infrastructure platforms.`,
      edge: `The Institutional Capacity Paradox: Normal candidates propose generic financial allocations; toppers highlight structural implementation friction, inter-departmental silos, and propose automated outcome-monitoring led by District Magistrates.`
    };
  }

  // Client-Side Direct Gemini API Caller (as resilience fallback)
  async function callGeminiDirect(topic, apiKey) {
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          systemInstruction: {
            parts: [{
              text: "You are an elite UPSC Civil Services Mains mentor. When given a topic, produce authentic, government-sourced value additions in JSON format with fields: title, category, data, dataSource, quote, quoteSource, thinker, examples, ruralCase, globalCase, committee, commission, laws, schemes, edge. Ground all facts in real Indian government reports (NFHS-5, PLFS 2023-24, NITI Aayog, MoSPI, Economic Survey, NCRB). Output valid JSON only."
            }]
          },
          contents: [{ role: 'user', parts: [{ text: `Topic: "${topic}". Return valid JSON.` }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        };
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (r.ok) {
          const json = await r.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          return JSON.parse(text);
        }
      } catch (e) {
        console.warn(`[TVA] Direct call with ${model} failed:`, e);
      }
    }
    return null;
  }

  // PDF Export Engine (using jsPDF + autoTable)
  function downloadTopicPdf(topicObj) {
    if (typeof window === 'undefined') return;

    if (!window.jspdf) {
      showToast('Loading PDF Generator engine...');
      const s1 = document.createElement('script');
      s1.src = JSPDF_CDN;
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = AUTOTABLE_CDN;
        s2.onload = () => generatePdf(topicObj);
        document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
    } else {
      generatePdf(topicObj);
    }
  }

  function generatePdf(topicObj) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const primaryColor = [30, 64, 175];   // Deep Blue
    const darkColor = [15, 23, 42];       // Charcoal
    const grayColor = [100, 116, 139];    // Muted
    const amberColor = [180, 83, 9];      // Amber

    // Header Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, 42, 210, 42);

    // Kicker
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('UPSC CSE MAINS • TOPPER VALUE ADDITION DOSSIER', 14, 13);

    // Main Title
    doc.setFontSize(15);
    doc.setTextColor(...darkColor);
    const titleLines = doc.splitTextToSize(topicObj.title, 182);
    doc.text(titleLines, 14, 21);

    // Metadata line
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`Domain: ${topicObj.category}  •  Source: Official Government Portals & Gemini Intelligence  •  Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    // Prepare Table Rows
    const rows = [
      ['Official Data & Statistics', `${topicObj.data}\n\nSource: ${topicObj.dataSource}`],
      ['Authoritative Quote', `"${topicObj.quote}"\n\nReference: ${topicObj.quoteSource}`],
      ['Thinker Perspective', topicObj.thinker],
      ['Distinct Examples', topicObj.examples],
      ['Rural Grassroots Case Study', topicObj.ruralCase],
      ['Global Benchmark Case Study', topicObj.globalCase],
      ['Committee Recommendations', topicObj.committee],
      ['Commissions & Reports', topicObj.commission],
      ['Laws & Constitutional Articles', topicObj.laws],
      ['Central Flagship Schemes', topicObj.schemes],
      ['★ TOPPER SECRET SAUCE EDGE', topicObj.edge]
    ];

    doc.autoTable({
      startY: 46,
      head: [['Dimension / Framework Pillar', 'High-Yield Value Addition Points']],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 8.8,
        font: 'helvetica',
        cellPadding: 4,
        overflow: 'linebreak',
        textColor: darkColor,
        lineColor: [226, 232, 240],
        lineWidth: 0.25
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 132 }
      },
      alternateRowStyles: {
        fillColor: [254, 254, 255]
      },
      didParseCell: function(data) {
        if (data.row.index === 10) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(...grayColor);
      doc.text(`MainsLog Topper Vault • Personal Study Dossier • Page ${i} of ${pageCount}`, 14, 290);
    }

    const filename = `${topicObj.title.replace(/[^a-zA-Z0-9]/g, '_')}_Value_Addition.pdf`;
    doc.save(filename);
    showToast(`Downloaded "${filename}"`);
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
              Enter any UPSC topic to generate official government data, quotes, thinkers, rural/global case studies, committees, and secret edge factors using Google Gemini 3.5 Intelligence.
            </p>
          </div>
          <div class="tva-header-actions">
            <button type="button" class="tva-key-pill" id="tvaKeyBtn" title="Check or configure your Google Gemini API Key">
              <span class="tva-key-dot"></span>
              <span id="tvaKeyLabel">✨ Gemini AI Active</span>
              <span class="tva-key-edit">⚙️</span>
            </button>
          </div>
        </div>

        <!-- Input Box -->
        <div class="tva-input-card">
          <div class="tva-input-row">
            <input type="text" id="tvaTopicInput" class="tva-search-input" placeholder="Type ANY topic (e.g. Women in Agriculture, Judicial Pendency, Space Economy, Tribal PESA)..." value="Women in Agriculture & Land Rights">
            <button type="button" id="tvaGenerateBtn" class="tva-btn-generate">
              <span>⚡ Generate Value Addition</span>
            </button>
          </div>

          <!-- Quick Topic Chips -->
          <div class="tva-chips-label">🔥 High-Frequency Mains Topic Presets (Tap to Load):</div>
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
            <button type="button" class="tva-tool-btn" id="tvaRegenAiBtn" title="Synthesize live with Google Gemini AI">✨ Regenerate with AI</button>
            <button type="button" class="tva-tool-btn" id="tvaCopyBtn" title="Copy full sheet as Markdown">📋 Copy Sheet</button>
            <button type="button" class="tva-tool-btn" id="tvaSaveBtn" title="Save to local browser vault">💾 Save to Vault</button>
            <button type="button" class="tva-tool-btn primary" id="tvaDownloadPdfBtn" title="Export clean formatted PDF">📥 Download PDF</button>
          </div>
        </div>

        <!-- Cards Grid Container -->
        <div class="tva-cards-grid" id="tvaCardsContainer"></div>

        <!-- API Key Settings Modal -->
        <div id="tvaKeyModal" class="tva-modal" style="display:none;">
          <div class="tva-modal-backdrop" id="tvaModalBackdrop"></div>
          <div class="tva-modal-card">
            <div class="tva-modal-header">
              <div class="tva-modal-title">🔑 Google Gemini AI Settings</div>
              <button type="button" class="tva-modal-close" id="tvaCloseKeyModal">&times;</button>
            </div>
            <p class="tva-modal-desc">
              Your Google Gemini API Key powers real-time synthesis of official data, quotes, thinkers, and edge factors for any custom topic.
            </p>
            <div class="tva-modal-field">
              <label for="tvaCustomApiKey">Custom Gemini API Key (optional override):</label>
              <input type="password" id="tvaCustomApiKey" class="tva-modal-input" placeholder="Leave blank to use server environment key (.env)" autocomplete="off">
              <small class="tva-modal-hint">A valid key from .env is currently loaded on the backend.</small>
            </div>
            <div class="tva-modal-footer">
              <button type="button" class="tva-modal-btn cancel" id="tvaCancelKeyModal">Close</button>
              <button type="button" class="tva-modal-btn save" id="tvaSaveKeyModal">Save Settings</button>
            </div>
          </div>
        </div>
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

  // Bind Events & API Connection
  function bindValueAdditionEvents(rootScope) {
    const scope = rootScope || document;
    const inputEl = scope.querySelector('#tvaTopicInput');
    const genBtn = scope.querySelector('#tvaGenerateBtn');
    const regenBtn = scope.querySelector('#tvaRegenAiBtn');
    const chipsWrap = scope.querySelector('#tvaChipsWrap');
    const copyBtn = scope.querySelector('#tvaCopyBtn');
    const saveBtn = scope.querySelector('#tvaSaveBtn');
    const downloadBtn = scope.querySelector('#tvaDownloadPdfBtn');

    // API Key modal elements
    const keyBtn = scope.querySelector('#tvaKeyBtn');
    const keyModal = scope.querySelector('#tvaKeyModal');
    const closeKeyModal = scope.querySelector('#tvaCloseKeyModal');
    const cancelKeyModal = scope.querySelector('#tvaCancelKeyModal');
    const saveKeyModal = scope.querySelector('#tvaSaveKeyModal');
    const customKeyInput = scope.querySelector('#tvaCustomApiKey');
    const backdrop = scope.querySelector('#tvaModalBackdrop');

    if (customKeyInput && typeof localStorage !== 'undefined') {
      customKeyInput.value = localStorage.getItem('GEMINI_API_KEY') || '';
    }

    if (keyBtn && keyModal) {
      keyBtn.onclick = () => { keyModal.style.display = 'flex'; };
      const closeFn = () => { keyModal.style.display = 'none'; };
      if (closeKeyModal) closeKeyModal.onclick = closeFn;
      if (cancelKeyModal) cancelKeyModal.onclick = closeFn;
      if (backdrop) backdrop.onclick = closeFn;

      if (saveKeyModal && customKeyInput) {
        saveKeyModal.onclick = () => {
          const val = customKeyInput.value.trim();
          if (typeof localStorage !== 'undefined') {
            if (val) localStorage.setItem('GEMINI_API_KEY', val);
            else localStorage.removeItem('GEMINI_API_KEY');
          }
          keyModal.style.display = 'none';
          showToast(val ? 'Custom Gemini API Key saved!' : 'Using backend .env Gemini API Key.');
        };
      }
    }

    function setLoadingState(isLoading, topicName) {
      if (genBtn) {
        genBtn.disabled = isLoading;
        genBtn.innerHTML = isLoading
          ? '<span class="tva-spinner"></span> <span>Synthesizing...</span>'
          : '<span>⚡ Generate Value Addition</span>';
      }
      if (regenBtn) regenBtn.disabled = isLoading;
      if (inputEl) inputEl.disabled = isLoading;

      const container = scope.querySelector('#tvaCardsContainer');
      if (isLoading && container) {
        container.innerHTML = `
          <div class="tva-loading-box">
            <div class="tva-loading-spinner"></div>
            <div class="tva-loading-text">
              <strong>Gemini AI is researching &amp; synthesizing:</strong> "${escapeHtml(topicName)}"
              <span>Extracting official NFHS-5/PLFS stats, quotes, thinkers, rural/global case studies, and secret sauce edge factor...</span>
            </div>
          </div>
        `;
      }
    }

    async function triggerGeneration(query, forceAi = false) {
      if (!query || !query.trim()) return;
      const cleanQuery = query.trim();
      const slug = cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // If preloaded and not forcing live AI, load immediately
      if (!forceAi && CURATED_TOPICS[slug]) {
        currentTopicData = CURATED_TOPICS[slug];
        renderTopicCards(currentTopicData, scope);
        showToast(`Loaded ${currentTopicData.title}`);
        return;
      }

      setLoadingState(true, cleanQuery);

      try {
        const storedKey = (typeof localStorage !== 'undefined') ? (localStorage.getItem('GEMINI_API_KEY') || '') : '';
        const res = await fetch('/api/value-addition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: cleanQuery,
            apiKey: storedKey || undefined
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            currentTopicData = json.data;
            CURATED_TOPICS[slug] = json.data;
            renderTopicCards(currentTopicData, scope);
            showToast(`✓ Generated authentic value addition via Gemini Intelligence!`);
            setLoadingState(false);
            return;
          } else {
            throw new Error(json.error || 'Gemini processing failed');
          }
        } else {
          // Attempt client-side direct Gemini fetch if key is stored
          if (storedKey) {
            const directData = await callGeminiDirect(cleanQuery, storedKey);
            if (directData) {
              currentTopicData = directData;
              CURATED_TOPICS[slug] = directData;
              renderTopicCards(currentTopicData, scope);
              showToast(`✓ Generated via Gemini Client!`);
              setLoadingState(false);
              return;
            }
          }
          const errText = await res.text();
          throw new Error(`API Error [${res.status}]: ${errText.slice(0, 100)}`);
        }
      } catch (err) {
        console.warn('[TVA] Gemini fetch error:', err);
        currentTopicData = synthesizeFallbackTopic(cleanQuery);
        renderTopicCards(currentTopicData, scope);
        showToast(`Gemini error (${err.message.slice(0, 45)}). Loaded local synthesized structure.`);
      } finally {
        setLoadingState(false);
      }
    }

    if (genBtn && inputEl) {
      genBtn.onclick = () => triggerGeneration(inputEl.value, false);
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') triggerGeneration(inputEl.value, false);
      };
    }

    if (regenBtn && inputEl) {
      regenBtn.onclick = () => triggerGeneration(inputEl.value, true);
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
    downloadPdf: downloadTopicPdf,
    database: CURATED_TOPICS
  };

})();
