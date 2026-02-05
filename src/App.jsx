import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const STATUS_OPTIONS = ['Pending', 'Interview', 'Decline', 'Accepted'];
const COLUMN_LABELS = {
  company: 'Company',
  position: 'Position',
  date: 'Date Applied',
  status: 'Status',
  notes: 'Notes',
  risk: 'Risk',
  link: 'Link',
  actions: 'Actions'
};
const DEFAULT_VISIBLE_COLUMNS = {
  company: true,
  position: true,
  date: true,
  status: true,
  notes: true,
  risk: true,
  link: true,
  actions: true
};

const DEFAULT_PREP = {
  company: {
    oneLiner: '',
    productMarket: '',
    motivation: '',
    links: '',
    researchChecklist: ''
  },
  role: {
    summary: '',
    requirements: '',
    fit: ''
  },
  jd: {
    text: '',
    keywords: []
  },
  interview: {
    questions: '',
    myAnswers: '',
    questionsToAsk: ''
  }
};

const COPY = {
  en: {
    helpTitle: 'How to Use Career Launchpad',
    helpIntro: 'Track applications in a spreadsheet-style table. Add, edit, sort, and filter your entries to stay organized.',
    sectionBasics: 'Basics',
    basics: [
      'Paste a job URL and click Add Application to create a new entry.',
      'Click any Company or Position cell to edit. Press Enter to save, Esc to cancel.',
      'Use the search box and status filter to narrow results.'
    ],
    sectionTable: 'Table Controls',
    table: [
      'Click any column header to sort. Click again to toggle ascending/descending.',
      'Open Columns to hide/show fields and personalize your view.'
    ],
    sectionDuplicates: 'Duplicate Check',
    duplicates: [
      'If a URL or Company + Position matches an existing entry, you will see a confirmation prompt before adding.'
    ],
    sectionRisk: 'Risk Badge (Heuristic)',
    risk: [
      'Risk is a heuristic estimate based on signals like URL shorteners, non-HTTPS links, free hosting domains, and suspicious wording.',
      'Low/Medium/High is not a verdict. Always verify company legitimacy independently.'
    ],
    sectionPrivacy: 'Privacy',
    privacy: [
      'Your data is stored in your Supabase project.',
      'When you use Auto-fill, the job/company page text and URLs may be sent to OpenAI to generate structured notes.',
      'No third-party risk databases are used.'
    ],
    close: 'Close',
    help: 'Help',
    language: 'Language',
    langEn: 'English',
    langKo: 'Korean',
    prepOpen: 'Prep',
    prepTitle: 'Prep Sheet',
    prepCompany: 'Company',
    prepRole: 'Role',
    prepJD: 'JD & Keywords',
    prepInterview: 'Interview Prep',
    prepRisk: 'Risk Signals',
    companyOneLiner: 'One-liner (what the company does)',
    companyProductMarket: 'Product / Market notes',
    companyMotivation: 'Why this company?',
    companyLinks: 'Links (one per line)',
    companyChecklist: 'Research checklist',
    roleSummary: 'Role summary',
    roleRequirements: 'Key requirements',
    roleFit: 'My matching experiences',
    jdPaste: 'Paste the job description (JD)',
    jdKeywords: 'Keywords (comma-separated)',
    extractKeywords: 'Extract',
    interviewQuestions: 'Likely questions',
    interviewMyAnswers: 'My answers / stories',
    interviewQuestionsToAsk: 'Questions to ask the interviewer',
    interviewQuickStart: 'Quick Start',
    companyQuickStart: 'Auto-fill',
    roleQuickStart: 'Auto-fill',
    replaceAppendPrompt: 'Replace existing notes with templates?\n\nOK = Replace\nCancel = Append',
    autofillFailed: 'Auto-fill failed. Add the official company website to Links or paste the JD.',
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...'
  },
  ko: {
    helpTitle: 'Career Launchpad 사용 방법',
    helpIntro: '스프레드시트 스타일 테이블에서 지원서를 관리합니다. 추가, 편집, 정렬, 필터링을 활용하세요.',
    sectionBasics: '기본 사용법',
    basics: [
      '채용 공고 URL을 붙여넣고 Add Application을 눌러 항목을 추가합니다.',
      'Company 또는 Position 셀을 클릭해 편집합니다. Enter 저장, Esc 취소.',
      '검색창과 상태 필터로 결과를 좁힙니다.'
    ],
    sectionTable: '테이블 조작',
    table: [
      '컬럼 헤더 클릭으로 정렬, 다시 클릭하면 오름/내림차순 전환.',
      'Columns 메뉴에서 컬럼 표시/숨김을 설정합니다.'
    ],
    sectionDuplicates: '중복 체크',
    duplicates: [
      'URL 또는 Company + Position이 기존 항목과 같으면 추가 전에 확인 팝업이 뜹니다.'
    ],
    sectionRisk: 'Risk 배지 (휴리스틱)',
    risk: [
      'Risk는 URL 단축, HTTP 링크, 무료 호스팅 도메인, 의심 문구 등의 신호로 추정합니다.',
      'Low/Medium/High는 판단 참고용이며 확정이 아닙니다. 반드시 직접 검증하세요.'
    ],
    sectionPrivacy: '개인정보',
    privacy: [
      '데이터는 본인 Supabase 프로젝트에 저장됩니다.',
      '자동 채우기(Auto-fill)를 사용할 경우, 채용공고/회사 페이지 텍스트와 URL이 OpenAI로 전송되어 정리 결과를 생성할 수 있습니다.',
      '외부 리스크 DB는 사용하지 않습니다.'
    ],
    close: '닫기',
    help: '도움말',
    language: '언어',
    langEn: '영어',
    langKo: '한국어',
    prepOpen: '준비',
    prepTitle: '지원 준비 시트',
    prepCompany: '회사',
    prepRole: '직무',
    prepJD: 'JD & 키워드',
    prepInterview: '면접 준비',
    prepRisk: '리스크 신호',
    companyOneLiner: '한 줄 요약 (회사 소개)',
    companyProductMarket: '제품/시장 메모',
    companyMotivation: '지원 동기',
    companyLinks: '링크 (줄바꿈으로 입력)',
    companyChecklist: '리서치 체크리스트',
    roleSummary: '직무 요약',
    roleRequirements: '핵심 요건',
    roleFit: '내 경험 매칭',
    jdPaste: '채용 공고 내용(JD) 붙여넣기',
    jdKeywords: '키워드 (콤마로 구분)',
    extractKeywords: '추출',
    interviewQuestions: '예상 질문',
    interviewMyAnswers: '내 답변/사례',
    interviewQuestionsToAsk: '면접관에게 할 질문',
    interviewQuickStart: '기본 템플릿',
    companyQuickStart: '자동 채우기',
    roleQuickStart: '자동 채우기',
    replaceAppendPrompt: '기존 메모를 템플릿으로 덮어쓸까요?\n\n확인 = 덮어쓰기\n취소 = 뒤에 추가',
    autofillFailed: '자동 채우기에 실패했어요. Links에 회사 공식 사이트를 추가하거나 JD를 붙여넣어 주세요.',
    loading: '불러오는 중...',
    cancel: '취소',
    save: '저장',
    saving: '저장 중...'
  }
};

function App() {
  const [session, setSession] = useState(null)

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Only verify session on mount, let onAuthStateChange handle the rest
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setIsInitialLoading(false);
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchApplications().finally(() => setIsInitialLoading(false));
      } else {
        setApplications([]);
        setIsInitialLoading(false);
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editingValue, setEditingValue] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isPrepOpen, setIsPrepOpen] = useState(false);
  const [prepAppId, setPrepAppId] = useState(null);
  const [prepDraft, setPrepDraft] = useState(null);
  const [isPrepSaving, setIsPrepSaving] = useState(false);
  const [isCompanyAutofillLoading, setIsCompanyAutofillLoading] = useState(false);
  const [isRoleAutofillLoading, setIsRoleAutofillLoading] = useState(false);
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('uiLanguage') || 'en';
    } catch {
      return 'en';
    }
  });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('visibleColumns');
      return saved ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });
  const columnsRef = useRef(null);
  const prepInitialRef = useRef('');

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    try {
      localStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
    } catch {
      // ignore storage errors
    }
  }, [visibleColumns]);

  useEffect(() => {
    try {
      localStorage.setItem('uiLanguage', language);
    } catch {
      // ignore storage errors
    }
  }, [language]);

  useEffect(() => {
    if (!isHelpOpen) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isHelpOpen]);

  useEffect(() => {
    if (!isPrepOpen) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closePrep();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPrepOpen, prepDraft]);

  useEffect(() => {
    if (!isColumnsOpen) return;
    const handleClickOutside = (event) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target)) {
        setIsColumnsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsColumnsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isColumnsOpen]);

  const companyOptions = useMemo(() => {
    const set = new Set(applications.map(app => (app.company || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const positionOptions = useMemo(() => {
    const set = new Set(applications.map(app => (app.position || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const normalizeText = (value) => (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizeUrl = (value) => {
    if (!value) return '';
    try {
      const parsed = new URL(value);
      return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
    } catch {
      return value.toLowerCase().trim();
    }
  };

  const normalizePrep = (rawPrep = {}, app = null) => {
    const safePrep = rawPrep && typeof rawPrep === 'object' && !Array.isArray(rawPrep) ? rawPrep : {};
    const merged = {
      ...DEFAULT_PREP,
      ...safePrep,
      company: { ...DEFAULT_PREP.company, ...(safePrep.company || {}) },
      role: { ...DEFAULT_PREP.role, ...(safePrep.role || {}) },
      jd: { ...DEFAULT_PREP.jd, ...(safePrep.jd || {}) },
      interview: { ...DEFAULT_PREP.interview, ...(safePrep.interview || {}) }
    };

    if (!Array.isArray(merged.jd.keywords)) merged.jd.keywords = [];
    merged.jd.keywords = merged.jd.keywords.map(String).map(s => s.trim()).filter(Boolean);

    if (app?.url && !merged.company.links.trim()) {
      merged.company.links = app.url;
    }

    return merged;
  };

  const extractKeywordsFromText = (text) => {
    const input = (text || '').toLowerCase();
    const stop = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have', 'how',
      'i', 'in', 'is', 'it', 'its', 'job', 'more', 'of', 'on', 'or', 'our', 'role', 'the', 'their',
      'they', 'this', 'to', 'we', 'will', 'with', 'you', 'your', 'years', 'year', 'experience',
      'work', 'working', 'team', 'ability', 'skills', 'strong', 'including', 'preferred', 'plus'
    ]);

    const tokens = input.match(/[a-z0-9][a-z0-9+.#/\\-]{1,30}/g) || [];
    const counts = new Map();

    for (const token of tokens) {
      const t = token.trim();
      if (!t) continue;
      if (t.length < 2) continue;
      if (stop.has(t)) continue;
      if (/^\d+$/.test(t)) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word]) => word);
  };

  const buildInterviewTemplates = (lang, app, prep) => {
    const keywords = Array.isArray(prep?.jd?.keywords) ? prep.jd.keywords.slice(0, 6) : [];
    const role = (app?.position || '').trim();
    const company = (app?.company || '').trim();

    const topicQuestionsEn = {
      sql: [
        'Explain INNER vs LEFT JOIN. When would you use each?',
        'How would you debug and optimize a slow query?'
      ],
      python: [
        'How do you structure a data pipeline/script for maintainability?',
        'What are common pitfalls with Python performance and how do you profile?'
      ],
      react: [
        'Explain state vs props. When would you lift state up?',
        'How do you prevent unnecessary re-renders in React?'
      ],
      javascript: [
        'Explain the event loop (microtasks vs macrotasks).',
        'What is a closure and where have you used it?'
      ],
      node: [
        'How do you handle async work and errors in Node.js?',
        'What are common API reliability issues and how do you mitigate them?'
      ],
      api: [
        'Design a REST API endpoint for creating and listing applications.',
        'How do you version an API and handle backwards compatibility?'
      ],
      robotics: [
        'What is PID control and where would you apply it?',
        'How would you validate sensor data and handle noise?'
      ],
      data: [
        'How do you choose metrics and define success for an analysis?',
        'Walk through an analysis you did end-to-end (data → insights → action).'
      ],
      ml: [
        'How do you evaluate a model and avoid overfitting?',
        'Explain precision/recall and when each matters.'
      ]
    };

    const topicQuestionsKo = {
      sql: [
        'INNER JOIN과 LEFT JOIN의 차이와 각각의 사용 사례를 설명해줘.',
        '느린 쿼리를 어떻게 디버깅하고 최적화할지 과정을 설명해줘.'
      ],
      python: [
        '유지보수가 쉬운 파이썬 스크립트/파이프라인 구조를 어떻게 잡는지 설명해줘.',
        '파이썬 성능 이슈를 어떻게 프로파일링하고 개선하는지 말해줘.'
      ],
      react: [
        'state와 props의 차이, state를 상위로 올려야 하는 경우를 설명해줘.',
        'React에서 불필요한 리렌더링을 줄이는 방법을 설명해줘.'
      ],
      javascript: [
        '이벤트 루프(마이크로태스크/매크로태스크)를 설명해줘.',
        '클로저(closure)가 무엇이고 어떤 상황에서 사용했는지 말해줘.'
      ],
      node: [
        'Node.js에서 비동기 처리와 에러 처리를 어떻게 하는지 설명해줘.',
        'API 신뢰성 문제(타임아웃, 재시도, 레이트리밋 등)를 어떻게 다루는지 말해줘.'
      ],
      api: [
        '지원서 생성/조회 기능을 위한 REST API를 어떻게 설계할지 설명해줘.',
        'API 버저닝과 하위 호환성은 어떻게 관리할지 말해줘.'
      ],
      robotics: [
        'PID 제어가 무엇이고 어떤 상황에서 쓰는지 설명해줘.',
        '센서 노이즈를 다루고 데이터를 검증하는 방법을 말해줘.'
      ],
      data: [
        '분석에서 성공 지표를 어떻게 선택하고 정의하는지 말해줘.',
        '내가 했던 분석을 end-to-end로 설명해줘(데이터→인사이트→액션).'
      ],
      ml: [
        '모델을 평가하고 과적합을 피하는 방법을 설명해줘.',
        '정밀도/재현율(precision/recall)과 각각이 중요한 상황을 말해줘.'
      ]
    };

    const normalizeKey = (value) => normalizeText(value).replace(/[^a-z0-9+.#/\\-]/g, '');
    const topicHits = new Set();
    for (const kw of keywords) {
      const k = normalizeKey(kw);
      if (!k) continue;
      if (k.includes('sql') || k.includes('postgres') || k.includes('mysql')) topicHits.add('sql');
      if (k.includes('python')) topicHits.add('python');
      if (k.includes('react')) topicHits.add('react');
      if (k.includes('javascript') || k === 'js' || k.includes('typescript') || k === 'ts') topicHits.add('javascript');
      if (k.includes('node') || k.includes('express')) topicHits.add('node');
      if (k.includes('api') || k.includes('rest') || k.includes('graphql')) topicHits.add('api');
      if (k.includes('robot') || k.includes('ros') || k.includes('slam')) topicHits.add('robotics');
      if (k.includes('data') || k.includes('analytics') || k.includes('tableau') || k.includes('excel')) topicHits.add('data');
      if (k.includes('ml') || k.includes('machinelearning') || k.includes('model') || k.includes('pytorch') || k.includes('tensorflow')) topicHits.add('ml');
    }

    const topicQuestions = [];
    const bank = lang === 'ko' ? topicQuestionsKo : topicQuestionsEn;
    for (const topic of Array.from(topicHits)) {
      for (const q of bank[topic] || []) topicQuestions.push(q);
    }

    if (lang === 'ko') {
      const questions = [
        `대상: ${company || '(회사)'} / ${role || '(직무)'}`,
        '',
        '행동/커뮤니케이션',
        '- 1분 자기소개(핵심 경험 2~3개 + 이 직무에 맞는 이유)',
        '- 왜 이 회사? 왜 이 직무?',
        '- 애매한 요구사항/불확실성을 다뤘던 경험은?',
        '- 의견 충돌/피드백을 주고받은 경험은?',
        '- 실패 경험과 배운 점은?',
        '',
        '프로젝트 딥다이브',
        '- 가장 자신 있는 프로젝트 1~2개: 문제/제약/트레이드오프/임팩트(수치)',
        '- 내가 맡은 역할과 협업 방식',
        '',
        `키워드 포커스: ${keywords.length ? keywords.join(', ') : '(JD에서 Extract로 키워드를 뽑아봐)'}`,
        ...(topicQuestions.length ? ['','기술/직무 질문','- ' + topicQuestions.join('\n- ')] : []),
        '',
        '실무/운영',
        '- 첫 2주에 무엇을 배우고 어떤 결과를 내고 싶나?',
        '- 일정이 밀렸을 때 우선순위는 어떻게 정하나?'
      ].join('\n');

      const myAnswers = [
        '1) 1분 자기소개 스크립트',
        '-',
        '',
        '2) STAR 스토리 3개 준비',
        'Story A (리더십/주도성)',
        'S:',
        'T:',
        'A:',
        'R: (수치/결과)',
        '배운 점:',
        '',
        'Story B (기술적 문제 해결)',
        'S:',
        'T:',
        'A:',
        'R:',
        '배운 점:',
        '',
        'Story C (협업/갈등/커뮤니케이션)',
        'S:',
        'T:',
        'A:',
        'R:',
        '배운 점:'
      ].join('\n');

      const questionsToAsk = [
        '질문 리스트(면접관에게)',
        '- 이 직무에서 성공의 기준은 무엇인가요? (30/60/90일)',
        '- 팀 구조와 협업 방식은 어떤가요?',
        '- 지금 가장 큰 문제/우선순위는 무엇인가요?',
        '- 인턴/신입에게 기대하는 결과물은 무엇인가요?',
        '- 기술 스택/툴링/코드 리뷰 문화는 어떤가요?',
        '- 다음 단계와 타임라인은 어떻게 되나요?'
      ].join('\n');

      return { questions, myAnswers, questionsToAsk };
    }

    const questions = [
      `Target: ${company || '(Company)'} / ${role || '(Role)'}`,
      '',
      'Behavioral',
      '- 60-second pitch (2–3 relevant experiences + why this role)',
      '- Why this company? Why this role?',
      '- A time you handled ambiguity or unclear requirements',
      '- A time you disagreed with a teammate / handled feedback',
      '- A failure and what you learned',
      '',
      'Project Deep Dive',
      '- 1–2 best projects: problem, constraints, tradeoffs, impact (numbers)',
      '- Your role + collaboration + what you would do next',
      '',
      `Focus keywords: ${keywords.length ? keywords.join(', ') : '(Use Extract on the JD to get keywords)'}`,
      ...(topicQuestions.length ? ['','Role / Technical','- ' + topicQuestions.join('\n- ')] : []),
      '',
      'Execution',
      '- What would you aim to learn/deliver in the first 2 weeks?',
      '- How do you prioritize when everything feels urgent?'
    ].join('\n');

    const myAnswers = [
      '1) 60-second pitch script',
      '-',
      '',
      '2) STAR stories (prepare 3)',
      'Story A (Leadership / ownership)',
      'S:',
      'T:',
      'A:',
      'R: (numbers)',
      'Learnings:',
      '',
      'Story B (Technical problem solving)',
      'S:',
      'T:',
      'A:',
      'R:',
      'Learnings:',
      '',
      'Story C (Collaboration / conflict)',
      'S:',
      'T:',
      'A:',
      'R:',
      'Learnings:'
    ].join('\n');

    const questionsToAsk = [
      'Questions to ask the interviewer',
      '- What does success look like in the first 30/60/90 days?',
      '- How is the team structured and how do you collaborate?',
      '- What are the biggest challenges the team is tackling right now?',
      '- What do you expect from interns/new grads on this team?',
      '- What is the tech stack / tooling / code review culture like?',
      '- What are the next steps and timeline?'
    ].join('\n');

    return { questions, myAnswers, questionsToAsk };
  };

  const extractUrls = (text) => {
    const input = String(text || '');
    const matches = input.match(/https?:\/\/[^\s)]+/g);
    return (matches || []).map(m => m.replace(/[.,;]$/, ''));
  };

  const pickCompanyUrlFromLinks = (linksText) => {
    const urls = extractUrls(linksText);
    if (!urls.length) return '';
    const knownJobBoards = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'wellfound.com', 'lever.co', 'greenhouse.io'];
    const nonBoard = urls.find(u => {
      try {
        const host = new URL(u).hostname.toLowerCase();
        return !knownJobBoards.some(domain => host.includes(domain));
      } catch {
        return false;
      }
    });
    return nonBoard || urls[0];
  };

  const invokeAutofillPrep = async ({ mode, jobUrl, companyUrl }) => {
    const { data, error } = await supabase.functions.invoke('autofill-prep', {
      body: {
        mode,
        jobUrl,
        companyUrl: companyUrl || undefined,
        language,
        companyName: prepApp?.company,
        roleTitle: prepApp?.position
      }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const getRiskAssessment = (app) => {
    const url = (app.url || '').trim().toLowerCase();
    if (!url) {
      return { level: 'Unknown', score: 0, signals: ['No job URL'] };
    }

    let score = 0;
    const signals = [];
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rebrand.ly'];
    const freeHosts = ['wixsite.com', 'weebly.com', 'blogspot.com', 'sites.google.com', 'github.io', 'notion.site', 'webflow.io'];
    const knownJobBoards = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'wellfound.com', 'lever.co', 'greenhouse.io'];

    if (shorteners.some(domain => url.includes(domain))) {
      score += 3;
      signals.push('Shortened URL');
    }
    if (freeHosts.some(domain => url.includes(domain))) {
      score += 2;
      signals.push('Free hosting domain');
    }
    if (url.startsWith('http://')) {
      score += 1;
      signals.push('Not HTTPS');
    }

    const companyTokens = normalizeText(app.company)
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter(token => token.length > 3);
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    const companyMatchesDomain = companyTokens.some(token => domain.includes(token));
    if (!companyMatchesDomain && !knownJobBoards.some(domainName => domain.includes(domainName))) {
      score += 1;
      signals.push('Company name not in domain');
    }

    const suspiciousWords = [
      'quick money',
      'no experience',
      'instant hire',
      'training fee',
      'pay to start',
      'wire money',
      'crypto',
      'deposit required'
    ];
    const text = normalizeText(`${app.position || ''} ${app.notes || ''}`);
    if (suspiciousWords.some(word => text.includes(word))) {
      score += 2;
      signals.push('Suspicious wording');
    }

    let level = 'Low';
    if (score >= 4) level = 'High';
    else if (score >= 2) level = 'Medium';

    return { level, score, signals: signals.length ? signals : ['No obvious signals'] };
  };

  const sortedApplications = useMemo(() => {
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    const list = [...filteredApplications];
    list.sort((a, b) => {
      if (key === 'date') {
        return (new Date(a.date) - new Date(b.date)) * dir;
      }
      if (key === 'status') {
        return a.status.localeCompare(b.status) * dir;
      }
      if (key === 'risk') {
        return (getRiskAssessment(a).score - getRiskAssessment(b).score) * dir;
      }
      const valueA = normalizeText(a[key]);
      const valueB = normalizeText(b[key]);
      return valueA.localeCompare(valueB) * dir;
    });
    return list;
  }, [filteredApplications, sortConfig]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;

  // Calculate Stats
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'Pending').length,
    interview: applications.filter(app => app.status === 'Interview').length,
    accepted: applications.filter(app => app.status === 'Accepted').length,
    decline: applications.filter(app => app.status === 'Decline').length,
  };

  // Toast State
  const [toast, setToast] = useState(null); // { message, type, undoAction }
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'info', undoAction = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type, undoAction });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000); // Show for 4 seconds
  };

  const closeToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      showToast('Failed to load applications', 'error');
    }
  };

  const fetchMetadata = async (targetUrl) => {
    setLoading(true);
    let company = 'New Company';
    let position = 'New Position';

    try {
      if (targetUrl) {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
        const data = await response.json();

        if (data.status === 'success') {
          const { title, publisher } = data.data;
          company = publisher || 'Unknown Company';
          position = title || 'Unknown Position';

          if (targetUrl.includes('linkedin.com') || publisher?.toLowerCase().includes('linkedin')) {
            const hiringMatch = title.match(/^(.*?) hiring (.*?) in .*? \| LinkedIn$/);
            if (hiringMatch) {
              company = hiringMatch[1];
              position = hiringMatch[2];
            } else {
              const atMatch = title.match(/^(.*?) at (.*?) \| LinkedIn$/);
              if (atMatch) {
                position = title.replace(' | LinkedIn', '');
                company = 'LinkedIn (Check Details)';
              }
            }
          }
        }
      }

      const urlKey = normalizeUrl(targetUrl);
      const companyKey = normalizeText(company);
      const positionKey = normalizeText(position);
      const hasDuplicate = applications.some(app =>
        (urlKey && normalizeUrl(app.url) === urlKey) ||
        (companyKey && positionKey &&
          normalizeText(app.company) === companyKey &&
          normalizeText(app.position) === positionKey)
      );

      if (hasDuplicate) {
        const proceed = window.confirm('This looks like a duplicate entry. Add anyway?');
        if (!proceed) {
          showToast('Duplicate skipped', 'info');
          setLoading(false);
          return;
        }
      }

      // Add to Supabase
      const newApp = {
        user_id: session.user.id,
        company,
        position,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        url: targetUrl || '',
        notes: ''
      };

      const { data, error } = await supabase
        .from('applications')
        .insert([newApp])
        .select()
        .single();

      if (error) throw error;

      setApplications(prev => [data, ...prev]);
      showToast('Application added successfully', 'success');
      setUrl('');

    } catch (error) {
      console.error('Error adding application:', error);
      // Fallback manual entry logic if API fails but we still want to add
      if (targetUrl && error.message !== 'Error adding application') {
        try {
          const manualApp = {
            user_id: session.user.id,
            company: 'Edit Company',
            position: 'Edit Position',
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            url: targetUrl,
            notes: ''
          };
          const { data: manualData, error: manualError } = await supabase
            .from('applications')
            .insert([manualApp])
            .select()
            .single();

          if (manualError) throw manualError;
          setApplications(prev => [manualData, ...prev]);
          showToast('Added manually. Edit details below.', 'warning');
          setUrl('');
        } catch (e) {
          showToast('Error adding application', 'error');
        }
      } else {
        showToast('Error adding application', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    fetchMetadata(url);
  };

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const openPrep = (app) => {
    const normalized = normalizePrep(app.prep, app);
    setPrepAppId(app.id);
    setPrepDraft(normalized);
    prepInitialRef.current = JSON.stringify(normalized);
    setIsPrepOpen(true);
  };

  const closePrep = () => {
    if (prepDraft) {
      const now = JSON.stringify(prepDraft);
      if (now !== prepInitialRef.current) {
        const proceed = window.confirm('You have unsaved changes. Close without saving?');
        if (!proceed) return;
      }
    }
    setIsPrepOpen(false);
    setPrepAppId(null);
    setPrepDraft(null);
    setIsPrepSaving(false);
    prepInitialRef.current = '';
  };

  const updatePrep = (section, field, value) => {
    setPrepDraft(prev => {
      const base = prev || normalizePrep({}, null);
      return { ...base, [section]: { ...base[section], [field]: value } };
    });
  };

  const updatePrepKeywords = (value) => {
    const keywords = (value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    setPrepDraft(prev => {
      const base = prev || normalizePrep({}, null);
      return { ...base, jd: { ...base.jd, keywords } };
    });
  };

  const extractKeywordsIntoPrep = () => {
    setPrepDraft(prev => {
      const base = prev || normalizePrep({}, null);
      const keywords = extractKeywordsFromText(base.jd.text);
      return { ...base, jd: { ...base.jd, keywords } };
    });
  };

  const applyInterviewQuickStart = () => {
    if (!prepApp || !prepDraft) return;
    const templates = buildInterviewTemplates(language, prepApp, prepDraft);

    const hasAny =
      (prepDraft.interview.questions || '').trim() ||
      (prepDraft.interview.myAnswers || '').trim() ||
      (prepDraft.interview.questionsToAsk || '').trim();

    const replace = hasAny
      ? window.confirm('Replace existing Interview Prep notes with templates?\n\nOK = Replace\nCancel = Append')
      : true;

    const mergeText = (existing, next) => {
      const ex = (existing || '').trim();
      const nx = (next || '').trim();
      if (!ex) return nx;
      if (!nx) return ex;
      if (replace) return nx;
      return `${ex}\n\n---\n\n${nx}`;
    };

    setPrepDraft(prev => {
      const base = prev || normalizePrep({}, prepApp);
      return {
        ...base,
        interview: {
          ...base.interview,
          questions: mergeText(base.interview.questions, templates.questions),
          myAnswers: mergeText(base.interview.myAnswers, templates.myAnswers),
          questionsToAsk: mergeText(base.interview.questionsToAsk, templates.questionsToAsk)
        }
      };
    });
  };

  const applyCompanyQuickStart = async () => {
    if (!prepApp || !prepDraft) return;
    setIsCompanyAutofillLoading(true);
    try {
      const companyUrl = pickCompanyUrlFromLinks(prepDraft.company.links) || '';
      const data = await invokeAutofillPrep({ mode: 'company', jobUrl: prepApp.url, companyUrl });
      const company = data?.company || {};
      const templates = {
        oneLiner: company.oneLiner || '',
        productMarket: company.productMarket || '',
        motivation: company.motivation || '',
        researchChecklist: company.researchChecklist || '',
        links: company.links || ''
      };

      const hasAny =
        (prepDraft.company.oneLiner || '').trim() ||
        (prepDraft.company.productMarket || '').trim() ||
        (prepDraft.company.motivation || '').trim() ||
        (prepDraft.company.researchChecklist || '').trim() ||
        (prepDraft.company.links || '').trim();

      const replace = hasAny ? window.confirm(content.replaceAppendPrompt) : true;

      const mergeText = (existing, next) => {
        const ex = (existing || '').trim();
        const nx = (next || '').trim();
        if (!ex) return nx;
        if (!nx) return ex;
        if (replace) return nx;
        return `${ex}\n\n---\n\n${nx}`;
      };

      setPrepDraft(prev => {
        const base = prev || normalizePrep({}, prepApp);
        return {
          ...base,
          company: {
            ...base.company,
            oneLiner: mergeText(base.company.oneLiner, templates.oneLiner),
            productMarket: mergeText(base.company.productMarket, templates.productMarket),
            motivation: mergeText(base.company.motivation, templates.motivation),
            researchChecklist: mergeText(base.company.researchChecklist, templates.researchChecklist),
            links: mergeText(base.company.links, templates.links)
          }
        };
      });
      showToast('Company notes added', 'success');
    } catch (error) {
      console.error('Company autofill failed:', error);
      showToast(content.autofillFailed, 'error');
    } finally {
      setIsCompanyAutofillLoading(false);
    }
  };

  const applyRoleQuickStart = async () => {
    if (!prepApp || !prepDraft) return;
    setIsRoleAutofillLoading(true);
    try {
      const companyUrl = pickCompanyUrlFromLinks(prepDraft.company.links) || '';
      const data = await invokeAutofillPrep({ mode: 'role', jobUrl: prepApp.url, companyUrl });
      const role = data?.role || {};
      const templates = {
        summary: role.summary || '',
        requirements: role.requirements || '',
        fit: role.fit || ''
      };
      const responseKeywords = Array.isArray(data?.jd?.keywords) ? data.jd.keywords : [];

      const hasAny =
        (prepDraft.role.summary || '').trim() ||
        (prepDraft.role.requirements || '').trim() ||
        (prepDraft.role.fit || '').trim();

      const replace = hasAny ? window.confirm(content.replaceAppendPrompt) : true;

      const mergeText = (existing, next) => {
        const ex = (existing || '').trim();
        const nx = (next || '').trim();
        if (!ex) return nx;
        if (!nx) return ex;
        if (replace) return nx;
        return `${ex}\n\n---\n\n${nx}`;
      };

      setPrepDraft(prev => {
        const base = normalizePrep(prev, prepApp);
        const mergedKeywords = Array.from(new Set([
          ...(base.jd.keywords || []),
          ...responseKeywords
        ].map(s => String(s).trim()).filter(Boolean))).slice(0, 20);
        const merged = {
          ...base,
          jd: {
            ...base.jd,
            keywords: mergedKeywords
          },
          role: {
            ...base.role,
            summary: mergeText(base.role.summary, templates.summary),
            requirements: mergeText(base.role.requirements, templates.requirements),
            fit: mergeText(base.role.fit, templates.fit)
          }
        };
        return merged;
      });

      showToast('Role notes added', 'success');
    } catch (error) {
      console.error('Role autofill failed:', error);
      showToast(content.autofillFailed, 'error');
    } finally {
      setIsRoleAutofillLoading(false);
    }
  };

  const savePrep = async () => {
    if (!prepAppId || !prepDraft) return;
    const previousApps = [...applications];
    setApplications(prev =>
      prev.map(app => (app.id === prepAppId ? { ...app, prep: prepDraft } : app))
    );
    setIsPrepSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ prep: prepDraft })
        .eq('id', prepAppId);
      if (error) throw error;
      prepInitialRef.current = JSON.stringify(prepDraft);
      showToast('Prep sheet saved', 'success');
    } catch (error) {
      console.error('Error saving prep sheet:', error);
      setApplications(previousApps);
      showToast('Failed to save prep sheet', 'error');
    } finally {
      setIsPrepSaving(false);
    }
  };

  const startEditing = (app, field) => {
    setEditingCell({ id: app.id, field });
    setEditingValue(app[field] || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const commitEditing = () => {
    if (!editingCell) return;
    handleUpdate(editingCell.id, editingCell.field, editingValue.trim());
    cancelEditing();
  };

  const handleUpdate = async (id, field, value) => {
    // Optimistic UI update
    const previousApps = [...applications];
    setApplications(applications.map(app =>
      app.id === id ? { ...app, [field]: value } : app
    ));

    try {
      const { error } = await supabase
        .from('applications')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating application:', error);
      setApplications(previousApps); // Revert
      showToast('Failed to update', 'error');
    }
  };

  const handleDelete = async (id) => {
    const appToDelete = applications.find(app => app.id === id);
    if (!appToDelete) return;

    // Optimistic UI update
    setApplications(applications.filter(app => app.id !== id));

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(
        `Deleted ${appToDelete.company} application`,
        'info',
        async () => {
          // Undo logic: Re-insert the deleted item content
          const { id: _, created_at: __, ...appData } = appToDelete;

          const { data, error: restoreError } = await supabase
            .from('applications')
            .insert([appData])
            .select()
            .single();

          if (restoreError) {
            showToast('Failed to undo deletion', 'error');
          } else {
            setApplications(prev => [data, ...prev].sort((a, b) => b.id - a.id));
            showToast('Deletion undone', 'success');
          }
        }
      );

    } catch (error) {
      console.error('Error deleting application:', error);
      fetchApplications(); // Revert by re-fetching
      showToast('Failed to delete', 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setApplications([]);
  };

  if (!session) {
    return <Auth />;
  }

  const content = COPY[language] || COPY.en;
  const prepApp = prepAppId ? applications.find(app => app.id === prepAppId) : null;

  return (
    <div className="container">
      {isInitialLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)', zIndex: 2000 }}>
          <div className="loading" style={{ width: '3rem', height: '3rem', borderWidth: '4px' }}></div>
        </div>
      )}
      <header className="app-header">
        <div>
          <h1>Internship Tracker</h1>
          <p className="subtitle">Manage and track your career opportunities with ease.</p>
        </div>
        <div className="user-actions">
          <button className="help-btn" onClick={() => setIsHelpOpen(true)}>
            {content.help}
          </button>
          <span className="user-email">{session.user.email}</span>
          <button className="delete-btn logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card stat-pending">
          <h3>Pending</h3>
          <p>{stats.pending}</p>
        </div>
        <div className="stat-card stat-interview">
          <h3>Interview</h3>
          <p>{stats.interview}</p>
        </div>
        <div className="stat-card stat-accepted">
          <h3>Accepted</h3>
          <p>{stats.accepted}</p>
        </div>
        <div className="stat-card stat-decline">
          <h3>Declined</h3>
          <p>{stats.decline}</p>
        </div>
      </div>

      <div className="input-section">
        <input
          type="text"
          placeholder="Paste Internship URL (e.g., LinkedIn link)..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddRow()}
        />
        <button className="add-btn" onClick={handleAddRow} disabled={loading}>
          {loading ? <span className="loading"></span> : 'Add Application'}
        </button>
      </div>

      <div className="filter-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search company or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="columns-wrapper" ref={columnsRef}>
          <button
            className="columns-button"
            type="button"
            onClick={() => setIsColumnsOpen(prev => !prev)}
          >
            Columns
          </button>
          {isColumnsOpen && (
            <div className="columns-popover">
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <label key={key} className="columns-item">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={() =>
                      setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="table-container">
        <datalist id="company-options">
          {companyOptions.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="position-options">
          {positionOptions.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <table>
          <thead>
            <tr>
              {visibleColumns.company && (
                <th className="sortable" onClick={() => handleSort('company')}>
                  Company {sortConfig.key === 'company' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.position && (
                <th className="sortable" onClick={() => handleSort('position')}>
                  Position {sortConfig.key === 'position' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.date && (
                <th className="sortable" onClick={() => handleSort('date')}>
                  Date Applied {sortConfig.key === 'date' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.status && (
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.notes && <th>Notes</th>}
              {visibleColumns.risk && (
                <th className="sortable" onClick={() => handleSort('risk')}>
                  Risk {sortConfig.key === 'risk' && <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </th>
              )}
              {visibleColumns.link && <th>Link</th>}
              {visibleColumns.actions && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sortedApplications.map((app) => {
              const risk = getRiskAssessment(app);
              return (
              <tr key={app.id}>
                {visibleColumns.company && (
                  <td data-label="Company">
                    {editingCell?.id === app.id && editingCell?.field === 'company' ? (
                      <input
                        className="cell-input"
                        list="company-options"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                    ) : (
                      <button className="cell-display" onClick={() => startEditing(app, 'company')}>
                        {app.company}
                      </button>
                    )}
                  </td>
                )}
                {visibleColumns.position && (
                  <td data-label="Position">
                    {editingCell?.id === app.id && editingCell?.field === 'position' ? (
                      <input
                        className="cell-input"
                        list="position-options"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditing();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                    ) : (
                      <button className="cell-display" onClick={() => startEditing(app, 'position')}>
                        {app.position}
                      </button>
                    )}
                  </td>
                )}
                {visibleColumns.date && (
                  <td data-label="Date Applied">
                    <input
                      type="date"
                      value={app.date}
                      style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit' }}
                      onChange={(e) => handleUpdate(app.id, 'date', e.target.value)}
                    />
                  </td>
                )}
                {visibleColumns.status && (
                  <td data-label="Status">
                    <select
                      value={app.status}
                      className={`status-badge status-${app.status.toLowerCase()}`}
                      onChange={(e) => handleUpdate(app.id, 'status', e.target.value)}
                      style={{ border: 'none', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                )}
                {visibleColumns.notes && (
                  <td
                    data-label="Notes"
                    contentEditable
                    suppressContentEditableWarning
                    className="editable notes-cell"
                    onBlur={(e) => handleUpdate(app.id, 'notes', e.target.innerText)}
                  >
                    {app.notes || ''}
                  </td>
                )}
                {visibleColumns.risk && (
                  <td data-label="Risk" title={`Heuristic signals: ${risk.signals.join(', ')}`}>
                    <span className={`risk-badge risk-${risk.level.toLowerCase()}`}>
                      {risk.level}
                    </span>
                  </td>
                )}
                {visibleColumns.link && (
                  <td data-label="Link">
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                        🔗 Visit
                      </a>
                    ) : '-'}
                  </td>
                )}
                {visibleColumns.actions && (
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title={content.prepOpen}
                        onClick={() => openPrep(app)}
                      >
                        📝
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(app.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )})}
            {sortedApplications.length === 0 && (
              <tr>
                <td colSpan={visibleColumnCount || 1} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  No applications yet. Paste a link above to start!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type} show`}>
          <span>{toast.message}</span>
          {toast.undoAction && (
            <button className="toast-undo-btn" onClick={() => {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              toast.undoAction();
            }}>
              Undo
            </button>
          )}
          <button className="toast-close-btn" onClick={closeToast}>×</button>
        </div>
      )}

      {isHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsHelpOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{content.helpTitle}</h2>
              <div className="modal-header-actions">
                <div className="language-toggle">
                  <span className="language-label">{content.language}</span>
                  <button
                    className={`language-btn ${language === 'en' ? 'active' : ''}`}
                    onClick={() => setLanguage('en')}
                  >
                    {content.langEn}
                  </button>
                  <button
                    className={`language-btn ${language === 'ko' ? 'active' : ''}`}
                    onClick={() => setLanguage('ko')}
                  >
                    {content.langKo}
                  </button>
                </div>
                <button className="modal-close" onClick={() => setIsHelpOpen(false)}>
                  ×
                </button>
              </div>
            </div>
            <p className="modal-intro">{content.helpIntro}</p>

            <div className="modal-section">
              <h3>{content.sectionBasics}</h3>
              <ul>
                {content.basics.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-section">
              <h3>{content.sectionTable}</h3>
              <ul>
                {content.table.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-section">
              <h3>{content.sectionDuplicates}</h3>
              <ul>
                {content.duplicates.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-section">
              <h3>{content.sectionRisk}</h3>
              <ul>
                {content.risk.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-section">
              <h3>{content.sectionPrivacy}</h3>
              <ul>
                {content.privacy.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="modal-actions">
              <button className="add-btn" onClick={() => setIsHelpOpen(false)}>
                {content.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrepOpen && prepDraft && prepApp && (
        <div className="modal-overlay" onClick={closePrep}>
          <div className="modal prep-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{content.prepTitle}</h2>
                <p className="prep-subtitle">{prepApp.company} · {prepApp.position}</p>
              </div>
              <div className="modal-header-actions">
                <button className="secondary-btn" onClick={savePrep} disabled={isPrepSaving}>
                  {isPrepSaving ? content.saving : content.save}
                </button>
                <button className="modal-close" onClick={closePrep}>
                  ×
                </button>
              </div>
            </div>

            <div className="prep-grid">
              <div className="prep-card">
                <div className="prep-card-header">
                  <h3>{content.prepCompany}</h3>
                  <button
                    className="secondary-btn"
                    onClick={applyCompanyQuickStart}
                    disabled={isCompanyAutofillLoading}
                    type="button"
                  >
                    {isCompanyAutofillLoading ? content.loading : content.companyQuickStart}
                  </button>
                </div>
                <label className="form-field">
                  <span className="form-label">{content.companyOneLiner}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.company.oneLiner}
                    onChange={(e) => updatePrep('company', 'oneLiner', e.target.value)}
                    rows={2}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.companyProductMarket}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.company.productMarket}
                    onChange={(e) => updatePrep('company', 'productMarket', e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.companyMotivation}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.company.motivation}
                    onChange={(e) => updatePrep('company', 'motivation', e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.companyLinks}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.company.links}
                    onChange={(e) => updatePrep('company', 'links', e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.companyChecklist}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.company.researchChecklist}
                    onChange={(e) => updatePrep('company', 'researchChecklist', e.target.value)}
                    rows={5}
                  />
                </label>
              </div>

              <div className="prep-card">
                <div className="prep-card-header">
                  <h3>{content.prepRole}</h3>
                  <button
                    className="secondary-btn"
                    onClick={applyRoleQuickStart}
                    disabled={isRoleAutofillLoading}
                    type="button"
                  >
                    {isRoleAutofillLoading ? content.loading : content.roleQuickStart}
                  </button>
                </div>
                <label className="form-field">
                  <span className="form-label">{content.roleSummary}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.role.summary}
                    onChange={(e) => updatePrep('role', 'summary', e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.roleRequirements}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.role.requirements}
                    onChange={(e) => updatePrep('role', 'requirements', e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.roleFit}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.role.fit}
                    onChange={(e) => updatePrep('role', 'fit', e.target.value)}
                    rows={4}
                  />
                </label>
              </div>

              <div className="prep-card prep-wide">
                <div className="prep-wide-header">
                  <h3>{content.prepJD}</h3>
                  <button className="secondary-btn" onClick={extractKeywordsIntoPrep} type="button">
                    {content.extractKeywords}
                  </button>
                </div>
                <label className="form-field">
                  <span className="form-label">{content.jdPaste}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.jd.text}
                    onChange={(e) => updatePrep('jd', 'text', e.target.value)}
                    rows={6}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">{content.jdKeywords}</span>
                  <input
                    className="form-input"
                    type="text"
                    value={prepDraft.jd.keywords.join(', ')}
                    onChange={(e) => updatePrepKeywords(e.target.value)}
                    placeholder="e.g., react, sql, python"
                  />
                </label>
              </div>

              <div className="prep-card prep-wide">
                <div className="prep-wide-header">
                  <h3>{content.prepInterview}</h3>
                  <button className="secondary-btn" onClick={applyInterviewQuickStart} type="button">
                    {content.interviewQuickStart}
                  </button>
                </div>
                <div className="prep-two-col">
                  <label className="form-field">
                    <span className="form-label">{content.interviewQuestions}</span>
                    <textarea
                      className="form-textarea"
                      value={prepDraft.interview.questions}
                      onChange={(e) => updatePrep('interview', 'questions', e.target.value)}
                      rows={6}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">{content.interviewMyAnswers}</span>
                    <textarea
                      className="form-textarea"
                      value={prepDraft.interview.myAnswers}
                      onChange={(e) => updatePrep('interview', 'myAnswers', e.target.value)}
                      rows={6}
                    />
                  </label>
                </div>
                <label className="form-field">
                  <span className="form-label">{content.interviewQuestionsToAsk}</span>
                  <textarea
                    className="form-textarea"
                    value={prepDraft.interview.questionsToAsk}
                    onChange={(e) => updatePrep('interview', 'questionsToAsk', e.target.value)}
                    rows={3}
                  />
                </label>
              </div>

              <div className="prep-card prep-wide">
                <h3>{content.prepRisk}</h3>
                {(() => {
                  const risk = getRiskAssessment(prepApp);
                  return (
                    <div className="risk-panel">
                      <div className="risk-panel-header">
                        <span className={`risk-badge risk-${risk.level.toLowerCase()}`}>{risk.level}</span>
                        <span className="risk-panel-hint">Heuristic signals (not a verdict)</span>
                      </div>
                      <ul className="risk-list">
                        {risk.signals.map(signal => (
                          <li key={signal}>{signal}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={closePrep} type="button">
                {content.cancel}
              </button>
              <button className="add-btn" onClick={savePrep} disabled={isPrepSaving}>
                {isPrepSaving ? content.saving : content.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
