/**
 * ============================================================
 * GS TOPPER ANSWER FRAMEWORK MODULE (gs-framework.js)
 * Self-contained module for gs.html
 * ============================================================
 */

(function initGsFramework() {
  'use strict';

  // Framework HTML Template
  const GS_FRAMEWORK_HTML = `
    <div class="fw-root" id="gsFrameworkContainer">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;">
        <div>
          <span class="fw-badge">🏆 FORENSIC TOPPER ANALYSIS</span>
          <h2 class="fw-title" style="margin-top:0.4rem;">UPSC GS Master Answer Frameworks</h2>
          <p class="fw-subtitle">Battle-tested templates, intro formulas, micro-diagrams, and value-additions extracted directly from answer sheets of Aditya Srivastava (AIR 1), Animesh Pradhan (AIR 2), Kunal Rastogi (AIR 15), and Ishita Kishore (AIR 1).</p>
        </div>
      </div>

      <!-- Sub-Navigation -->
      <div class="fw-nav" id="gsFwSubNav">
        <button class="fw-nav-btn active" data-sub="universal">⭐ Universal Architecture</button>
        <button class="fw-nav-btn" data-sub="essay">📝 Essay (149 Marks)</button>
        <button class="fw-nav-btn" data-sub="gs1">🏛️ GS-1 (Hist, Geo, Soc)</button>
        <button class="fw-nav-btn" data-sub="gs2">⚖️ GS-2 (Polity, Gov, IR)</button>
        <button class="fw-nav-btn" data-sub="gs3">📈 GS-3 (Eco, Env, Sec)</button>
        <button class="fw-nav-btn" data-sub="gs4">🧭 GS-4 (Ethics & Cases)</button>
        <button class="fw-nav-btn" data-sub="walkthrough">🔍 Model Walkthrough</button>
        <button class="fw-nav-btn" data-sub="checklist">✅ 15-Sec Checklist</button>
        <button class="fw-nav-btn" data-sub="va-engine" style="background:rgba(217,119,6,0.12); border-color:#f59e0b; color:#b45309; font-weight:700;">💎 Value Addition Engine</button>
      </div>

      <!-- SECTION 1: UNIVERSAL ARCHITECTURE -->
      <div class="fw-section active" id="sub-universal">
        <h3 class="fw-title">1. Decoding Demand & Directives</h3>
        <p class="fw-subtitle">Average aspirants write essays on the generic topic; toppers answer the exact directive and dismantle multi-clause questions into explicit sub-headings.</p>

        <div class="fw-table-wrap">
          <table class="fw-table">
            <thead>
              <tr><th>Directive</th><th>What Average Aspirants Do (Wrong)</th><th>What AIR 1–20 Toppers Do (Correct)</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Critically Examine / Analyze</strong></td>
                <td>Writes only the negatives or general criticism.</td>
                <td>Presents both sides (60% affirmative / 40% challenges or vice-versa), evaluates root causes, and finishes with an actionable structural synthesis.</td>
              </tr>
              <tr>
                <td><strong>Elucidate / Bring Out</strong></td>
                <td>Explains vaguely without substantiation.</td>
                <td>Explains cause-and-effect with concrete empirical data, case laws, and institutional examples to prove the statement.</td>
              </tr>
              <tr>
                <td><strong>To what extent...</strong></td>
                <td>Argues entirely "Yes" or entirely "No".</td>
                <td>Explicitly demarcates where the policy succeeds (Extent A) vs where it falls short (Limiting Boundaries B).</td>
              </tr>
              <tr>
                <td><strong>Evaluate / Assess</strong></td>
                <td>Gives personal opinion with emotional tone.</td>
                <td>Uses objective yardsticks (targets vs outcomes, budget outlay vs ground absorption, international rankings).</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="fw-title" style="margin-top:2rem;">2. The 4 Introduction Formulas (First 25 Words)</h3>
        <div class="fw-grid-2">
          <div class="fw-card">
            <div class="fw-card-header">
              <h4 class="fw-card-title">Formula A: Data / Index Hook</h4>
              <span class="fw-badge">High Impact</span>
            </div>
            <p style="font-size:0.85rem; color:#475569; margin:0 0 0.5rem;">Lead with official surveys (NFHS-5, Periodic Labour Force Survey, NITI Aayog SDG Index, WEF Gender Gap):</p>
            <div class="fw-callout">
              <em>"As per NFHS-5, while institutional births rose to 88.6%, female anaemia surged to 57%, reflecting persistent systemic nutritional deprivation."</em>
            </div>
          </div>

          <div class="fw-card">
            <div class="fw-card-header">
              <h4 class="fw-card-title">Formula B: Constitutional Hook</h4>
              <span class="fw-badge">Polity / Governance</span>
            </div>
            <p style="font-size:0.85rem; color:#475569; margin:0 0 0.5rem;">Lead with the Constitutional Article, Doctrine, or Preamble mandate:</p>
            <div class="fw-callout">
              <em>"Rooted in Article 21 (Right to Livelihood) and Article 39(b/c) of DPSP, the state is constitutionally bound to democratize economic assets..."</em>
            </div>
          </div>

          <div class="fw-card">
            <div class="fw-card-header">
              <h4 class="fw-card-title">Formula C: Authoritative Definition</h4>
              <span class="fw-badge">Economy / S&T / Env</span>
            </div>
            <p style="font-size:0.85rem; color:#475569; margin:0 0 0.5rem;">Standard international definitions (World Bank, WHO, IPCC, FAO):</p>
            <div class="fw-callout">
              <em>"According to IPCC AR6, 'Loss and Damage' encapsulates economic and non-economic reparations for irreversible climate impacts beyond adaptation limits."</em>
            </div>
          </div>

          <div class="fw-card">
            <div class="fw-card-header">
              <h4 class="fw-card-title">Formula D: Contextual Legal Trigger</h4>
              <span class="fw-badge">Current Affairs</span>
            </div>
            <p style="font-size:0.85rem; color:#475569; margin:0 0 0.5rem;">Recent Supreme Court judgment, Law Commission report, or Statutory Bill:</p>
            <div class="fw-callout">
              <em>"The Supreme Court's verdict in Supriyo v. UOI (2023) has reignited the balance between civil rights recognition and legislative prerogative."</em>
            </div>
          </div>
        </div>

        <h3 class="fw-title" style="margin-top:2rem;">3. Multi-Dimensional Body Engine: PESTLE-S</h3>
        <p class="fw-subtitle">Never write unstructured points. Categorize every 10M or 15M answer under these multidimensional domains:</p>
        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">🏛️ Institutional &amp; Legal</h4>
            <ul class="fw-list">
              <li><strong>Political / Federal:</strong> Center-state frictions, asymmetric federalism, legislative delays.</li>
              <li><strong>Legal / Statutory:</strong> Ambiguous drafting, judicial backlog (4.5 Cr cases), enforcement deficit.</li>
              <li><strong>Administrative:</strong> Bureaucratic inertia, lack of lateral specialization, departmental silos.</li>
            </ul>
          </div>
          <div class="fw-card">
            <h4 class="fw-card-title">🌱 Socio-Economic &amp; Ecological</h4>
            <ul class="fw-list">
              <li><strong>Economic / Fiscal:</strong> High revenue expenditure vs low capex, NPA stress, informal sector drag.</li>
              <li><strong>Social / Vulnerable:</strong> Gender divide (24% FLFPR), caste exclusion, geriatric challenges.</li>
              <li><strong>Environmental / Tech:</strong> Climate vulnerability, carbon intensity, digital divide, AI privacy risks.</li>
            </ul>
          </div>
        </div>

        <h3 class="fw-title" style="margin-top:2rem;">4. Micro-Diagrams: 4 Essential Visual Anchors</h3>
        <p class="fw-subtitle">Every topper copy features 4–7 diagrams per paper. Keep them minimal (15 seconds to draw):</p>
        <div class="fw-grid-2">
          <div class="fw-diagram-box">
<strong>A. HUB &amp; SPOKE (Multi-factors)</strong>
<pre>
          [ Economic ]
               ▲
               │
 [ Legal ] ◄───●───► [ Social ]
               │
               ▼
         [ Ecological ]
</pre>
          </div>
          <div class="fw-diagram-box">
<strong>B. 2-COLUMN COMPARISON</strong>
<pre>
 Dimension     │ Approach A │ Approach B
───────────────┼────────────┼───────────
 Legal Mandate │ Art. 356   │ Art. 365
 Judicial Rev. │ S.R.Bommai │ Rameshwar
</pre>
          </div>
          <div class="fw-diagram-box">
<strong>C. PROCESS PIPELINE (Policy Flow)</strong>
<pre>
 [ Inputs ] ──► [ Throughput ] ──► [ Outcomes ]
 (Budget/Infra)  (Red Tape/DBT)   (SDG Target)
</pre>
          </div>
          <div class="fw-diagram-box">
<strong>D. SPATIAL ANCHOR (India Map)</strong>
<pre>
  ▲ North: Himalayan glacial melt
  ◄ West: Desertification &amp; drought
  ► East: Flood-drought paradox
  ▼ South: Coastal inundation &amp; cyclones
</pre>
          </div>
        </div>
      </div>

      <!-- SECTION 2: ESSAY -->
      <div class="fw-section" id="sub-essay">
        <h3 class="fw-title">Essay Master Blueprint (145–149 Marks)</h3>
        <p class="fw-subtitle">Derived from copies of Gautam Vivekanandan (AIR 211, 149 Marks), Ramesh Verma (AIR 150, 148 Marks), and Smriti Mishra (AIR 4, 145 Marks).</p>

        <div class="fw-callout">
          <strong>The Golden 3-Phase Essay Architecture (1,000–1,200 words):</strong>
          1. <strong>Anecdotal Hook (100–150 words):</strong> An evocative historical event, mythological allegory, or personal dilemma framing the core philosophical thesis statement.<br>
          2. <strong>Multi-Dimensional Expansion (700–800 words):</strong> 360-degree traversal across individual, societal, political, historical, scientific, and global planes.<br>
          3. <strong>Anti-Thesis &amp; Caveats (150 words):</strong> Demonstrates critical nuance by exploring boundaries where the proverb or thesis is challenged.<br>
          4. <strong>Circular Conclusion (100 words):</strong> Connects back to the opening anecdote, ending on an inspiring, visionary cadence.
        </div>

        <h4 class="fw-card-title" style="margin-top:1.5rem;">The 360-Degree Expansion Compass</h4>
        <div class="fw-table-wrap">
          <table class="fw-table">
            <thead><tr><th>Dimension</th><th>Key Themes &amp; Thinkers</th><th>Real Topper Example</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Psychological / Individual</strong></td>
                <td>Self-actualization (Maslow), cognitive bias, moral conscience vs temptation.</td>
                <td>Gandhi’s talisman; Nelson Mandela’s 27 years in Robben Island prison.</td>
              </tr>
              <tr>
                <td><strong>Social &amp; Cultural</strong></td>
                <td>Patriarchy, caste rigidity vs social mobility, collective effervescence.</td>
                <td>Savitribai Phule breaking orthodox taboos for girls' education in Pune.</td>
              </tr>
              <tr>
                <td><strong>Political &amp; Governance</strong></td>
                <td>Social contract (Rousseau, Locke), institutional accountability, demagoguery.</td>
                <td>Ambedkar’s warning against hero-worship (Bhakti in politics) in the Constituent Assembly.</td>
              </tr>
              <tr>
                <td><strong>Economic &amp; Environmental</strong></td>
                <td>Growth vs development (Amartya Sen), consumerism, Tragedy of the Commons.</td>
                <td>Chipko Movement &amp; Wangari Maathai’s Green Belt Movement in Kenya.</td>
              </tr>
              <tr>
                <td><strong>Scientific &amp; Philosophical</strong></td>
                <td>Technological hubris, Artificial Intelligence ethics, Oppenheimer dilemma.</td>
                <td>Promethean fire metaphor; Yuval Noah Harari's warning on digital dictatorships.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: GS-1 -->
      <div class="fw-section" id="sub-gs1">
        <h3 class="fw-title">GS-1: History, Geography &amp; Indian Society</h3>
        <p class="fw-subtitle">Derived from Ishita Kishore (AIR 1, 121 Marks) and Animesh Pradhan (AIR 2, 109 Marks).</p>

        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">🏛️ History, Art &amp; Culture</h4>
            <ul class="fw-list">
              <li><strong>Draw Architectural Cross-Sections:</strong> For temple architecture questions, sketch the <em>Nagara</em> (Curvilinear Shikhara, Mandapa, Garbhagriha, Jagati) vs <em>Dravida</em> (Pyramidal Vimana, Gopuram, Temple Tank).</li>
              <li><strong>Link Art to Socio-Political Economy:</strong> Do not just describe art forms; explain royal patronage (Chola bronze reflecting Saivite royal legitimation, Mauryan pillars as imperial edicts).</li>
              <li><strong>Chronological Timelines:</strong> Use a horizontal timeline for freedom movement questions (e.g., 1919 Khilafat &rarr; 1920 NCM &rarr; 1922 Chauri Chaura &rarr; 1923 Swarajists).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🌍 Physical &amp; Human Geography</h4>
            <ul class="fw-list">
              <li><strong>The 3-Step Physical Formula:</strong> Always split into: <code>1. Geomorphological Cause</code> &rarr; <code>2. Spatial Distribution</code> &rarr; <code>3. Socio-Economic Repercussion</code>.</li>
              <li><strong>Scientific Terminology:</strong> Quote Koppen climate classification codes (Amw, BWhw), Plate boundary types (destructive subduction zones vs conservative transform faults).</li>
              <li><strong>15-Second India Map:</strong> Mark industrial corridors (DMIC), vulnerability belts (Zone V seismic regions), or river inter-linking links.</li>
            </ul>
          </div>
        </div>

        <div class="fw-card" style="margin-top:1.2rem;">
          <h4 class="fw-card-title">👥 Indian Society (Sociology-Lite Value Additions)</h4>
          <p style="font-size:0.85rem; color:#475569; margin:0 0 0.5rem;">Average answers sound like lay essays; toppers inject conceptual rigor:</p>
          <div class="fw-grid-2">
            <div>
              <p style="font-size:0.82rem; margin:0 0 0.4rem;"><strong>Feminization of Poverty / Work:</strong></p>
              <div class="fw-callout">Cite agrarian distress pushing men to urban informal jobs while women remain unpaid farm labour (Bina Agarwal).</div>
            </div>
            <div>
              <p style="font-size:0.82rem; margin:0 0 0.4rem;"><strong>Cultural Lag (William Ogburn):</strong></p>
              <div class="fw-callout">Material technology progresses rapidly (smartphones) while non-material culture (patriarchy, khap attitudes) lags behind.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: GS-2 -->
      <div class="fw-section" id="sub-gs2">
        <h3 class="fw-title">GS-2: Polity, Governance, Social Justice &amp; IR</h3>
        <p class="fw-subtitle">Derived from Kunal Rastogi (AIR 15, 134 Marks), Aditya Srivastava (AIR 1, 132 Marks), and Vaishali (AIR 23, 135 Marks).</p>

        <div class="fw-callout">
          <strong>The GS-2 Quadruple Anchor (Every Answer Must Contain):</strong>
          1. <strong>Constitutional Article:</strong> Exact Article number (e.g., Art. 163, Art. 243G, Art. 280, Art. 356).<br>
          2. <strong>Landmark SC Judgment:</strong> Bommai, Puttaswamy, Indira Sawhney, Kesavananda Bharati, Lily Thomas.<br>
          3. <strong>Institutional / Empirical Reality:</strong> ADR candidate data, PRS legislative session hours, NCRB statistics.<br>
          4. <strong>Authoritative Recommendation:</strong> 2nd ARC Report name, Law Commission Report, Sarkaria / Punchhi Commissions.
        </div>

        <h4 class="fw-card-title" style="margin-top:1.5rem;">Essential Supreme Court Case Law Matrix for GS-2</h4>
        <div class="fw-table-wrap">
          <table class="fw-table">
            <thead><tr><th>Topic</th><th>Landmark Case Laws</th><th>Constitutional Application</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Federalism &amp; Art. 356</strong></td>
                <td><em>S.R. Bommai (1994), NCT Delhi v. UOI (2023)</em></td>
                <td>Federalism as Basic Structure; elected state cabinet has supremacy over bureaucratic transfers.</td>
              </tr>
              <tr>
                <td><strong>Governor Discretion</strong></td>
                <td><em>Nabam Rebia (2016), Shamsher Singh (1974), Punjab Govt (2023)</em></td>
                <td>Governor cannot withhold bills indefinitely (Art. 200) or summon assemblies without cabinet advice.</td>
              </tr>
              <tr>
                <td><strong>Elections &amp; Decriminalization</strong></td>
                <td><em>ADR (2002), Lily Thomas (2013), Public Interest Foundation (2018)</em></td>
                <td>Mandatory disclosure of criminal antecedents; instant disqualification of convicted legislators.</td>
              </tr>
              <tr>
                <td><strong>Privacy, Data &amp; Tech</strong></td>
                <td><em>K.S. Puttaswamy (2017), Anuradha Bhasin (2020)</em></td>
                <td>Right to privacy as Fundamental Right; internet shutdown proportionality test under Art. 19(1)(a).</td>
              </tr>
              <tr>
                <td><strong>Social Justice &amp; Affirmative Action</strong></td>
                <td><em>Indira Sawhney (1992), Jarnail Singh (2018), Janhit Abhiyan (2022)</em></td>
                <td>50% ceiling rule; creamy layer exclusion; upholding 10% EWS reservation under 103rd Amendment.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 5: GS-3 -->
      <div class="fw-section" id="sub-gs3">
        <h3 class="fw-title">GS-3: Economy, Agriculture, Environment &amp; Security</h3>
        <p class="fw-subtitle">Derived from Khushhali Solanki (AIR 61, 106 Marks) and Animesh Pradhan (AIR 2, 103 Marks).</p>

        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">🌾 Agriculture &amp; Food Processing</h4>
            <ul class="fw-list">
              <li><strong>Structural Ratios:</strong> 45.5% workforce dependent, contributes ~18% to GVA, public capex in agriculture stuck under 15%.</li>
              <li><strong>Committees:</strong> Ashok Dalwai Committee (Doubling farmers' income through agri-logistics), Shanta Kumar Committee (Restructuring FCI &amp; DBT food subsidy).</li>
              <li><strong>Value Chains:</strong> Plug post-harvest loss (15–20% in perishables) via PM-KMY, Agri Infra Fund, and FPOs.</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🏭 Economy &amp; Manufacturing</h4>
            <ul class="fw-list">
              <li><strong>Manufacturing Share:</strong> 16% GDP (stagnant) vs 25% target under National Manufacturing Policy.</li>
              <li><strong>Logistics Cost:</strong> 13–14% GDP vs 8% global benchmark (National Logistics Policy &amp; PM Gati Shakti).</li>
              <li><strong>Committees:</strong> N.K. Singh Committee (Debt-to-GDP targets 60% combined), P.J. Nayak Committee (Bank Board Bureau &amp; Governance).</li>
            </ul>
          </div>
        </div>

        <div class="fw-grid-2" style="margin-top:1rem;">
          <div class="fw-card">
            <h4 class="fw-card-title">🌿 Environment &amp; Disaster Management</h4>
            <ul class="fw-list">
              <li><strong>COP26 Panchamrit Targets:</strong> 500 GW non-fossil capacity, 50% renewable energy by 2030, 1 billion tonne carbon reduction, net-zero by 2070.</li>
              <li><strong>Disaster Framework:</strong> Sendai Framework 4 Priorities (Risk understanding, Governance, Resilient investment, Build Back Better).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🛡️ Internal Security &amp; Cyber</h4>
            <ul class="fw-list">
              <li><strong>Security Doctrines:</strong> Shekatkar Committee (Defence budget optimization), Kelkar Committee (Strategic partnerships).</li>
              <li><strong>Threat Triad:</strong> Narco-terror nexus (Golden Crescent &amp; Golden Triangle), Cyber warfare (CERT-In / Budapest Convention debates).</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SECTION 6: GS-4 -->
      <div class="fw-section" id="sub-gs4">
        <h3 class="fw-title">GS-4: Ethics, Integrity &amp; Aptitude</h3>
        <p class="fw-subtitle">Derived from Aditya Srivastava (AIR 1, 143 Marks - Highest in India) and Garima Lohia (AIR 2, 141 Marks).</p>

        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">Section A: Theory &amp; Quotation Blueprint</h4>
            <ul class="fw-list">
              <li><strong>Dual-Sphere Examples:</strong> For every value (e.g., Integrity, Fortitude), give TWO concrete examples:
                <br>&bull; <em>Personal / Private life:</em> Family values, honesty when unobserved.
                <br>&bull; <em>Public Administration:</em> T.N. Seshan (electoral integrity), E. Sreedharan (probity in DMRC), Armstrong Pame (People's Road).</li>
              <li><strong>Philosophical Triangulation:</strong> Ground ethical justifications in Deontology (Kant’s Categorical Imperative), Utilitarianism (Bentham/Mill), Virtue Ethics (Aristotle), and Indian Philosophy (Nishkama Karma of Bhagavad Gita).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">Section B: Case Study 5-Step Architecture</h4>
            <ul class="fw-list">
              <li><strong>1. Summary of Dilemma:</strong> 1-line statement of the core conflict (e.g., Economic Development vs Indigenous Tribal Rights).</li>
              <li><strong>2. Stakeholder Matrix:</strong> Primary (Victims/Community), Secondary (Police/Admin), Tertiary (Rule of Law, Public Trust).</li>
              <li><strong>3. Value Conflicts:</strong> Procedural Law vs Compassion, Administrative Efficiency vs Transparency.</li>
              <li><strong>4. Options Evaluation:</strong> 3 options with Pros &amp; Cons. Reject extreme inaction or arbitrary illegality.</li>
              <li><strong>5. Chosen Course:</strong> <code>Immediate</code> &rarr; <code>Short-term</code> &rarr; <code>Long-term Structural Reforms</code>.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SECTION 7: MODEL WALKTHROUGH -->
      <div class="fw-section" id="sub-walkthrough">
        <h3 class="fw-title">Side-by-Side Walkthrough: Average vs AIR 1</h3>
        <p class="fw-subtitle">Real Question: <em>"The Governor is not an agent of the Center, yet the office often functions as one. Critically evaluate in the light of recent controversies."</em> (GS-2, 15 Marks)</p>

        <div class="fw-comp-grid">
          <div class="fw-comp-box avg">
            <span class="comp-tag">❌ AVERAGE ASPIRANT (Score: 5 / 15)</span>
            <h4>Generic Narrative &amp; Vague Complaints</h4>
            <p><strong>Opening:</strong> "Governor is appointed by President under Article 153. Governor is constitutional head of state. Recently there are many controversies."</p>
            <p><strong>Body Points:</strong></p>
            <ul>
              <li>Governor works on advice of ruling party in center.</li>
              <li>Delays bills passed by state government.</li>
              <li>Misuse of Article 356 in past years.</li>
              <li>Creates problems for Chief Minister in daily governance.</li>
              <li>Examples: Kerala, West Bengal, Tamil Nadu governors.</li>
            </ul>
            <p><strong>Conclusion:</strong> "Governor should be neutral and center and state should work with harmony."</p>
            <p style="font-size:0.78rem; color:#DC2626;"><strong>Examiner Verdict:</strong> Zero case laws, no constitutional articles beyond Art. 153, purely descriptive media-style opinion.</p>
          </div>

          <div class="fw-comp-box top">
            <span class="comp-tag">✅ TOPPER BLUEPRINT (Aditya Srivastava / Kunal Rastogi - Score: 11.5 / 15)</span>
            <h4>Constitutional Rigor, Case Laws &amp; Structural Solutions</h4>
            <p><strong>Opening:</strong> "In <em>Hargovind Pant v. Dr. Raghukul Tilak (1979)</em>, the Supreme Court ruled that the Governor’s office is an independent constitutional post, neither an employee nor subordinate of the Union Government."</p>
            <p><strong>Body Sub-Heading 1: Manifestation of 'Agency' Role (Controversies):</strong></p>
            <ul>
              <li><strong>Pocket Veto on State Legislation:</strong> Indefinite withholding of bills bypassing Art. 200 (Addressed in <em>State of Punjab v. Principal Secretary to Governor, 2023</em>).</li>
              <li><strong>Floor Test Arbitrariness:</strong> Invoking Art. 174 without objective evidence of majority loss (Violating <em>Shiv Sena v. UOI, 2023</em>).</li>
              <li><strong>President's Rule Invocations:</strong> Diluting the objective criteria laid down in <em>S.R. Bommai (1994)</em>.</li>
            </ul>
            <p><strong>Body Sub-Heading 2: Why Constitutional Independence is Essential:</strong></p>
            <ul>
              <li>Sentinel of Constitutional Machinery (Art. 355) against secessionist or ultra-vires legislation.</li>
              <li>Asymmetric Federal Bridge for 6th Schedule tribal autonomy &amp; Art. 371 special provisions.</li>
            </ul>
            <p><strong>Way Forward (Institutional Anchors):</strong></p>
            <ul>
              <li><strong>Sarkaria Commission:</strong> Appoint eminent non-partisan persons in consultation with State CM.</li>
              <li><strong>Punchhi Commission:</strong> Introduce fixed 6-week timeline for Art. 200 assent; impeach Governor by State Assembly.</li>
              <li><strong>2nd ARC (7th Report):</strong> Written reasoning must be tabled before President when reserving bills.</li>
            </ul>
            <p style="font-size:0.78rem; color:#15803D;"><strong>Examiner Verdict:</strong> High precision, 5 SC judgments, 3 official committee solutions, balanced constitutional appraisal.</p>
          </div>
        </div>
      </div>

      <!-- SECTION 8: 15-SECOND CHECKLIST -->
      <div class="fw-section" id="sub-checklist">
        <h3 class="fw-title">The 15-Second Pre-Submission Checklist</h3>
        <p class="fw-subtitle">Before putting down the pen on any GS answer in Mains, verify these 6 elements:</p>

        <div class="fw-checklist-grid">
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>Direct Directive addressed (Critically examine, Evaluate)?</span>
          </div>
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>Intro has an official anchor (Data / Article / Definition)?</span>
          </div>
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>Question clauses mirrored into clear Sub-Headings?</span>
          </div>
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>At least 1 visual anchor (Hub-Spoke / 2-Col Grid / Map)?</span>
          </div>
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>At least 2 value-adds (SC Case / Scheme / Committee)?</span>
          </div>
          <div class="fw-check-item">
            <span class="check-icon">✓</span>
            <span>Actionable Way Forward (2nd ARC / NITI Aayog @75)?</span>
          </div>
        </div>
      </div>

      <!-- SECTION 9: VALUE ADDITION ENGINE -->
      <div class="fw-section" id="sub-va-engine">
        <div id="gsFwVaMount"></div>
      </div>
    </div>
  `;

  // Make available globally
  const rootObj = typeof window !== 'undefined' ? window : globalThis;
  rootObj.GS_FRAMEWORK = {
    html: GS_FRAMEWORK_HTML,
    init: function() {
      const container = document.getElementById('content');
      if (!container) return;

      // Handle sub-tab clicks inside framework
      const subNav = document.getElementById('gsFwSubNav');
      if (subNav) {
        subNav.querySelectorAll('.fw-nav-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const sub = btn.getAttribute('data-sub');
            subNav.querySelectorAll('.fw-nav-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('#gsFrameworkContainer .fw-section').forEach(sec => {
              sec.classList.toggle('active', sec.id === 'sub-' + sub);
            });
            if (sub === 'va-engine' && window.TOPPER_VALUE_ADDITION) {
              window.TOPPER_VALUE_ADDITION.renderInto(document.getElementById('gsFwVaMount'));
            }
          });
        });
      }
    },
    switchSub: function(subName) {
      const btn = document.querySelector(`#gsFwSubNav .fw-nav-btn[data-sub="${subName}"]`);
      if (btn) btn.click();
    }
  };

})();
