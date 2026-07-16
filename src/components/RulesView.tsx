import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, FlaskConical, Plus, Scale, ShieldCheck, Sparkles } from 'lucide-react'
import type { AppData, RuleDefinition, RuleStatus, RuleType } from '../types'

interface RulesViewProps {
  data: AppData
  onDataChange: (updater: (current: AppData) => AppData) => void
}

const defaultRuleText = 'Eine spezifische Pneumonie nur vorschlagen, wenn eine passende Bildgebung vorliegt. Einen Keim nur berücksichtigen, wenn der mikrobiologische Befund über der Kontaminationsgrenze liegt und ärztlich der Pneumonie zugeordnet wurde.'

export function RulesView({ data, onDataChange }: RulesViewProps) {
  const [selectedRuleId, setSelectedRuleId] = useState(data.rules[0]?.id)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('Neue medizinische Prüfregel')
  const [type, setType] = useState<RuleType>('Medizinische Plausibilität')
  const [year, setYear] = useState(2026)
  const [naturalText, setNaturalText] = useState(defaultRuleText)
  const [draft, setDraft] = useState<RuleDefinition>()
  const selectedRule = data.rules.find((rule) => rule.id === selectedRuleId)

  const structureRule = () => {
    const isMbeg = type === 'Medizinische Begründung'
    setDraft({
      id: `rule-${Date.now()}`,
      name,
      type,
      status: 'Entwurf',
      year,
      scope: 'Alle Krankenhäuser',
      naturalText,
      trigger: isMbeg ? 'Eine medizinische Begründung der vollstationären Behandlung wird angefordert.' : naturalText.toLowerCase().includes('pneumonie') ? 'Spezifischer Pneumonie-Kode wird geprüft.' : 'Passender Kodierkandidat wird geprüft.',
      conditions: isMbeg
        ? ['Stationärer Behandlungsgrund ist konkret dokumentiert', 'Ambulante oder teilstationäre Alternative ist fallbezogen abgegrenzt', 'Jede Aussage besitzt einen Dokumentbeleg']
        : naturalText.toLowerCase().includes('pneumonie')
        ? ['Passende Bildgebung ist dokumentiert', 'Keimnachweis liegt über definierter Grenze', 'Ärztliche Zuordnung ist vorhanden']
        : ['Benannte Voraussetzung ist dokumentiert'],
      exclusions: isMbeg ? ['Nicht dokumentierte Risiken', 'Allgemeine Textbausteine ohne Fallbezug', 'Automatische Übermittlung'] : ['Widersprüchlicher oder unzureichender Nachweis'],
      evidence: isMbeg ? ['Verlaufsbericht', 'Therapie-, Interventions- oder Überwachungsnachweis'] : naturalText.toLowerCase().includes('pneumonie') ? ['Radiologiebefund', 'Mikrobiologie', 'Ärztliche Bewertung'] : ['Falldokumentation'],
      reaction: isMbeg ? 'Beleggebundenen Entwurf erstellen, fehlende Nachweise nennen und menschliche Freigabe verlangen.' : 'Kode vorschlagen, weiteren Nachweis anfordern oder Variante ausschließen.',
    })
  }

  const simulate = () => {
    if (!draft) return
    setDraft({ ...draft, status: 'Geprüft', impactTest: { affectedCases: 84, changedSuggestions: 12, changedDrgs: 3 } })
  }

  const approve = () => {
    if (!draft?.impactTest) return
    const approved = { ...draft, status: 'Freigegeben' as const }
    onDataChange((current) => ({ ...current, rules: [approved, ...current.rules] }))
    setDraft(undefined)
    setCreating(false)
    setSelectedRuleId(approved.id)
  }

  const updateStatus = (ruleId: string, status: RuleStatus) => {
    onDataChange((current) => ({ ...current, rules: current.rules.map((rule) => rule.id === ruleId ? { ...rule, status } : rule) }))
  }

  return (
    <div className="page rules-page">
      <div className="page-heading-row">
        <div><div className="page-kicker">Regelwerk-Center</div><h1>Regeln bleiben erklärbar und versioniert.</h1><p className="lead">Die KI strukturiert. Ein Fachexperte prüft, testet und gibt frei.</p></div>
        <button className="button primary" type="button" onClick={() => { setCreating(true); setDraft(undefined) }}><Plus aria-hidden="true" /> Neue Regel</button>
      </div>

      {creating ? (
        <div className="rule-builder-grid">
          <section className="panel rule-input" aria-labelledby="rule-input-title">
            <div className="section-heading"><Sparkles aria-hidden="true" /><div><h2 id="rule-input-title">Regel beschreiben</h2><p>Normale Sprache. Noch keine Aktivierung.</p></div></div>
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <div className="form-grid two">
              <label>Regelart<select value={type} onChange={(event) => setType(event.target.value as RuleType)}><option>Offizielle Regel</option><option>Medizinische Plausibilität</option><option>Interner Standard</option><option>Erfahrungswert</option><option>Medizinische Begründung</option></select></label>
              <label>Abrechnungsjahr<select value={year} onChange={(event) => setYear(Number(event.target.value))}><option>2026</option><option>2025</option></select></label>
            </div>
            <label>Regeltext<textarea rows={7} value={naturalText} onChange={(event) => setNaturalText(event.target.value)} /></label>
            <div className="inline-note"><ShieldCheck aria-hidden="true" /><span>Interne Regeln werden im Fall klar von offiziellen Vorgaben getrennt.</span></div>
            <div className="button-row between"><button className="button secondary" type="button" onClick={() => setCreating(false)}>Abbrechen</button><button className="button primary" type="button" disabled={!name.trim() || !naturalText.trim()} onClick={structureRule}>Regel strukturieren <ArrowRight aria-hidden="true" /></button></div>
          </section>

          <section className="panel rule-preview" aria-labelledby="rule-preview-title">
            <div className="section-heading"><Scale aria-hidden="true" /><div><h2 id="rule-preview-title">Strukturierte Vorschau</h2><p>Vor Freigabe vollständig prüfen.</p></div></div>
            {!draft ? (
              <div className="empty-state"><Sparkles aria-hidden="true" /><p>Nach dem Strukturieren erscheinen hier Auslöser, Bedingungen, Nachweise und Reaktion.</p></div>
            ) : (
              <>
                <RuleDetail rule={draft} />
                {draft.impactTest ? (
                  <div className="impact-result">
                    <div><FlaskConical aria-hidden="true" /><span><strong>Auswirkung simuliert</strong><small>gegen vorbereitete historische Demofälle</small></span></div>
                    <dl><div><dt>Betroffene Fälle</dt><dd>{draft.impactTest.affectedCases}</dd></div><div><dt>Andere Vorschläge</dt><dd>{draft.impactTest.changedSuggestions}</dd></div><div><dt>Andere DRGs</dt><dd>{draft.impactTest.changedDrgs}</dd></div></dl>
                  </div>
                ) : <button className="button secondary full" type="button" onClick={simulate}><FlaskConical aria-hidden="true" /> Gegen historische Fälle testen</button>}
                <button className="button primary full" type="button" disabled={!draft.impactTest} onClick={approve}><ShieldCheck aria-hidden="true" /> Regel freigeben</button>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="rules-grid">
          <aside className="rule-list" aria-label="Regeln">
            {data.rules.map((rule) => (
              <button key={rule.id} type="button" className={selectedRule?.id === rule.id ? 'active' : ''} onClick={() => setSelectedRuleId(rule.id)}>
                <span className={`rule-type-dot type-${rule.type.replaceAll(' ', '-').toLowerCase()}`} />
                <span><strong>{rule.name}</strong><small>{rule.type} · {rule.year}</small></span>
                <span className={`status-pill status-${rule.status === 'Freigegeben' ? 'belegt' : rule.status === 'Geprüft' ? 'wahrscheinlich' : 'ungeklärt'}`}>{rule.status}</span>
              </button>
            ))}
          </aside>
          {selectedRule && (
            <section className="rule-detail" aria-labelledby="selected-rule-title">
              <div className="section-title-row">
                <div><div className="page-kicker">{selectedRule.type}</div><h2 id="selected-rule-title">{selectedRule.name}</h2><p>{selectedRule.scope} · Regelpaket {selectedRule.year}</p></div>
                <span className={`status-pill status-${selectedRule.status === 'Freigegeben' ? 'belegt' : selectedRule.status === 'Geprüft' ? 'wahrscheinlich' : 'ungeklärt'}`}>{selectedRule.status}</span>
              </div>
              <blockquote>{selectedRule.naturalText}</blockquote>
              <RuleDetail rule={selectedRule} />
              {selectedRule.impactTest && <div className="impact-result compact"><div><FlaskConical aria-hidden="true" /><span><strong>Letzter Test</strong><small>{selectedRule.impactTest.affectedCases} Fälle · {selectedRule.impactTest.changedDrgs} DRG-Änderungen</small></span></div></div>}
              <div className="button-row">
                {selectedRule.status === 'Geprüft' && <button className="button primary" type="button" onClick={() => updateStatus(selectedRule.id, 'Freigegeben')}><ShieldCheck aria-hidden="true" /> Freigeben</button>}
                {selectedRule.status === 'Freigegeben' && <button className="button secondary" type="button" onClick={() => updateStatus(selectedRule.id, 'Abgekündigt')}>Abkündigen</button>}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function RuleDetail({ rule }: { rule: RuleDefinition }) {
  const sections = [
    ['Auslöser', [rule.trigger]],
    ['Bedingungen', rule.conditions],
    ['Ausschlüsse', rule.exclusions],
    ['Benötigte Nachweise', rule.evidence],
    ['Reaktion des Tools', [rule.reaction]],
  ] as const
  return (
    <dl className="structured-rule">
      {sections.map(([title, values]) => <div key={title}><dt>{title}</dt><dd>{values.length ? <ul>{values.map((value) => <li key={value}><Check aria-hidden="true" />{value}</li>)}</ul> : 'Keine'}</dd></div>)}
    </dl>
  )
}
