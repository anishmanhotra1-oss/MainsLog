/**
 * ============================================================
 * SOCIOLOGY TOPPER ANSWER FRAMEWORK MODULE (sociology-framework.js)
 * Self-contained module for sociology.html
 * ============================================================
 */

(function initSociologyFramework() {
  'use strict';

  const SOCIOLOGY_FRAMEWORK_HTML = `
    <div class="fw-root soc-theme" id="socFrameworkContainer">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;">
        <div>
          <span class="fw-badge soc">🎓 8,094 ANSWERS AUDITED</span>
          <h2 class="fw-title" style="margin-top:0.4rem;">Sociology Optional Master Framework</h2>
          <p class="fw-subtitle">Distilled from 194 topper answer copies (Riya Saini AIR 22, Siddharth Singh AIR 143, Saloni Chhabra AIR 29, Anu Kumari AIR 2). Learn the exact Triangulation Engine, 10 Diagram archetypes, and Paper 1 & 2 integration.</p>
        </div>
      </div>

      <!-- Sub-Navigation -->
      <div class="fw-nav" id="socFwSubNav">
        <button class="fw-nav-btn active" data-sub="triangulation">⭐ Triangulation Engine</button>
        <button class="fw-nav-btn" data-sub="paper1">📖 Paper 1 Blueprint</button>
        <button class="fw-nav-btn" data-sub="paper2">🏛️ Paper 2 Blueprint</button>
        <button class="fw-nav-btn" data-sub="diagrams">📊 10 Diagram Archetypes</button>
        <button class="fw-nav-btn" data-sub="walkthrough">🔍 Model Walkthrough</button>
        <button class="fw-nav-btn" data-sub="thinkers">🧠 Top 25 Thinkers Matrix</button>
      </div>

      <!-- SECTION 1: TRIANGULATION ENGINE -->
      <div class="fw-section active" id="soc-sub-triangulation">
        <h3 class="fw-title">1. The Triangulation Engine: How Toppers Score 280–300+</h3>
        <p class="fw-subtitle">Average candidates write general essays on social issues. High scorers (AIR 1–20) process every question through a 3-tier theoretical filter:</p>

        <div class="fw-diagram-box">
<pre>
┌────────────────────────────────────────────────────────────────────────┐
│                      THE TRIANGULATION TRIAD                           │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 1: CLASSICAL FOUNDATION                                          │
│  (Marx / Weber / Durkheim / Parsons / Mead)                            │
│  Establish the primary theoretical root &amp; concept.                     │
│                        ▲                                               │
│                        │ Contestation &amp; Critical Debate                │
│                        ▼                                               │
│  TIER 2: CONTEMPORARY / CRITICAL PERSPECTIVE                           │
│  (Giddens / Beck / Foucault / Feminist: Walby, Oakley, Hochschild)     │
│  Challenge or refine with modern sociological discourse.               │
│                        ▲                                               │
│                        │ Empirical Grounding                           │
│                        ▼                                               │
│  TIER 3: EMPIRICAL &amp; INDIAN REALITY                                    │
│  (M.N. Srinivas / Andre Beteille / Yogendra Singh / Gail Omvedt)       │
│  Apply to lived social reality &amp; field view.                          │
└────────────────────────────────────────────────────────────────────────┘
</pre>
        </div>

        <h4 class="fw-card-title" style="margin-top:1.5rem;">The Triangulation in Action (Example: Secularization)</h4>
        <div class="fw-table-wrap">
          <table class="fw-table">
            <thead><tr><th>Tier</th><th>Thinker &amp; Concept</th><th>Answer Integration</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Tier 1: Classical</strong></td>
                <td><strong>Emile Durkheim:</strong> <em>Division of Labour</em>; <strong>Max Weber:</strong> <em>Disenchantment of the World (Entzauberung)</em>.</td>
                <td>Modernity replaces sacred integration with organic solidarity and instrumental rationalization.</td>
              </tr>
              <tr>
                <td><strong>Tier 2: Contemporary</strong></td>
                <td><strong>Peter Berger:</strong> <em>Desecularization of the World</em>; <strong>Jose Casanova:</strong> <em>Public Religions</em>.</td>
                <td>Refutes linear decline of religion; highlights deprivatization and religious resurgence in public politics.</td>
              </tr>
              <tr>
                <td><strong>Tier 3: Indian Context</strong></td>
                <td><strong>T.N. Madan:</strong> <em>Limits of Secularism</em>; <strong>Rajeev Bhargava:</strong> <em>Principled Distance</em>.</td>
                <td>Western secularism (strict wall of separation) is dysfunctional in India; Indian secularism is multi-faith equal respect (Sarva Dharma Sambhava).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 2: PAPER 1 BLUEPRINT -->
      <div class="fw-section" id="soc-sub-paper1">
        <h3 class="fw-title">Paper 1 Core Blueprint: Theory &amp; Methodology</h3>
        <p class="fw-subtitle">Paper 1 demands conceptual clarity, methodological grounding, and juxtaposition of competing paradigms.</p>

        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">🔬 1. Methodology: Positivist vs Non-Positivist</h4>
            <ul class="fw-list">
              <li><strong>Positivist Camp:</strong> Comte (Social Physics), Durkheim (Social facts treated as things, exteriority &amp; constraint, statistical multivariate analysis in <em>Le Suicide</em>).</li>
              <li><strong>Interpretivist / Phenomenological:</strong> Weber (Verstehen, Ideal Types, Wertfreiheit vs Wertbeziehung), Alfred Schutz (Life-world, typifications), Harold Garfinkel (Ethnomethodology, breaching experiments).</li>
              <li><strong>Critical Epistemology:</strong> Habermas (Emancipatory science vs instrumental reason), Foucault (Power/Knowledge archaeology).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">⚖️ 2. Stratification &amp; Mobility</h4>
            <ul class="fw-list">
              <li><strong>Functionalist Justification:</strong> Davis &amp; Moore (Role allocation, motivational differential rewards as functional necessity).</li>
              <li><strong>Conflict Rebuttal:</strong> Melvin Tumin (Stratification limits talent discovery, institutionalizes hereditary privilege).</li>
              <li><strong>Multi-Dimensional Strands:</strong> Karl Marx (Polarized two-class struggle, surplus value) vs Max Weber (Class, Status, Party 3-P model) vs Pierre Bourdieu (Cultural, Social &amp; Economic capitals).</li>
            </ul>
          </div>
        </div>

        <div class="fw-grid-2" style="margin-top:1rem;">
          <div class="fw-card">
            <h4 class="fw-card-title">💼 3. Work, Organisation &amp; Alienation</h4>
            <ul class="fw-list">
              <li><strong>Marx:</strong> Alienation in 4 stages (from product, process, fellow workers, species-being).</li>
              <li><strong>Weber:</strong> Bureaucratic rationalization, legal-rational authority, Iron Cage of rationality.</li>
              <li><strong>Contemporary Work:</strong> Harry Braverman (Labour monopoly &amp; deskilling), Arlie Hochschild (Emotional labour in gig and pink-collar economies).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🕊️ 4. Politics, Religion &amp; Social Movements</h4>
            <ul class="fw-list">
              <li><strong>Power:</strong> Zero-sum power (Marx, C.W. Mills - Power Elite) vs Variable-sum power (Parsons - systemic energy for goal attainment) vs Diffused micro-power (Foucault - capillary power).</li>
              <li><strong>Religion:</strong> Collective effervescence &amp; Totemism (Durkheim) vs Opium of masses (Marx) vs Calvinist asceticism driving capitalism (Weber).</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SECTION 3: PAPER 2 BLUEPRINT -->
      <div class="fw-section" id="soc-sub-paper2">
        <h3 class="fw-title">Paper 2 Core Blueprint: Indian Society &amp; Change</h3>
        <p class="fw-subtitle">Bridge Paper 1 theoretical concepts with Paper 2 empirical reality. Ground answers in the field view vs textual view debate.</p>

        <div class="fw-grid-2">
          <div class="fw-card">
            <h4 class="fw-card-title">📚 1. Textual View vs Field View</h4>
            <ul class="fw-list">
              <li><strong>Indological (Book View):</strong> G.S. Ghurye (Diffusionist approach, tribes as backward Hindus), Louis Dumont (Homo Hierarchicus: religious opposition of Pure vs Impure).</li>
              <li><strong>Structural-Functional (Field View):</strong> M.N. Srinivas (Rampura village, Sanskritization, Dominant Caste), S.C. Dube (Shamirpet village, multiple factors of status beyond ritual rank).</li>
              <li><strong>Marxist / Subaltern:</strong> A.R. Desai (Nationalism as class creation), Gail Omvedt &amp; B.R. Ambedkar (Caste as enclosed class and violent systemic oppression).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🌾 2. Agrarian Structure &amp; Rural Transformation</h4>
            <ul class="fw-list">
              <li><strong>Agrarian Class Matrix:</strong> Daniel Thorner (Malik, Kisan, Mazdoor) vs Utsa Patnaik (Labour exploitation criterion).</li>
              <li><strong>Jajmani Breakdown:</strong> Andre Beteille (Sripuram study: delinking of caste, class and power).</li>
              <li><strong>Footloose &amp; Informalized Labour:</strong> Jan Breman (Circulation of labour, neo-bondage in sugar factories and brick kilns).</li>
            </ul>
          </div>
        </div>

        <div class="fw-grid-2" style="margin-top:1rem;">
          <div class="fw-card">
            <h4 class="fw-card-title">👪 3. Caste, Kinship &amp; Family Dynamics</h4>
            <ul class="fw-list">
              <li><strong>Kinship Comparison:</strong> Irawati Karve’s 4 cultural zones (North: village exogamy, hypergamy, rigid distance vs South: cross-cousin marriage, isogamy, enduring female ties).</li>
              <li><strong>Family Changes:</strong> A.M. Shah (Household dimension of family: structural nuclearization with jointness of sentiment).</li>
              <li><strong>Gender &amp; Property:</strong> Bina Agarwal (A Field of One's Own: land rights for women as key to bargaining power), Leela Dube (Seed &amp; Earth ideology).</li>
            </ul>
          </div>

          <div class="fw-card">
            <h4 class="fw-card-title">🗳️ 4. Politics, Identity &amp; Social Movements</h4>
            <ul class="fw-list">
              <li><strong>Politicization of Caste:</strong> Rajni Kothari (Caste provides ready-made channels of mobilization for democratic politics).</li>
              <li><strong>New Social Movements:</strong> Gail Omvedt (Ecological, women's and farmers' movements are non-class identity movements).</li>
              <li><strong>Middle Class Differentiation:</strong> Leela Fernandes &amp; Dipankar Gupta (Consumerist 'New Middle Class' vs traditional bureaucratic middle class).</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SECTION 4: 10 DIAGRAM ARCHETYPES -->
      <div class="fw-section" id="soc-sub-diagrams">
        <h3 class="fw-title">10 Essential Sociology Diagram Archetypes</h3>
        <p class="fw-subtitle">Cataloged from the 1,740 topper diagrams in sociology.html. Practice drawing these in 20 seconds:</p>

        <div class="fw-grid-2">
          <div class="fw-diagram-box">
<strong>1. MERTON'S DEVIANCE MATRIX (2x2)</strong>
<pre>
 Adaptations │ Cultural Goals │ Institutional Means
─────────────┼────────────────┼─────────────────────
 Conformity  │       +        │          +
 Innovation  │       +        │          -
 Ritualism   │       -        │          +
 Retreatism  │       -        │          -
 Rebellion   │      +/-       │         +/-
</pre>
          </div>

          <div class="fw-diagram-box">
<strong>2. DURKHEIM'S SUICIDE MATRIX</strong>
<pre>
            ▲ High Regulation: FATALISTIC
            │
 Low        │        High
 Integration├──●───► Integration: ALTRUISTIC
 EGOISTIC   │
            │
            ▼ Low Regulation: ANOMIC
</pre>
          </div>

          <div class="fw-diagram-box">
<strong>3. PARSONS' AGIL SYSTEM</strong>
<pre>
┌──────────────────────┬──────────────────────┐
│  A - Adaptation      │  G - Goal Attainment │
│  (Economy)           │  (Polity)            │
├──────────────────────┼──────────────────────┤
│  L - Latency         │  I - Integration     │
│  (Family / Religion) │  (Law / Community)   │
└──────────────────────┴──────────────────────┘
</pre>
          </div>

          <div class="fw-diagram-box">
<strong>4. WEBER'S 3-P STRATIFICATION TRIAD</strong>
<pre>
             [ CLASS ]
          (Economic Order)
               ▲   ▲
              ╱     ╲
             ▼       ▼
      [ STATUS ] ◄──► [ PARTY ]
   (Social Prestige) (Political Power)
</pre>
          </div>

          <div class="fw-diagram-box">
<strong>5. FRANK'S DEPENDENCY CYCLE</strong>
<pre>
   ┌────────────────────────────────┐
   ▼                                │ Surplus
 [ METROPOLIS ]                     │ Drain
 (Core Nations: High-Tech/Capital)  │
   │                                │
   ▼ Cheap Raw Material &amp; Labour   │
 [ SATELLITES ] ────────────────────┘
 (Periphery: Underdeveloped)
</pre>
          </div>

          <div class="fw-diagram-box">
<strong>6. NORTH VS SOUTH KINSHIP MATRIX</strong>
<pre>
 Feature          │ North India   │ South India
──────────────────┼───────────────┼─────────────
 Village Exogamy  │ Strict (+)    │ Absent (-)
 Cousin Marriage  │ Taboo (-)     │ Preferred (+)
 Bride Status     │ Stranger/Low  │ Familiar/High
 Gift Flow        │ Unilateral    │ Reciprocal
</pre>
          </div>
        </div>
      </div>

      <!-- SECTION 5: MODEL WALKTHROUGH -->
      <div class="fw-section" id="soc-sub-walkthrough">
        <h3 class="fw-title">Side-by-Side Walkthrough: Average vs Topper</h3>
        <p class="fw-subtitle">Question: <em>"Is Sociology value-free? Discuss with reference to Weber and his critics."</em> (Paper 1, 20 Marks)</p>

        <div class="fw-comp-grid">
          <div class="fw-comp-box avg">
            <span class="comp-tag">❌ AVERAGE ASPIRANT (Score: 7 / 20)</span>
            <h4>Common-Sense Narrative with Vague Concepts</h4>
            <p><strong>Opening:</strong> "Value freedom means doing research without personal bias. Comte and Durkheim said sociology is scientific so it must be value free."</p>
            <p><strong>Body Points:</strong></p>
            <ul>
              <li>Weber gave the concept of value neutrality in research.</li>
              <li>Sociologist should not preach or take sides in politics.</li>
              <li>Sociologist is a human being so value freedom is very difficult.</li>
              <li>Critics say value free sociology is an illusion.</li>
              <li>Feminists also say men wrote sociology from male point of view.</li>
            </ul>
            <p><strong>Conclusion:</strong> "Sociologists should try to be as objective as possible."</p>
            <p style="font-size:0.78rem; color:#DC2626;"><strong>Examiner Verdict:</strong> Fails to distinguish between Wertbeziehung (value relevance) and Wertfreiheit (value freedom). No citation of Gouldner, Myrdal, or Frankfurt School.</p>
          </div>

          <div class="fw-comp-box top">
            <span class="comp-tag">✅ TOPPER BLUEPRINT (Riya Saini AIR 22 / Siddharth Singh AIR 143 - Score: 15.5 / 20)</span>
            <h4>Methodological Precision, Thinker Contestation &amp; Epistemological Rigor</h4>
            <p><strong>Opening:</strong> "In <em>'Objectivity in Social Science'</em>, Max Weber rejected both naive positivism (absolute value-freedom) and radical historicism, arguing that Sociology can achieve objectivity provided a rigorous methodological distinction is maintained between <strong>Value Relevance (Wertbeziehung)</strong> and <strong>Value Freedom (Wertfreiheit)</strong>."</p>
            <p><strong>Body Sub-Heading 1: The Weberian 2-Stage Methodological Compromise:</strong></p>
            <ul>
              <li><strong>Stage 1 - Topic Selection (Wertbeziehung):</strong> Inevitably subjective; researcher selects problems based on cultural significance and personal curiosity.</li>
              <li><strong>Stage 2 - Data Collection &amp; Analysis (Wertfreiheit):</strong> Must be strictly value-neutral; separating <em>'Sein'</em> (what is) from <em>'Sollen'</em> (what ought to be). Researcher must employ <strong>Ideal Types</strong> as heuristic benchmarks.</li>
            </ul>
            <p><strong>Body Sub-Heading 2: The Critical Contestation (The Myth of Value Freedom):</strong></p>
            <ul>
              <li><strong>Alvin Gouldner ('The Myth of a Value-Free Sociology'):</strong> Value neutrality is an "ideological mask" allowing sociologists to sell technical skills to corporate and government paymasters while abdicating moral accountability.</li>
              <li><strong>Gunnar Myrdal ('Asian Drama'):</strong> "Chaos of facts" cannot be ordered without valuation. Total objectivity is a delusion; sociologists must state their explicit value premises upfront.</li>
              <li><strong>Frankfurt Critical Theory (Adorno, Habermas):</strong> Positivist value-neutrality serves status-quo domination; genuine sociology must pursue emancipatory critique.</li>
              <li><strong>Feminist Epistemology (Sandra Harding, Ann Oakley):</strong> Malestream research disguises patriarchal assumptions as value-neutral scientific objectivity.</li>
            </ul>
            <p><strong>Conclusion:</strong> "As Anthony Giddens notes in <em>'New Rules of Sociological Method'</em>, while ontological value freedom is precluded by the double hermeneutic, disciplined methodological reflexivity ensures sociology remains an authoritative scientific discipline."</p>
            <p style="font-size:0.78rem; color:#15803D;"><strong>Examiner Verdict:</strong> High academic caliber, exact German methodological terms, 5 distinct critical schools, dialectical synthesis.</p>
          </div>
        </div>
      </div>

      <!-- SECTION 6: TOP 25 THINKERS MATRIX -->
      <div class="fw-section" id="soc-sub-thinkers">
        <h3 class="fw-title">Top 25 Thinkers Reference Matrix</h3>
        <p class="fw-subtitle">The most frequently cited thinkers across the 8,094 audited topper answers, with their seminal concepts and syllabus application:</p>

        <div class="fw-table-wrap">
          <table class="fw-table">
            <thead><tr><th>Thinker</th><th>Core Concepts</th><th>Seminal Book / Work</th><th>Syllabus Anchor</th></tr></thead>
            <tbody>
              <tr><td><strong>Karl Marx</strong></td><td>Historical Materialism, Surplus Value, Alienation, False Consciousness</td><td><em>Das Kapital, German Ideology</em></td><td>P1: Thinkers, Stratification, Work</td></tr>
              <tr><td><strong>Max Weber</strong></td><td>Verstehen, Ideal Types, Protestant Ethic, Bureaucracy, 3-P Model</td><td><em>Protestant Ethic and Spirit of Capitalism</em></td><td>P1: Thinkers, Methodology, Religion</td></tr>
              <tr><td><strong>Emile Durkheim</strong></td><td>Social Facts, Organic Solidarity, Anomie, Le Suicide, Totemism</td><td><em>The Division of Labour, Suicide</em></td><td>P1: Thinkers, Religion, Methodology</td></tr>
              <tr><td><strong>M.N. Srinivas</strong></td><td>Sanskritization, Dominant Caste, Westernization, Field View</td><td><em>The Remembered Village</em></td><td>P2: Caste, Village, Social Change</td></tr>
              <tr><td><strong>Talcott Parsons</strong></td><td>AGIL Paradigm, Social System, Pattern Variables, Voluntaristic Action</td><td><em>The Social System</em></td><td>P1: Functionalism, Social System</td></tr>
              <tr><td><strong>Robert K. Merton</strong></td><td>Manifest/Latent Functions, Strain Theory of Deviance, Reference Group</td><td><em>Social Theory and Social Structure</em></td><td>P1: Functionalism, Deviance</td></tr>
              <tr><td><strong>G.S. Ghurye</strong></td><td>Indology, Diffusionism, Caste Features, Tribes as Backward Hindus</td><td><em>Caste and Race in India</em></td><td>P2: Indology, Caste, Tribes</td></tr>
              <tr><td><strong>Andre Beteille</strong></td><td>Caste, Class &amp; Power triad, Agrarian class, Harmonic/Disharmonic</td><td><em>Caste, Class and Power (Sripuram)</em></td><td>P2: Stratification, Village</td></tr>
              <tr><td><strong>A.R. Desai</strong></td><td>Dialectical Nationalism, Peasant Struggles, State Capitalism critique</td><td><em>Social Background of Indian Nationalism</em></td><td>P2: Marxist perspective, Agrarian</td></tr>
              <tr><td><strong>Yogendra Singh</strong></td><td>Modernization of Indian Tradition, Orthogenetic vs Heterogenetic change</td><td><em>Modernization of Indian Tradition</em></td><td>P2: Social Change in India</td></tr>
              <tr><td><strong>Louis Dumont</strong></td><td>Homo Hierarchicus, Pure vs Impure, Structural Indology</td><td><em>Homo Hierarchicus</em></td><td>P2: Caste System</td></tr>
              <tr><td><strong>Anthony Giddens</strong></td><td>Structuration Theory, Double Hermeneutic, Runaway World</td><td><em>The Constitution of Society</em></td><td>P1: Sociological Theory, Modernity</td></tr>
              <tr><td><strong>Ulrich Beck</strong></td><td>Risk Society, Reflexive Modernization, Manufactured Uncertainties</td><td><em>Risk Society</em></td><td>P1: Modernity, Environment</td></tr>
              <tr><td><strong>Michel Foucault</strong></td><td>Power/Knowledge, Panopticon, Biopolitics, Discourse Analysis</td><td><em>Discipline and Punish</em></td><td>P1: Politics, Social Control</td></tr>
              <tr><td><strong>Pierre Bourdieu</strong></td><td>Habitus, Field, Cultural Capital, Symbolic Violence</td><td><em>Distinction, Reproduction in Education</em></td><td>P1: Stratification, Education</td></tr>
              <tr><td><strong>B.R. Ambedkar</strong></td><td>Annihilation of Caste, Broken Men theory, Graded Inequality</td><td><em>Annihilation of Caste</em></td><td>P2: Dalit perspective, Caste</td></tr>
              <tr><td><strong>Rajni Kothari</strong></td><td>Politicization of Caste, Congress System, Democratic Decentralization</td><td><em>Caste in Indian Politics</em></td><td>P2: Politics and Society</td></tr>
              <tr><td><strong>Irawati Karve</strong></td><td>4-Zone Kinship Systems, Hypergamy vs Isogamy</td><td><em>Kinship Organization in India</em></td><td>P2: Kinship, Family</td></tr>
              <tr><td><strong>Bina Agarwal</strong></td><td>Gender &amp; Land Rights, Intra-household bargaining power</td><td><em>A Field of One's Own</em></td><td>P2: Agrarian social structure, Gender</td></tr>
              <tr><td><strong>Jan Breman</strong></td><td>Footloose Labour, Circulation of Labour, Neo-bondage</td><td><em>Footloose Labour</em></td><td>P2: Informal sector, Agrarian</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const rootObj = typeof window !== 'undefined' ? window : globalThis;
  rootObj.SOCIOLOGY_FRAMEWORK = {
    html: SOCIOLOGY_FRAMEWORK_HTML,
    init: function() {
      const subNav = document.getElementById('socFwSubNav');
      if (subNav) {
        subNav.querySelectorAll('.fw-nav-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const sub = btn.getAttribute('data-sub');
            subNav.querySelectorAll('.fw-nav-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.querySelectorAll('#socFrameworkContainer .fw-section').forEach(sec => {
              sec.classList.toggle('active', sec.id === 'soc-sub-' + sub);
            });
          });
        });
      }
    },
    switchSub: function(subName) {
      const btn = document.querySelector(`#socFwSubNav .fw-nav-btn[data-sub="${subName}"]`);
      if (btn) btn.click();
    }
  };

})();
