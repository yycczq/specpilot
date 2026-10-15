import { useEffect, useMemo, useState } from 'react'

const API = '/api'
const TABS = [
  { id: 'summary', label: '需求概览', mark: '01' },
  { id: 'criteria', label: '验收标准', mark: '02' },
  { id: 'api', label: '接口草案', mark: '03' },
  { id: 'tests', label: '测试用例', mark: '04' },
  { id: 'questions', label: '待确认', mark: '05' },
]

const TEMPLATES = [
  {
    title: '游戏反馈入口',
    description: '让玩家提交问题，并追踪处理进度。',
    prompt: '做一个游戏内玩家反馈入口，玩家提交问题后可以查看处理进度',
    icon: 'grid',
  },
  {
    title: '团队任务看板',
    description: '分配负责人、设置截止日期并跟进状态。',
    prompt: '给小型团队做一个简单的任务看板，支持分配负责人和截止日期',
    icon: 'list',
  },
  {
    title: '内容收藏功能',
    description: '收藏内容，并在个人中心查看或取消收藏。',
    prompt: '用户可以收藏内容，并能在个人中心取消收藏和查看列表',
    icon: 'book',
  },
]

const SAMPLE = {
  title: '游戏内玩家反馈入口',
  summary: '玩家可以在游戏中提交问题并追踪处理状态。首版聚焦反馈提交、状态查询和运营处理，不包含实时聊天。',
  questions: ['玩家是否必须登录后才能提交？', '首版需要支持图片或视频附件吗？', '处理状态需要向玩家发送通知吗？'],
  user_stories: ['作为玩家，我希望提交问题后获得可追踪的编号，以便了解处理进度。', '作为运营人员，我希望筛选待处理反馈，以便及时跟进。'],
  acceptance_criteria: ['有效反馈提交后返回唯一编号。', '玩家只能查看自己提交的反馈。', '状态变更后，详情页展示最新状态和更新时间。'],
  api_endpoints: [
    { method: 'POST', path: '/api/feedback', purpose: '创建一条玩家反馈' },
    { method: 'GET', path: '/api/feedback/{id}', purpose: '读取反馈详情与当前状态' },
    { method: 'GET', path: '/api/admin/feedback?status=pending', purpose: '运营按状态筛选反馈' },
  ],
  test_cases: [
    { name: '提交有效反馈', steps: '登录玩家填写标题和描述后提交', expected: '返回 201 和唯一反馈编号' },
    { name: '缺少描述', steps: '提交空描述的反馈', expected: '返回字段校验错误，不创建记录' },
    { name: '越权查看', steps: '玩家 A 请求玩家 B 的反馈详情', expected: '返回 403 或 404，不泄露反馈内容' },
  ],
  risks: ['附件上传会增加存储和内容安全要求，建议先确认是否纳入首版。'],
  mode: 'sample',
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3"/></>,
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z"/><path d="M5 5v17M9 6h7M9 10h7"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    check: <><path d="m5 12 4.5 4.5L19 7"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v3h16v-3"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  }
  return <svg {...common}>{paths[name] || paths.spark}</svg>
}

function formatDate(value) {
  if (!value) return '刚刚'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function toMarkdown(result) {
  const sections = [
    ['需求概览', [result.summary]],
    ['用户故事', result.user_stories || []],
    ['验收标准', result.acceptance_criteria || []],
    ['接口草案', (result.api_endpoints || []).map((item) => `\`${item.method} ${item.path}\` — ${item.purpose}`)],
    ['测试用例', (result.test_cases || []).map((item) => `**${item.name}**\n- 操作：${item.steps}\n- 预期：${item.expected}`)],
    ['待确认问题', result.questions || []],
    ['风险提示', result.risks || []],
  ]
  return `# ${result.title || '需求草案'}\n\n${sections.map(([title, lines]) => `## ${title}\n\n${lines.map((line) => `- ${line}`).join('\n') || '- 暂无'}\n`).join('\n')}`
}

function SectionList({ items = [], editable, onChange, numbered = false }) {
  if (!items.length) return <div className="empty-note">还没有内容。确认需求后可以补充。</div>
  return <div className="section-list">{items.map((item, index) => {
    const text = typeof item === 'string' ? item : item.name || item.path || JSON.stringify(item)
    return <div className="section-row" key={`${index}-${text}`}>
      <span className={numbered ? 'row-number' : 'row-dot'}>{numbered ? String(index + 1).padStart(2, '0') : ''}</span>
      {editable ? <textarea rows="2" value={text} onChange={(event) => onChange(index, event.target.value)} /> : <span>{text}</span>}
    </div>
  })}</div>
}

function App() {
  const [view, setView] = useState('workbench')
  const [requirement, setRequirement] = useState('')
  const [result, setResult] = useState(null)
  const [activeSpecId, setActiveSpecId] = useState(null)
  const [activeTab, setActiveTab] = useState('summary')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [specs, setSpecs] = useState([])
  const [overview, setOverview] = useState({ total: 0, drafts: 0, reviewed: 0 })
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [apiInfo, setApiInfo] = useState(null)

  const filteredSpecs = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return specs
    return specs.filter((spec) => `${spec.requirement} ${spec.result?.title || ''}`.toLowerCase().includes(value))
  }, [query, specs])

  async function loadSpecs() {
    try {
      const [specResponse, overviewResponse, healthResponse] = await Promise.all([fetch(`${API}/specs/`), fetch(`${API}/overview/`), fetch(`${API}/health/`)])
      if (!specResponse.ok || !overviewResponse.ok) return
      setSpecs(await specResponse.json())
      setOverview(await overviewResponse.json())
      if (healthResponse.ok) setApiInfo(await healthResponse.json())
    } catch {
      // The sample mode remains usable when the API has not been started yet.
    }
  }

  useEffect(() => { loadSpecs() }, [])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function createSpec(text = requirement) {
    if (text.trim().length < 8) {
      setError('再多补充一点背景，至少写 8 个字。')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    setActiveSpecId(null)
    try {
      const response = await fetch(`${API}/specs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: text.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || '生成失败，请稍后重试。')
      setRequirement(text)
      setResult(payload.result)
      setActiveSpecId(payload.id)
      setActiveTab('summary')
      await loadSpecs()
      setToast(payload.result.mode === 'mock' ? '已生成演示草案' : 'AI 草案已生成，请人工审阅')
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? '暂时连不上服务端。启动后端后可生成并保存需求；也可以先加载演示样例。' : err.message)
    } finally {
      setLoading(false)
    }
  }

  async function openSpec(spec) {
    setView('workbench')
    setError('')
    try {
      const response = await fetch(`${API}/specs/${spec.id}/`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || '读取需求失败。')
      setRequirement(payload.requirement)
      setResult(payload.result)
      setActiveSpecId(payload.id)
      setActiveTab('summary')
      setIsEditing(false)
    } catch {
      setToast('暂时无法读取这条需求，请确认服务端正在运行。')
    }
  }

  async function saveReview() {
    if (!result) return
    if (!activeSpecId) {
      setIsEditing(false)
      setToast('演示样例的修改仅在本次预览中保留')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`${API}/specs/${activeSpecId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, status: 'reviewed' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || '保存失败。')
      setResult(payload.result)
      setIsEditing(false)
      await loadSpecs()
      setToast('已保存人工审阅版本')
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? '保存失败：服务端连接不可用。' : err.message)
    } finally {
      setSaving(false)
    }
  }

  function loadSample() {
    setRequirement(TEMPLATES[0].prompt)
    setResult(SAMPLE)
    setActiveSpecId(null)
    setActiveTab('summary')
    setIsEditing(false)
    setError('')
    setToast('这是用于预览界面的本地演示数据')
  }

  function updateList(key, index, value) {
    setResult((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }))
  }

  async function copyMarkdown() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(toMarkdown(result))
      setToast('需求草案已复制为 Markdown')
    } catch {
      setToast('复制失败，请检查浏览器权限')
    }
  }

  function downloadMarkdown() {
    if (!result) return
    const blob = new Blob([toMarkdown(result)], { type: 'text/markdown;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `${(result.title || '需求草案').replace(/[^\p{L}\p{N}-]+/gu, '-')}.md`
    link.click()
    URL.revokeObjectURL(href)
    setToast('Markdown 文件已下载')
  }

  const title = view === 'library' ? '需求档案' : view === 'workflow' ? 'AI 协作流程' : '需求工作台'

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark"><Icon name="spark" size={19} /></div>
        <div><div className="brand-name">specpilot</div><div className="brand-caption">AI 产品工程工作台</div></div>
      </div>

      <div className="workspace-switcher">
        <div className="workspace-avatar">S</div>
        <div className="workspace-copy"><strong>个人工作区</strong><span>免费空间</span></div>
        <span className="switcher-chevron">⌄</span>
      </div>

      <div className="nav-label">工作空间</div>
      <nav className="nav-list" aria-label="主导航">
        <button className={`nav-item ${view === 'workbench' ? 'active' : ''}`} onClick={() => setView('workbench')}><Icon name="spark" /><span>需求工作台</span><span className="nav-shortcut">⌘ 1</span></button>
        <button className={`nav-item ${view === 'library' ? 'active' : ''}`} onClick={() => setView('library')}><Icon name="list" /><span>需求档案</span><span className="nav-count">{overview.total}</span></button>
        <button className={`nav-item ${view === 'workflow' ? 'active' : ''}`} onClick={() => setView('workflow')}><Icon name="book" /><span>协作流程</span></button>
      </nav>

      <div className="sidebar-divider" />
      <div className="nav-label row-between"><span>最近更新</span><button className="text-icon" onClick={() => loadSpecs()} aria-label="刷新需求">↻</button></div>
      <div className="recent-list">
        {specs.slice(0, 5).map((spec) => <button className={`recent-item ${activeSpecId === spec.id ? 'selected' : ''}`} key={spec.id} onClick={() => openSpec(spec)}>
          <span className={`status-dot ${spec.status}`} />
          <span className="recent-title">{spec.result?.title || '未命名需求'}</span>
        </button>)}
        {!specs.length && <div className="recent-empty">你的需求草案会出现在这里</div>}
      </div>

      <div className="sidebar-bottom">
        <div className="mode-card">
          <span className="mode-indicator" />
          <div><strong>人工审阅优先</strong><span>AI 给草案，你来做决定</span></div>
        </div>
        <div className="profile-row"><div className="profile-avatar">子</div><div className="profile-info"><strong>我的工作区</strong><span>本地体验模式</span></div><button className="dots-button" aria-label="更多选项">···</button></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>SpecPilot</span><Icon name="chevron" size={14} /><strong>{title}</strong></div>
        <div className="topbar-actions"><span className="connection-status"><span className={apiInfo ? 'connected' : ''} /> {apiInfo ? (apiInfo.ai_provider === 'mock' ? 'API · 本地演示' : `API · ${apiInfo.ai_provider}`) : 'API · 离线预览'}</span><button className="help-button" onClick={() => setView('workflow')}>使用指南 <Icon name="arrow" size={14} /></button><div className="top-avatar">子</div></div>
      </header>

      {view === 'workbench' && <div className="workbench-content">
        <section className="welcome-row">
          <div className="welcome-content">
            <div className="eyebrow"><span className="eyebrow-line" /> AI 需求工作台</div>
            <h1><span className="headline-first">你想把什么想法，</span><span>变成产品？</span></h1>
            <p className="welcome-copy">写下场景和目标，SpecPilot 帮你整理成可讨论、可验证的需求草案。</p>
          </div>
        </section>

        <section className="composer-card">
          <label className="sr-only" htmlFor="requirement-input">需求描述</label>
          <textarea id="requirement-input" maxLength={5000} value={requirement} onChange={(event) => setRequirement(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') createSpec() }} placeholder="描述你的产品想法、目标用户和希望解决的问题……" />
          <div className="composer-footer">
            <div className="composer-tools"><span className="composer-mode"><Icon name="spark" size={15} />需求拆解</span><span className="input-hint"><span className="kbd">⌘</span><span>+ Enter 生成</span></span></div>
            <div className="composer-submit"><span className="character-count">{requirement.length} / 5000</span><button className="generate-button" onClick={() => createSpec()} disabled={loading}><span>{loading ? '正在整理需求…' : '生成需求草案'}</span><Icon name={loading ? 'clock' : 'arrow'} size={16} /></button></div>
          </div>
          {error && <div className="inline-error" role="alert">{error}</div>}
        </section>

        <div className="below-composer"><span>先看看完整输出？</span><button onClick={loadSample}>打开演示样例 <Icon name="chevron" size={14} /></button><span className="divider-dot">·</span><span>无需 API Key</span></div>

        {result && <section className="result-card" aria-live="polite">
          <div className="result-header">
            <div className="result-heading"><div className="result-icon"><Icon name="check" size={17} /></div><div><div className="result-kicker">{result.mode === 'sample' ? 'SAMPLE PREVIEW' : result.mode === 'mock' ? 'LOCAL MOCK' : 'AI DRAFT'} <span className="draft-pill">待人工确认</span></div><h2>{isEditing ? <input className="title-edit" value={result.title} onChange={(event) => setResult({ ...result, title: event.target.value })} /> : result.title}</h2></div></div>
            <div className="result-actions">{isEditing ? <><button className="secondary-button" onClick={() => setIsEditing(false)}>取消</button><button className="primary-small" onClick={saveReview} disabled={saving}>{saving ? '保存中…' : activeSpecId ? '确认并保存' : '完成预览编辑'}</button></> : <><button className="secondary-button" onClick={copyMarkdown}><Icon name="copy" size={15} />复制</button><button className="secondary-button" onClick={downloadMarkdown}><Icon name="download" size={15} />导出</button><button className="primary-small" onClick={() => setIsEditing(true)}>人工审阅</button></>}</div>
          </div>
          <div className="result-body">
            <nav className="result-tabs" aria-label="需求草案内容">{TABS.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><span>{tab.mark}</span>{tab.label}{tab.id === 'questions' && result.questions?.length > 0 && <i>{result.questions.length}</i>}</button>)}</nav>
            <div className="result-content">
              {activeTab === 'summary' && <>
                <div className="content-eyebrow">需求概览</div>
                <p className="summary-text">{isEditing ? <textarea className="summary-edit" value={result.summary} onChange={(event) => setResult({ ...result, summary: event.target.value })} rows={4} /> : result.summary}</p>
                <div className="content-eyebrow section-eyebrow">用户故事</div>
                <SectionList items={result.user_stories} editable={isEditing} onChange={(index, value) => updateList('user_stories', index, value)} />
                <div className="ai-note"><Icon name="spark" size={15} /><span>AI 输出是初稿。角色、权限和业务规则请结合实际场景确认。</span></div>
              </>}
              {activeTab === 'criteria' && <><div className="content-eyebrow">验收标准 <span className="count-label">{result.acceptance_criteria?.length || 0} 项</span></div><SectionList items={result.acceptance_criteria} numbered editable={isEditing} onChange={(index, value) => updateList('acceptance_criteria', index, value)} /></>}
              {activeTab === 'api' && <><div className="content-eyebrow">接口草案 <span className="count-label">待开发评审</span></div><div className="api-list">{(result.api_endpoints || []).map((endpoint, index) => <div className="api-row" key={`${endpoint.path}-${index}`}><span className={`method-tag ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span><code>{endpoint.path}</code><span className="api-purpose">{endpoint.purpose}</span></div>)}</div><div className="api-caveat">接口字段、鉴权方式和错误码需要和实际服务端设计保持一致。</div></>}
              {activeTab === 'tests' && <><div className="content-eyebrow">测试用例 <span className="count-label">建议覆盖边界情况</span></div><div className="test-list">{(result.test_cases || []).map((test, index) => <div className="test-case" key={`${test.name}-${index}`}><div className="test-index">T{String(index + 1).padStart(2, '0')}</div><div className="test-copy"><strong>{test.name}</strong><p><span>操作</span>{test.steps}</p><p><span>预期</span>{test.expected}</p></div></div>)}</div></>}
              {activeTab === 'questions' && <><div className="content-eyebrow">待确认问题 <span className="count-label">先确认这些，再进入开发</span></div><SectionList items={result.questions} numbered editable={isEditing} onChange={(index, value) => updateList('questions', index, value)} /><div className="content-eyebrow section-eyebrow">风险提示</div><SectionList items={result.risks} editable={isEditing} onChange={(index, value) => updateList('risks', index, value)} /></>}
            </div>
          </div>
          <div className="result-footer"><span><span className="status-dot draft" />草案可继续编辑</span><span>生成内容需由开发者检查与测试</span></div>
        </section>}

        {!result && <section className="template-section">
          <div className="template-heading"><div><span className="template-eyebrow">从场景开始</span><h2>常见需求起点</h2></div><span>选择一个示例，再按你的实际情况修改</span></div>
          <div className="template-grid">{TEMPLATES.map((template) => <button className="template-card" key={template.title} onClick={() => { setRequirement(template.prompt); document.getElementById('requirement-input')?.focus() }}>
            <span className="template-icon"><Icon name={template.icon} size={18} /></span><span className="template-arrow"><Icon name="arrow" size={15} /></span>
            <strong>{template.title}</strong><span className="template-description">{template.description}</span><span className="template-action">填入示例需求</span>
          </button>)}</div>
          <div className="workflow-strip"><div className="workflow-intro"><div className="workflow-chip">人工确认优先</div><h3>AI 整理，人来把关</h3><p>每一项输出都可以编辑、复核和测试。</p></div><div className="step-line"><div className="workflow-step"><span>01</span><div><strong>描述场景</strong><small>输入目标与背景</small></div></div><i /><div className="workflow-step"><span>02</span><div><strong>检查草案</strong><small>确认未知与风险</small></div></div><i /><div className="workflow-step"><span>03</span><div><strong>验证实现</strong><small>测试后再交付</small></div></div></div></div>
        </section>}
      </div>}

      {view === 'library' && <div className="library-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> 工作记录</div><h1>需求档案</h1><p>所有生成、审阅和保存过的需求草案。</p></div><button className="generate-button compact" onClick={() => setView('workbench')}><span>新建需求</span><Icon name="spark" size={16} /></button></div>
        <div className="library-toolbar"><div className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索需求标题或描述…" /></div><div className="library-total">共 {filteredSpecs.length} 条需求</div></div>
        <div className="library-list">{filteredSpecs.map((spec, index) => <button className="library-row" key={spec.id} onClick={() => openSpec(spec)}><div className="library-index">{String(index + 1).padStart(2, '0')}</div><div className="library-main"><div className="library-title">{spec.result?.title || '未命名需求'}<span className={`state-label ${spec.status}`}>{spec.status === 'reviewed' ? '已确认' : '草稿'}</span></div><p>{spec.requirement}</p><div className="library-meta"><span><Icon name="clock" size={13} />更新于 {formatDate(spec.updated_at)}</span><span>{spec.revision_count || 0} 次人工修订</span></div></div><Icon name="chevron" size={17} /></button>)}{!filteredSpecs.length && <div className="library-empty"><div className="empty-orbit"><Icon name="list" size={24} /></div><h3>{specs.length ? '没有找到匹配的需求' : '这里暂时还空着'}</h3><p>{specs.length ? '试试其他关键词。' : '新建一条需求草案，它会自动保存在这里。'}</p>{!specs.length && <button className="secondary-button" onClick={() => setView('workbench')}>开始创建</button>}</div>}</div>
      </div>}

      {view === 'workflow' && <div className="workflow-page">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> 使用指南</div><h1>AI 给草案，<br /><span>你负责把关。</span></h1><p>SpecPilot 的目标不是自动替人做决定，而是帮团队更快看清未知。</p></div><div className="workflow-hero-art"><div className="hero-art-orbit" /><div className="hero-art-card"><Icon name="spark" size={18} /><strong>human in the loop</strong><span>review → test → refine</span></div></div></div>
        <div className="principle-grid"><article><span className="principle-num">01</span><h3>先确认问题</h3><p>模型会列出信息缺口。实际用户、权限和异常流程以你补充的信息为准。</p></article><article><span className="principle-num">02</span><h3>再审阅输出</h3><p>验收标准、接口草案和测试用例都可以修改，确认后才保存为人工审阅版本。</p></article><article><span className="principle-num">03</span><h3>最后运行验证</h3><p>AI 生成的内容不等于正确实现。开发者仍需跑测试、检查边界并记录问题。</p></article></div>
        <div className="workflow-doc"><div className="doc-icon"><Icon name="book" size={20} /></div><div><strong>建议的协作记录</strong><p>把实际使用的提示、AI 生成内容、人工修改和测试结果记到项目的 AI_WORKFLOW.md。只记录真实过程，不写未经验证的性能或效率数字。</p></div></div>
      </div>}

      <footer className="app-footer"><span>SpecPilot <span className="footer-sep">/</span> 把想法变成可验证的下一步</span><span>人工审阅优先 · 当前 {overview.total} 条需求</span></footer>
    </main>
    {toast && <div className="toast" role="status"><Icon name="check" size={16} />{toast}</div>}
  </div>
}

export default App
