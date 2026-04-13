const metrics = [
  { label: 'Reports triaged', value: '248', delta: '+18 today' },
  { label: 'Urgent cases', value: '31', delta: '12 awaiting review' },
  { label: 'Active volunteers', value: '86', delta: '14 available now' },
  { label: 'Resolved cases', value: '137', delta: '81% same-day close' },
]

const reports = [
  {
    id: 'CT-1042',
    title: 'Water scarcity near Ward 7',
    location: 'South District',
    urgency: 'Critical',
    score: 96,
    summary: 'Multiple households report no clean water access for two days.',
    need: 'Water drive and transport support',
    status: 'Needs immediate attention',
  },
  {
    id: 'CT-1043',
    title: 'Flood relief supply gap',
    location: 'Riverside Zone',
    urgency: 'High',
    score: 88,
    summary: 'Field volunteers need food packets and dry blankets for displaced families.',
    need: 'Food packets, blankets, logistics',
    status: 'Assign next available team',
  },
  {
    id: 'CT-1044',
    title: 'Medication support request',
    location: 'Central Ward',
    urgency: 'Medium',
    score: 71,
    summary: 'A health camp needs volunteer support for patient registration and follow-up.',
    need: 'Registration helpers and medical runners',
    status: 'Queue for afternoon shift',
  },
]

const volunteers = [
  {
    name: 'Asha Menon',
    skills: ['Logistics', 'Crowd coordination'],
    location: 'South District',
    availability: 'Now',
    match: 94,
  },
  {
    name: 'Ritvik Sharma',
    skills: ['Medical support', 'Registration'],
    location: 'Central Ward',
    availability: 'Today 2 PM',
    match: 86,
  },
  {
    name: 'Neha Das',
    skills: ['Procurement', 'Supply handling'],
    location: 'Riverside Zone',
    availability: 'Flexible',
    match: 91,
  },
]

const navItems = ['Overview', 'Cases', 'Volunteers', 'Insights']

const root = document.getElementById('root')

root.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div>
        <div class="brand-mark">CT</div>
        <h1>CommunityTriage</h1>
        <p>AI-assisted triage for urgent community needs.</p>
      </div>

      <nav>
        ${navItems
          .map(
            (item, index) => `
              <a href="#${item.toLowerCase()}" class="${index === 0 ? 'active' : ''}">${item}</a>
            `,
          )
          .join('')}
      </nav>

      <div class="sidebar-card">
        <span>Current focus</span>
        <strong>South District water shortage</strong>
        <small>Priority ranking refreshed 8 minutes ago.</small>
      </div>
    </aside>

    <main class="content">
      <section class="hero" id="overview">
        <div>
          <span class="eyebrow">Phase 1 foundation</span>
          <h2>Turn scattered reports into clear action.</h2>
          <p>
            A compact dashboard that structures reports, ranks urgency, and matches volunteers to the right tasks.
          </p>
        </div>

        <div class="hero-panel">
          <div>
            <span>AI input</span>
            <strong>Text, CSV, and field notes</strong>
          </div>
          <div>
            <span>Output</span>
            <strong>Priority-ranked action list</strong>
          </div>
          <div>
            <span>Google AI</span>
            <strong>Gemini-powered extraction</strong>
          </div>
        </div>
      </section>

      <section class="metrics" aria-label="dashboard metrics">
        ${metrics
          .map(
            (metric) => `
              <article class="metric-card">
                <span>${metric.label}</span>
                <strong>${metric.value}</strong>
                <small>${metric.delta}</small>
              </article>
            `,
          )
          .join('')}
      </section>

      <section class="grid-layout">
        <article class="panel" id="cases">
          <div class="panel-header">
            <div>
              <span>Urgent cases</span>
              <h3>AI-ranked community reports</h3>
            </div>
            <button type="button">New report</button>
          </div>

          <div class="report-list">
            ${reports
              .map(
                (report) => `
                  <article class="report-card">
                    <div class="report-topline">
                      <strong>${report.title}</strong>
                      <span>${report.urgency}</span>
                    </div>
                    <p>${report.summary}</p>
                    <div class="report-meta">
                      <span>${report.location}</span>
                      <span>${report.id}</span>
                      <span>${report.score}% priority</span>
                    </div>
                    <div class="report-footer">
                      <small>${report.need}</small>
                      <em>${report.status}</em>
                    </div>
                  </article>
                `,
              )
              .join('')}
          </div>
        </article>

        <aside class="panel" id="volunteers">
          <div class="panel-header">
            <div>
              <span>Volunteer match</span>
              <h3>Best-fit assignments</h3>
            </div>
          </div>

          <div class="volunteer-list">
            ${volunteers
              .map(
                (volunteer) => `
                  <article class="volunteer-card">
                    <div>
                      <strong>${volunteer.name}</strong>
                      <span>${volunteer.match}% match</span>
                    </div>
                    <p>${volunteer.skills.join(' • ')}</p>
                    <small>${volunteer.location} · Available ${volunteer.availability}</small>
                  </article>
                `,
              )
              .join('')}
          </div>

          <div class="sidebar-card secondary">
            <span>Explainability</span>
            <strong>Why these matches?</strong>
            <small>
              The system compares location, skill tags, and availability to make the recommendation transparent.
            </small>
          </div>
        </aside>
      </section>

      <section class="panel" id="insights">
        <div class="panel-header">
          <div>
            <span>Next steps</span>
            <h3>What this foundation already includes</h3>
          </div>
        </div>

        <div class="insight-grid">
          <div>
            <strong>Input model</strong>
            <p>Report form, text ingestion, and batch-ready data structure.</p>
          </div>
          <div>
            <strong>Decision model</strong>
            <p>Priority scoring and volunteer matching ready for AI integration.</p>
          </div>
          <div>
            <strong>Dashboard shell</strong>
            <p>Sidebar navigation, metric cards, and distinct data panels.</p>
          </div>
          <div>
            <strong>Demo readiness</strong>
            <p>Seeded data that can be shown immediately in a pitch video.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
`