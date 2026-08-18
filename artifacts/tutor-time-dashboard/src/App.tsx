import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronRight,
  CircleDot,
  Download,
  FileText,
  GraduationCap,
  Info,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Printer,
  ScanSearch,
  Search,
  Shirt,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react';
import { DATA, type RosterRecord } from './roster-data';

type View = 'dashboard' | 'students' | 'jerseys' | 'sports' | 'classes';
type SortKey = keyof RosterRecord;
type SortState = { key: SortKey; direction: 'asc' | 'desc' };

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const CLASS_ORDER = ['9th', '10th', '11th', '12th'];
const SPORT_COLORS = ['#2b7c58', '#d09c40', '#617784', '#ee7658', '#8a6d50'];
const navItems = [
  { id: 'dashboard' as View, label: 'Overview', icon: LayoutDashboard },
  { id: 'students' as View, label: 'Students', icon: UsersRound },
  { id: 'jerseys' as View, label: 'Jersey order', icon: Shirt },
  { id: 'sports' as View, label: 'Sports', icon: CircleDot },
  { id: 'classes' as View, label: 'Classes', icon: GraduationCap },
];

const pct = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(1)}%` : '0%';
const cleanJersey = (value: string) => value.replace(/⚡/g, '').trim();
const orderedSports = Object.entries(DATA.sportCounts).sort((a, b) => b[1] - a[1]);
const orderedClasses = CLASS_ORDER.filter((entry) => DATA.classCounts[entry] !== undefined).map((entry) => [entry, DATA.classCounts[entry]] as [string, number]);

function countSizes(records: RosterRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    const size = record.size === 'XS' ? 'S' : record.size;
    acc[size] = (acc[size] ?? 0) + 1;
    return acc;
  }, {});
}

function orderFor(count: number) {
  return Math.ceil(count / 5) * 5;
}

function Donut({ counts, total, centerLabel }: { counts: [string, number][]; total: number; centerLabel: string }) {
  let cursor = 0;
  const stops = counts.map(([label, value], index) => {
    const start = cursor;
    cursor += (value / total) * 360;
    return `${SPORT_COLORS[index % SPORT_COLORS.length]} ${start}deg ${cursor}deg`;
  }).join(', ');
  return (
    <div className="donut-layout">
      <div className="donut-wrap" data-testid="chart-donut">
        <div className="donut" style={{ background: `conic-gradient(${stops})` }} />
        <div className="donut-center"><b>{total}</b><span>{centerLabel}</span></div>
      </div>
      <div className="legend">
        {counts.map(([label, value], index) => (
          <div className="legend-row" key={label} data-testid={`legend-${label.toLowerCase().replace(/\s/g, '-')}`}>
            <span className="legend-dot" style={{ background: SPORT_COLORS[index % SPORT_COLORS.length] }} />
            <span className="legend-label">{label}</span>
            <span className="legend-value">{value}</span>
            <span className="legend-pct">{pct(value, total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarList({ entries, total, tone = 'green' }: { entries: [string, number][]; total: number; tone?: 'green' | 'gold' | 'coral' }) {
  return (
    <div className="bar-list">
      {entries.map(([label, value]) => (
        <div className="bar-row" key={label} data-testid={`bar-${label.toLowerCase().replace(/\s/g, '-')}`}>
          <span className="bar-label">{label}</span>
          <div className="bar-track"><div className={`bar-fill ${tone === 'green' ? '' : tone}`} style={{ width: `${(value / Math.max(...entries.map(([, count]) => count))) * 100}%` }} /></div>
          <span className="bar-value">{value}</span>
        </div>
      ))}
      <span className="sr-only">Total: {total}</span>
    </div>
  );
}

function TopActions({ onExport, onPrint }: { onExport: () => void; onPrint: () => void }) {
  return (
    <div className="top-actions">
      <button className="btn" type="button" onClick={onPrint} data-testid="button-print">
        <Printer /> Print
      </button>
      <button className="btn primary" type="button" onClick={onExport} data-testid="button-export-csv">
        <Download /> Export CSV
      </button>
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const sizes = SIZES.map((size) => [size, DATA.sizeCounts[size] ?? 0] as [string, number]);
  return (
    <section className="view" data-testid="view-overview">
      <div className="score-strip">
        <div className="score-item"><div className="score-label">Registered students</div><div className="score-number">{DATA.total}</div><div className="score-note">Participants in the roster</div></div>
        <div className="score-item"><div className="score-label">Jerseys to order</div><div className="score-number">{DATA.totalOrder}</div><div className="score-note">Rounded into groups of five</div></div>
        <div className="score-item"><div className="score-label">Sports represented</div><div className="score-number">0{orderedSports.length}</div><div className="score-note">Events across the school</div></div>
        <div className="score-item"><div className="score-label">Class groups</div><div className="score-number score-accent">0{orderedClasses.length}</div><div className="score-note">Grades 9th through 12th</div></div>
      </div>

      <div className="grid-main">
        <div className="panel">
          <div className="panel-head">
            <div><h2 className="panel-title">Jerseys by size</h2><div className="section-kicker">Registered demand before ordering buffer</div></div>
            <span className="panel-meta">XS maps to S</span>
          </div>
          <BarList entries={sizes} total={DATA.total} />
          <div className="insight"><Lightbulb /><span><strong>Order check:</strong> S is the tightest run at 29 students, so its 30-piece batch leaves only one spare.</span></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2 className="panel-title">Order summary</h2><div className="section-kicker">One batch = five jerseys</div></div><Shirt size={16} color="#809b23" /></div>
          <div className="stat-stack">
            {sizes.map(([size, count]) => (
              <div className="stat-line" key={size} data-testid={`size-summary-${size}`}>
                <span className="stat-marker">{size}</span>
                <div><div className="stat-name">{count} students <small>{orderFor(count) - count} spare in batch</small></div><div className="micro-track"><div className="micro-fill" style={{ width: `${(count / orderFor(count)) * 100}%` }} /></div></div>
                <span className="stat-figure">{orderFor(count)}</span>
              </div>
            ))}
          </div>
          <button className="btn ghost" type="button" onClick={() => onNavigate('jerseys')} data-testid="button-view-order" style={{ marginTop: 13, paddingLeft: 0 }}>
            Open order detail <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="overview-lower">
        <div className="panel">
          <div className="panel-head"><div><h2 className="panel-title">Participation by sport</h2><div className="section-kicker">Every registered event</div></div><CircleDot size={17} color="#d09c40" /></div>
          <Donut counts={orderedSports} total={DATA.total} centerLabel="athletes" />
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2 className="panel-title">Participation by class</h2><div className="section-kicker">A clear view of the school mix</div></div><GraduationCap size={17} color="#617784" /></div>
          <BarList entries={orderedClasses} total={DATA.total} tone="gold" />
          <button className="btn ghost" type="button" onClick={() => onNavigate('classes')} data-testid="button-view-classes" style={{ marginTop: 12, paddingLeft: 0 }}>
            See class detail <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function Students({ onCountChange }: { onCountChange: (count: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('');
  const [size, setSize] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 'asc' });
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DATA.records.filter((record) => {
      const matchesQuery = !needle || [record.name, record.jersey, record.class, record.sport].some((value) => value.toLowerCase().includes(needle));
      return matchesQuery && (!sport || record.sport === sport) && (!size || record.size === size);
    }).sort((a, b) => {
      const left = a[sort.key].toLowerCase();
      const right = b[sort.key].toLowerCase();
      return left.localeCompare(right) * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [query, size, sort, sport]);

  useEffect(() => onCountChange(filtered.length), [filtered.length, onCountChange]);

  const setSortKey = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const activeFilters = [
    query ? { label: `Search: ${query}`, clear: () => setQuery('') } : null,
    sport ? { label: sport, clear: () => setSport('') } : null,
    size ? { label: `Size ${size}`, clear: () => setSize('') } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const SortIcon = ({ field }: { field: SortKey }) => sort.key !== field ? <span className="sort-arrow"><ArrowUpDown size={11} /></span> : <span className="sort-arrow">{sort.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}</span>;

  return (
    <section className="view" data-testid="view-students">
      <div className="panel filter-panel">
        <div className="panel-head"><div><h2 className="panel-title">Student directory</h2><div className="section-kicker">Search the full tournament roster</div></div><span className="panel-meta">{filtered.length} of {DATA.total} visible</span></div>
        <div className="filter-row">
          <div className="search-wrap">
            <Search />
            <input ref={inputRef} className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, jersey name, class or sport" aria-label="Search students" data-testid="input-student-search" />
            {!query && <span className="shortcut">/</span>}
            {query && <button type="button" className="clear-link" aria-label="Clear search" onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: 10 }} data-testid="button-clear-search"><X size={15} /></button>}
          </div>
          <select className="select-input" value={sport} onChange={(event) => setSport(event.target.value)} aria-label="Filter by sport" data-testid="select-sport-filter">
            <option value="">All sports</option>
            {orderedSports.map(([entry]) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select className="select-input" value={size} onChange={(event) => setSize(event.target.value)} aria-label="Filter by jersey size" data-testid="select-size-filter">
            <option value="">All sizes</option>
            {SIZES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </div>
        {activeFilters.length > 0 && <div className="filter-chips" data-testid="filter-chips">
          <SlidersHorizontal size={14} color="#819b23" />
          {activeFilters.map((filter) => <span className="chip" key={filter.label}>{filter.label}<button type="button" onClick={filter.clear} aria-label={`Remove ${filter.label} filter`} data-testid={`button-remove-filter-${filter.label.replace(/\W/g, '-').toLowerCase()}`}><X /></button></span>)}
          <button type="button" className="clear-link" onClick={() => { setQuery(''); setSport(''); setSize(''); }} data-testid="button-clear-filters">Clear all</button>
        </div>}
        <div className="result-note">{activeFilters.length ? 'Filters are live — combine search with either dropdown.' : 'Tip: press / anywhere to jump into search.'}</div>
      </div>

      <div className="panel" style={{ marginTop: 16, padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state" data-testid="empty-student-results"><ScanSearch size={34} /><strong>No roster match</strong><p>Try a different name, jersey name, sport or size. Your full roster is still intact.</p><button type="button" className="btn" onClick={() => { setQuery(''); setSport(''); setSize(''); }} data-testid="button-reset-empty-results">Reset filters</button></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>#</th>{(['name', 'jersey', 'size', 'class', 'sport'] as SortKey[]).map((field) => <th key={field} data-sort={field} onClick={() => setSortKey(field)}>{field === 'jersey' ? 'Jersey name' : field[0].toUpperCase() + field.slice(1)}<SortIcon field={field} /></th>)}</tr></thead>
              <tbody>{filtered.map((record, index) => <tr key={`${record.name}-${index}`} data-testid={`row-student-${index}`}><td className="table-index">{String(index + 1).padStart(2, '0')}</td><td className="student-name">{record.name}</td><td className="jersey-name">{cleanJersey(record.jersey)}</td><td><span className="size-pill">{record.size}</span></td><td><span className="class-pill">{record.class}</span></td><td><span className="sport-pill">{record.sport}</span></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
      <SearchFocus inputRef={inputRef} />
    </section>
  );
}

function SearchFocus({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
  return null;
}

function Jerseys({ onPrint }: { onPrint: () => void }) {
  const sizes = SIZES.map((size) => [size, DATA.sizeCounts[size] ?? 0] as [string, number]);
  return (
    <section className="view" data-testid="view-jerseys">
      <h2 className="section-title">Jersey order management</h2>
      <p className="section-kicker">A purchase-ready count, with the buffer called out.</p>
      <div className="notice"><Info size={17} /><span><b>Ordering rule:</b> jerseys are ordered in groups of 5. XS is not offered, so every XS registration is counted with S. The buffer is visible below rather than hidden in a total.</span></div>
      <div className="panel">
        <div className="panel-head"><div><h2 className="panel-title">Order by size</h2><div className="section-kicker">Registered demand and batch quantity</div></div><span className="panel-meta">Total: {DATA.totalOrder} jerseys</span></div>
        <div className="order-grid">{sizes.map(([size, count]) => <div className="order-card" key={size} data-testid={`order-card-${size}`}><div className="order-size">SIZE {size}</div><div className="order-qty">{orderFor(count)}</div><div className="order-sub">jerseys to order</div><div className="order-extra"><b>{count}</b> students · <b>{orderFor(count) - count}</b> spare</div></div>)}</div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><div><h2 className="panel-title">Detailed order summary</h2><div className="section-kicker">Print this view for purchasing</div></div><button type="button" className="btn" onClick={onPrint} data-testid="button-print-purchase-order"><FileText /> Print purchase order</button></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Size</th><th>Students</th><th>Jerseys to order</th><th>Extra buffer</th><th>Groups of 5</th></tr></thead><tbody>{sizes.map(([size, count]) => <tr key={size}><td><span className="size-pill">{size}</span></td><td>{count}</td><td><b>{orderFor(count)}</b></td><td>{orderFor(count) - count}</td><td>{orderFor(count) / 5}</td></tr>)}</tbody><tfoot><tr className="order-total"><th>Total</th><th>{DATA.total}</th><th>{DATA.totalOrder}</th><th>{DATA.totalOrder - DATA.total}</th><th>{DATA.totalOrder / 5}</th></tr></tfoot></table></div>
      </div>
    </section>
  );
}

function Sports() {
  return (
    <section className="view" data-testid="view-sports">
      <h2 className="section-title">Sports overview</h2><p className="section-kicker">How the 101 athletes are distributed across five events.</p>
      <div className="sport-grid">{orderedSports.map(([sport, count]) => <div className="sport-card" key={sport} data-testid={`card-sport-${sport.toLowerCase().replace(/\s/g, '-')}`}><div className="sport-card-name">{sport}</div><div className="sport-card-number">{count}</div><div className="sport-card-share">{pct(count, DATA.total)} of roster</div></div>)}</div>
      <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><div><h2 className="panel-title">Sport distribution</h2><div className="section-kicker">The badminton wave is easy to spot</div></div><CircleDot size={17} color="#d09c40" /></div><Donut counts={orderedSports} total={DATA.total} centerLabel="athletes" /></div>
      <div className="panel" style={{ marginTop: 16 }}><div className="table-wrap"><table className="data-table"><thead><tr><th>Sport</th><th>Participants</th><th>Share</th></tr></thead><tbody>{orderedSports.map(([sport, count]) => <tr key={sport}><td className="student-name">{sport}</td><td>{count}</td><td>{pct(count, DATA.total)}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}

function Classes() {
  return (
    <section className="view" data-testid="view-classes">
      <h2 className="section-title">Class overview</h2><p className="section-kicker">A quick read on where participation is coming from.</p>
      <div className="class-grid">{orderedClasses.map(([grade, count]) => <div className="class-card" key={grade} data-testid={`card-class-${grade}`}><div className="class-card-name">{grade} class</div><div className="class-card-number">{count}</div><div className="class-card-share">{pct(count, DATA.total)} of roster</div></div>)}</div>
      <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><div><h2 className="panel-title">Class distribution</h2><div className="section-kicker">Participation by grade</div></div><GraduationCap size={17} color="#617784" /></div><BarList entries={orderedClasses} total={DATA.total} tone="gold" /></div>
      <div className="panel" style={{ marginTop: 16 }}><div className="table-wrap"><table className="data-table"><thead><tr><th>Class</th><th>Participants</th><th>Share</th></tr></thead><tbody>{orderedClasses.map(([grade, count]) => <tr key={grade}><td className="student-name">{grade}</td><td>{count}</td><td>{pct(count, DATA.total)}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}

function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);
  const [studentCount, setStudentCount] = useState(DATA.total);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 240);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const titles: Record<View, [string, string]> = {
    dashboard: ['Tournament overview', 'One roster. Every size, sport and class accounted for.'],
    students: ['Student directory', 'Find the right student before the next whistle.'],
    jerseys: ['Jersey order', 'Turn registrations into a purchase-ready count.'],
    sports: ['Sports overview', 'See the shape of participation across every event.'],
    classes: ['Class overview', 'Keep the school community in the frame.'],
  };
  const exportCSV = () => {
    const header = 'Student Name,Jersey Name,Size,Class,Sport';
    const rows = DATA.records.map((record) => [record.name, record.jersey, record.size, record.class, record.sport].map((value) => `"${value.replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tutor-time-roster.csv';
    link.click();
    URL.revokeObjectURL(url);
    setToast('Roster CSV downloaded');
  };
  const print = () => {
    window.print();
    setToast('Print view ready');
  };
  const navigate = (next: View) => {
    setView(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [title, subtitle] = titles[view];

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <div className="mobile-brand"><span className="mobile-mark">TT</span>Tutor Time</div>
        <button type="button" className="menu-btn" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} data-testid="button-mobile-menu">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
      {mobileOpen && <div className="nav-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><div className="brand-mark">TT</div><div><strong>Tutor Time</strong><small>Sports tournament</small></div></div>
        <div className="nav-label">Control room</div>
        <nav className="nav-list" aria-label="Dashboard sections">
          {navItems.map((item) => { const Icon = item.icon; return <button type="button" className={`nav-btn ${view === item.id ? 'active' : ''}`} key={item.id} onClick={() => navigate(item.id)} data-testid={`nav-${item.id}`}><Icon />{item.label}</button>; })}
        </nav>
        <div className="sidebar-foot">Roster sync<br /><b>{DATA.total} records ready</b><br />Source file loaded locally</div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><div className="eyebrow">Tutor Time / {view === 'dashboard' ? 'Matchday desk' : view}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
          <TopActions onExport={exportCSV} onPrint={print} />
        </header>
        {!ready ? <div className="skeleton" data-testid="loading-dashboard" /> : view === 'dashboard' ? <Overview onNavigate={navigate} /> : view === 'students' ? <Students onCountChange={setStudentCount} /> : view === 'jerseys' ? <Jerseys onPrint={print} /> : view === 'sports' ? <Sports /> : <Classes />}
      </main>
      {toast && <div className="toast" role="status" data-testid="status-toast"><Check size={15} />{toast}</div>}
      <span className="sr-only">Showing {studentCount} students when directory is selected.</span>
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
