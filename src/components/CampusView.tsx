import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol } from 'chess.js';
import {
  Award,
  Brain,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Crown,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Link2,
  MapPin,
  Printer,
  RotateCcw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { getMoradabadDirectory } from '../data/moradabadDirectory';
import { BOARD_THEMES } from '../data/rivals';
import {
  BoardThemeId,
  MoradabadDivision,
  MoradabadLeaguesState,
} from '../types/chess';
import { soundEngine } from '../utils/sound';
import { ChessBoard } from './ChessBoard';

interface CampusPuzzle {
  id: string;
  title: string;
  level: 'Easy' | 'Hard' | 'Hardcore' | 'Expert';
  fen: string;
  winningSan: string;
  skillFocus: string;
  hint: string;
  explanation: string;
}

const CAMPUS_PUZZLES: CampusPuzzle[] = [
  {
    id: 'back-rank',
    title: 'Back-Rank Checkmate',
    level: 'Easy',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    winningSan: 'Ra8#',
    skillFocus: 'Pattern Recognition',
    hint: 'The Black king has no escape square behind its f7, g7, h7 pawns.',
    explanation: 'Ra8# delivers an instant back-rank checkmate!',
  },
  {
    id: 'scholars-mate',
    title: 'Bishop & Queen Battery',
    level: 'Easy',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    winningSan: 'Qxf7#',
    skillFocus: 'Target Weak Squares',
    hint: 'f7 is only defended by the Black king, and your Bishop on c4 backs up your Queen.',
    explanation: 'Qxf7# — the classic 4-move tactical strike against the vulnerable f7 square.',
  },
  {
    id: 'royal-queen-win',
    title: 'Central Queen Capture',
    level: 'Hard',
    fen: 'r3k2r/ppp2ppp/2n5/3q4/3P4/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 9',
    winningSan: 'Nxd5',
    skillFocus: 'Tactical Awareness',
    hint: 'Look closely at the center — Black left a major piece undefended on d5!',
    explanation: 'Nxd5 wins the Black Queen cleanly and puts your Knight on a dominant central outpost.',
  },
  {
    id: 'smothered-mate',
    title: 'Smothered Knight Checkmate',
    level: 'Hardcore',
    fen: '6rk/6pp/7P/6N1/8/8/8/6K1 w - - 0 1',
    winningSan: 'Nf7#',
    skillFocus: 'Knight Geometry',
    hint: 'Black’s own Rook on g8 and pawns block every exit around h8. Use your Knight!',
    explanation: 'Nf7# is a classic Smothered Mate — the King is trapped by its own pieces!',
  },
  {
    id: 'arabian-mate',
    title: 'Arabian Rook & Knight Mate',
    level: 'Hardcore',
    fen: '7k/R7/5N2/8/8/8/6PP/6K1 w - - 0 1',
    winningSan: 'Rh7#',
    skillFocus: 'Piece Coordination',
    hint: 'Your Knight on f6 covers g8 and h7. Bring the Rook to the 7th rank corner!',
    explanation: 'Rh7# — the Knight protects the Rook and cuts off g8 for an unbeatable Arabian Mate.',
  },
  {
    id: 'damiano-mate',
    title: 'Damiano Pawn-Supported Mate',
    level: 'Expert',
    fen: '5rk1/6pp/6P1/8/8/8/7Q/6K1 w - - 0 1',
    winningSan: 'Qxh7#',
    skillFocus: 'Calculation & Sacrifice',
    hint: 'Your advanced g6 pawn protects h7. Strike directly next to the King!',
    explanation: 'Qxh7# — the pawn on g6 guards the Queen on h7 while the Rook on f8 blocks escape.',
  },
];

const CAMPUS_STORAGE_KEY = 'grandmaster_arena_moradabad_v2';

interface CampusLocalPrefs {
  brainScore: number;
  streak: number;
  solvedIds: string[];
  schoolName: string;
  collegeName: string;
  companyName: string;
  coordinatorName: string;
}

function loadCampusPrefs(): CampusLocalPrefs {
  try {
    const raw = localStorage.getItem(CAMPUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CampusLocalPrefs>;
      return {
        brainScore: typeof parsed.brainScore === 'number' ? parsed.brainScore : 100,
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [],
        schoolName: parsed.schoolName || '',
        collegeName: parsed.collegeName || '',
        companyName: parsed.companyName || '',
        coordinatorName: parsed.coordinatorName || '',
      };
    }
  } catch {
    // ignore
  }
  return {
    brainScore: 100,
    streak: 0,
    solvedIds: [],
    schoolName: '',
    collegeName: '',
    companyName: '',
    coordinatorName: '',
  };
}

const DIVISION_COPY: Record<
  MoradabadDivision,
  {
    noun: string;
    nounPlural: string;
    participantLabel: string;
    participantPlural: string;
    coordinatorLabel: string;
    passPrefix: string;
    placeholderInst: string;
    defaultRef: string;
  }
> = {
  school: {
    noun: 'School',
    nounPlural: 'Schools',
    participantLabel: 'Student',
    participantPlural: 'Students',
    coordinatorLabel: 'Principal / Sports Teacher',
    passPrefix: 'MBD-SCH-XXXX',
    placeholderInst: 'e.g. Delhi Public School Moradabad',
    defaultRef: 'schooltrust@sbi',
  },
  college: {
    noun: 'College',
    nounPlural: 'Colleges',
    participantLabel: 'Student',
    participantPlural: 'Students',
    coordinatorLabel: 'Dean / Sports Officer',
    passPrefix: 'MBD-COL-XXXX',
    placeholderInst: 'e.g. MIT Moradabad / Hindu College',
    defaultRef: 'collegesports@sbi',
  },
  company: {
    noun: 'Company',
    nounPlural: 'Companies',
    participantLabel: 'Employee / Player',
    participantPlural: 'Employees',
    coordinatorLabel: 'HR / Corporate Lead',
    passPrefix: 'MBD-CMP-XXXX',
    placeholderInst: 'e.g. Lohia Brass Exports Moradabad',
    defaultRef: 'hrdesk@hdfcbank',
  },
};

interface CampusViewProps {
  division: MoradabadDivision;
  boardThemeId: BoardThemeId;
  playerId: string;
  playerName: string;
  playerElo: number;
  leagues: MoradabadLeaguesState;
  moradabadError: string | null;
  initialPassCode?: string;
  onUpdatePlayerName: (name: string) => void;
  onRegisterInstitution: (payload: {
    division: MoradabadDivision;
    institutionName: string;
    coordinatorName: string;
    studentSeats: number;
    paymentMethod: string;
    detail: string;
  }) => Promise<{ ok: boolean; passCode?: string; error?: string }>;
  onJoinMoradabadLeague: (
    division: MoradabadDivision,
    institutionId?: string,
    passCode?: string,
    studentName?: string
  ) => void;
  onFindMoradabadMatch: (division: MoradabadDivision, timeControlId: string) => void;
  onCancelMoradabadWait: (division: MoradabadDivision) => void;
  onChallengeMoradabadPlayer: (
    division: MoradabadDivision,
    targetPlayerId: string,
    timeControlId: string
  ) => void;
  onSettleMoradabadPrizes: (division: MoradabadDivision) => void;
}

export const CampusView: React.FC<CampusViewProps> = ({
  division,
  boardThemeId,
  playerId,
  playerName,
  playerElo,
  leagues,
  moradabadError,
  initialPassCode = '',
  onUpdatePlayerName,
  onRegisterInstitution,
  onJoinMoradabadLeague,
  onFindMoradabadMatch,
  onCancelMoradabadWait,
  onChallengeMoradabadPlayer,
  onSettleMoradabadPrizes,
}) => {
  const [prefs, setPrefs] = useState<CampusLocalPrefs>(() => loadCampusPrefs());
  const copy = DIVISION_COPY[division];
  const activeLeague = leagues[division];
  const directory = useMemo(() => getMoradabadDirectory(division), [division]);
  const [directorySearch, setDirectorySearch] = useState('');

  // Management ₹10,000 registration form
  const [coordinatorInput, setCoordinatorInput] = useState(prefs.coordinatorName);
  const [studentSeats, setStudentSeats] = useState(50);
  const [mgmtMethod, setMgmtMethod] = useState<
    'Institutional Bank' | 'Management UPI' | 'Institution Card'
  >('Institutional Bank');
  const [mgmtDetail, setMgmtDetail] = useState(copy.defaultRef);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  // Free Entry (₹0) & Human-vs-Human Pairing
  const [studentNameInput, setStudentNameInput] = useState(playerName);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [passCodeInput, setPassCodeInput] = useState<string>(initialPassCode);
  const [leagueTimeControl, setLeagueTimeControl] = useState<string>('10+0');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedCircular, setCopiedCircular] = useState(false);

  // Brain-Booster Tactical Puzzles
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [puzzleFen, setPuzzleFen] = useState(CAMPUS_PUZZLES[0].fen);
  const [puzzleStatus, setPuzzleStatus] = useState<'active' | 'solved' | 'wrong'>('active');
  const [showHint, setShowHint] = useState(false);

  const institutionInput =
    division === 'school'
      ? prefs.schoolName
      : division === 'college'
      ? prefs.collegeName
      : prefs.companyName;

  const boardTheme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[0],
    [boardThemeId]
  );

  useEffect(() => {
    setDirectorySearch('');
    setRegisterError(null);
    setRegisterSuccess(null);
    setMgmtDetail(DIVISION_COPY[division].defaultRef);
  }, [division]);

  useEffect(() => {
    setStudentNameInput(playerName);
  }, [playerName]);

  useEffect(() => {
    if (activeLeague.institutions.length > 0 && !selectedInstitutionId) {
      setSelectedInstitutionId(activeLeague.institutions[0].id);
    } else if (
      selectedInstitutionId &&
      !activeLeague.institutions.some((i) => i.id === selectedInstitutionId)
    ) {
      setSelectedInstitutionId(activeLeague.institutions[0]?.id ?? '');
    }
  }, [activeLeague.institutions, selectedInstitutionId]);

  useEffect(() => {
    try {
      localStorage.setItem(CAMPUS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const filteredDirectory = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [directory, directorySearch]);

  const registeredNamesSet = useMemo(
    () => new Set(activeLeague.institutions.map((i) => i.name.toLowerCase().trim())),
    [activeLeague.institutions]
  );

  const myEnrollment = useMemo(
    () => activeLeague.players.find((p) => p.playerId === playerId) ?? null,
    [activeLeague.players, playerId]
  );

  const otherOnlinePlayers = useMemo(
    () => activeLeague.players.filter((p) => p.playerId !== playerId && p.online),
    [activeLeague.players, playerId]
  );

  const activePuzzle = CAMPUS_PUZZLES[puzzleIdx];

  const loadPuzzle = (index: number) => {
    const nextIdx = (index + CAMPUS_PUZZLES.length) % CAMPUS_PUZZLES.length;
    setPuzzleIdx(nextIdx);
    setPuzzleFen(CAMPUS_PUZZLES[nextIdx].fen);
    setPuzzleStatus('active');
    setShowHint(false);
  };

  const handlePuzzleMove = (from: string, to: string, promotion?: PieceSymbol): boolean => {
    if (puzzleStatus === 'solved') return false;
    const chess = new Chess(activePuzzle.fen);
    let moved;
    try {
      moved = chess.move({ from, to, promotion: promotion ?? 'q' });
    } catch {
      return false;
    }
    if (!moved) return false;

    setPuzzleFen(chess.fen());
    if (moved.san === activePuzzle.winningSan) {
      soundEngine.playCheck();
      setPuzzleStatus('solved');
      const alreadySolved = prefs.solvedIds.includes(activePuzzle.id);
      setPrefs((prev) => ({
        ...prev,
        brainScore: prev.brainScore + (alreadySolved ? 5 : 25),
        streak: prev.streak + 1,
        solvedIds: alreadySolved ? prev.solvedIds : [...prev.solvedIds, activePuzzle.id],
      }));
    } else {
      soundEngine.playMove();
      setPuzzleStatus('wrong');
      setPrefs((prev) => ({ ...prev, streak: 0 }));
    }
    return true;
  };

  const handleSetInstitutionName = (val: string) => {
    setPrefs((prev) => ({
      ...prev,
      schoolName: division === 'school' ? val : prev.schoolName,
      collegeName: division === 'college' ? val : prev.collegeName,
      companyName: division === 'company' ? val : prev.companyName,
    }));
  };

  const handleManagementRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!institutionInput.trim()) {
      setRegisterError(
        `Please enter or select your ${copy.noun} name in Moradabad, Uttar Pradesh.`
      );
      return;
    }
    if (!mgmtDetail.trim()) {
      setRegisterError('Please enter Management Bank / UPI / Card reference.');
      return;
    }

    setRegisterLoading(true);
    const res = await onRegisterInstitution({
      division,
      institutionName: institutionInput.trim(),
      coordinatorName: coordinatorInput.trim() || `${copy.noun} Management`,
      studentSeats,
      paymentMethod: mgmtMethod,
      detail: mgmtDetail.trim(),
    });
    setRegisterLoading(false);

    if (!res.ok) {
      setRegisterError(res.error || 'Failed to register institution.');
      return;
    }

    if (res.passCode) {
      setPassCodeInput(res.passCode);
      setRegisterSuccess(
        `₹10,000 paid by Management! ${copy.participantLabel} Pass ${res.passCode} issued — all ${copy.participantPlural.toLowerCase()} from ${institutionInput.trim()} enter for ₹0.`
      );
    }
  };

  const handleParticipantEnterFree = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = studentNameInput.trim();
    if (cleanedName && cleanedName !== playerName) {
      onUpdatePlayerName(cleanedName);
    }
    onJoinMoradabadLeague(
      division,
      passCodeInput.trim() ? undefined : selectedInstitutionId || undefined,
      passCodeInput.trim() || undefined,
      cleanedName || playerName
    );
  };

  const sharePassCode =
    activeLeague.institutions[0]?.passCode || passCodeInput.trim() || '';

  const participantInviteLink = sharePassCode
    ? `${window.location.origin}${window.location.pathname}?moradabad=${division}&pass=${encodeURIComponent(
        sharePassCode
      )}`
    : `${window.location.origin}${window.location.pathname}?moradabad=${division}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard?.writeText(participantInviteLink).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  const noticeText = [
    `MORADABAD, UTTAR PRADESH — ${activeLeague.title.toUpperCase()}`,
    `Management Fee: ₹10,000 per ${copy.noun} (Paid by Management)`,
    `${copy.participantLabel} Entry Fee: ₹0 (100% FREE)`,
    `Match Format: Real Entered Human-vs-Human Players Only (Zero Computer Bots)`,
    `Winner Prizes (3:2:1 Ratio from ₹${activeLeague.prizePool.toLocaleString(
      'en-IN'
    )} Pool): 1st ₹${activeLeague.prizes.first.toLocaleString(
      'en-IN'
    )} | 2nd ₹${activeLeague.prizes.second.toLocaleString(
      'en-IN'
    )} | 3rd ₹${activeLeague.prizes.third.toLocaleString('en-IN')}`,
    sharePassCode ? `${copy.participantLabel} Pass Code: ${sharePassCode}` : null,
    `Join Link: ${participantInviteLink}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopyNotice = () => {
    navigator.clipboard?.writeText(noticeText).catch(() => {});
    setCopiedCircular(true);
    setTimeout(() => setCopiedCircular(false), 1800);
  };

  const DivisionIcon =
    division === 'school'
      ? School
      : division === 'college'
      ? GraduationCap
      : Briefcase;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Standalone Division Header & Prize Economics */}
      <section className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Moradabad, Uttar Pradesh</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-300">
                ₹10,000 / {copy.noun} (Paid by Management) · ₹0 {copy.participantLabel} Fee
              </span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-bold text-amber-50 tracking-tight flex items-center gap-3"
              style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
            >
              <DivisionIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 shrink-0" aria-hidden="true" />
              <span>{activeLeague.title}</span>
            </h1>
            <p className="text-sm text-amber-100/80 leading-relaxed">
              Dedicated Moradabad (UP) {copy.noun.toLowerCase()} chess competition.{' '}
              <strong className="text-amber-200">₹10,000 per {copy.noun}</strong> is deposited by Management, {copy.participantPlural.toLowerCase()} play completely{' '}
              <strong className="text-emerald-300">Free (₹0)</strong>, and{' '}
              <strong className="text-amber-300">
                1st, 2nd & 3rd {copy.participantLabel} Winners
              </strong>{' '}
              win cash prizes. Matches run strictly{' '}
              <strong className="text-amber-100">Human-vs-Human between entered players</strong> — never Computer bots.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#180a03] border border-amber-400/25 shrink-0 space-y-1 min-w-[220px]">
            <div className="text-xs text-amber-200/75">Directory & Live Status</div>
            <div className="text-sm font-bold text-amber-50">
              {directory.length} Moradabad {copy.nounPlural} Listed
            </div>
            <div className="text-xs font-mono text-emerald-300">
              {activeLeague.institutions.length} Registered · {activeLeague.players.length} Players Joined
            </div>
          </div>
        </div>

        {/* Dynamic Prize Pool (₹10,000 × Registered Institutions) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-amber-400/15">
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/15">
            <div className="text-xs text-amber-200/75">Moradabad {copy.nounPlural} Pool</div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-300">
              ₹{activeLeague.prizePool.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">
              {activeLeague.institutions.length} {copy.noun}(s) × ₹10,000 · Entry ₹0
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/45">
            <div className="text-xs text-amber-300 font-semibold">
              1st Prize ({copy.participantLabel} · 3/6)
            </div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-200">
              ₹{activeLeague.prizes.first.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">50% of league pool</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/25">
            <div className="text-xs text-amber-100/85 font-semibold">
              2nd Prize ({copy.participantLabel} · 2/6)
            </div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-50">
              ₹{activeLeague.prizes.second.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">33.3% of league pool</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/20">
            <div className="text-xs text-amber-100/85 font-semibold">
              3rd Prize ({copy.participantLabel} · 1/6)
            </div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-50">
              ₹{activeLeague.prizes.third.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">16.7% of league pool</div>
          </div>
        </div>
      </section>

      {/* Complete Searchable Moradabad Directory */}
      <section className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Complete Moradabad, Uttar Pradesh Directory</span>
            </div>
            <h2 className="text-lg font-bold text-amber-50 mt-0.5">
              All Moradabad {copy.nounPlural} ({filteredDirectory.length}/{directory.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-amber-300/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              placeholder={`Search Moradabad ${copy.nounPlural.toLowerCase()} or area...`}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 placeholder:text-amber-200/40 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto arena-scroll pr-1">
          {filteredDirectory.map((entry) => {
            const isSelected = institutionInput.trim().toLowerCase() === entry.name.toLowerCase();
            const isRegistered = registeredNamesSet.has(entry.name.toLowerCase().trim());
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => handleSetInstitutionName(entry.name)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-amber-500/25 border-amber-400 text-amber-50'
                    : isRegistered
                    ? 'bg-emerald-950/45 border-emerald-400/45 text-amber-50'
                    : 'bg-[#180a03] border-amber-400/15 text-amber-100 hover:border-amber-400/45'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold leading-snug">{entry.name}</span>
                  {isRegistered && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-[10px] font-semibold shrink-0">
                      ₹10k Paid
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-amber-200/70 flex items-center justify-between gap-2">
                  <span className="truncate">{entry.area}</span>
                  <span className="font-mono text-amber-300/80 shrink-0">{entry.category}</span>
                </div>
              </button>
            );
          })}
          {filteredDirectory.length === 0 && (
            <div className="col-span-full p-4 rounded-xl bg-[#180a03] border border-amber-400/15 text-xs text-amber-200/75 text-center">
              No matching {copy.noun.toLowerCase()} in directory — you can type any custom Moradabad {copy.noun.toLowerCase()} name below.
            </div>
          )}
        </div>
      </section>

      {/* Step 1 (Management ₹10,000) & Step 2 (Free Player Entry + Human-vs-Human) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Management ₹10,000 Registration Desk */}
        <section className="lg:col-span-5 rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Step 1 · Management Entry Fee</span>
              <span aria-hidden="true">·</span>
              <span>₹10,000 Fixed</span>
            </div>
            <h2 className="text-lg font-bold text-amber-50">
              Register Moradabad {copy.noun} (₹10,000)
            </h2>
            <p className="text-xs text-amber-200/75">
              {copy.noun} Management pays ₹10,000 once to fund 1st/2nd/3rd {copy.participantLabel.toLowerCase()} prizes. {copy.participantPlural} then enter for ₹0.
            </p>
          </div>

          <form onSubmit={handleManagementRegister} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-amber-200/80 block">
                {copy.noun} Name (Select Above or Type Custom)
              </label>
              <input
                type="text"
                value={institutionInput}
                onChange={(e) => handleSetInstitutionName(e.target.value)}
                placeholder={copy.placeholderInst}
                className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-amber-200/80 block">
                  {copy.coordinatorLabel}
                </label>
                <input
                  type="text"
                  value={coordinatorInput}
                  onChange={(e) => {
                    setCoordinatorInput(e.target.value);
                    setPrefs((p) => ({ ...p, coordinatorName: e.target.value }));
                  }}
                  placeholder="Coordinator Name"
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-amber-200/80 block">
                  {copy.participantLabel} Quota
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={studentSeats}
                  onChange={(e) => setStudentSeats(Math.max(1, Number(e.target.value) || 50))}
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs font-mono text-amber-50 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-amber-200/80 block">Management Payment Mode</label>
                <select
                  value={mgmtMethod}
                  onChange={(e) =>
                    setMgmtMethod(
                      e.target.value as 'Institutional Bank' | 'Management UPI' | 'Institution Card'
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 focus:outline-none focus:border-amber-400"
                >
                  <option value="Institutional Bank">Institutional Bank / NEFT</option>
                  <option value="Management UPI">Management UPI</option>
                  <option value="Institution Card">Corporate Card</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-amber-200/80 block">Account / UPI Reference</label>
                <input
                  type="text"
                  value={mgmtDetail}
                  onChange={(e) => setMgmtDetail(e.target.value)}
                  placeholder={copy.defaultRef}
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {registerError && (
              <div className="p-2.5 rounded-lg bg-red-950/65 border border-red-400/45 text-xs text-red-100">
                {registerError}
              </div>
            )}
            {registerSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/55 border border-emerald-400/45 text-xs text-emerald-200">
                {registerSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 text-xs sm:text-sm font-bold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {registerLoading
                  ? 'Confirming ₹10,000 Management Deposit...'
                  : `Pay ₹10,000 (${copy.noun} Mgmt) · Unlock ₹0 Entry`}
              </span>
            </button>
          </form>

          {/* Registered Institutions */}
          <div className="pt-3 border-t border-amber-400/15 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-100">
              <span>
                Registered Moradabad {copy.nounPlural} ({activeLeague.institutions.length})
              </span>
              <span className="font-mono text-amber-300">₹10,000 each</span>
            </div>

            {activeLeague.institutions.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#180a03] border border-amber-400/15 text-xs text-amber-200/70">
                No {copy.nounPlural.toLowerCase()} registered yet. Register above (₹10,000) to activate ₹0 {copy.participantLabel.toLowerCase()} entry.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto arena-scroll">
                {activeLeague.institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-2.5 rounded-lg bg-[#180a03] border border-emerald-400/35 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-amber-50 truncate">{inst.name}</div>
                      <div className="text-[11px] text-amber-200/70 font-mono">
                        Pass: <span className="text-emerald-300">{inst.passCode}</span> · Paid ₹
                        {inst.feePaid.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInstitutionId(inst.id);
                        setPassCodeInput(inst.passCode);
                      }}
                      className="px-2.5 py-1 rounded bg-[#2a1306] hover:bg-[#3a1a08] border border-amber-400/25 text-[11px] font-semibold text-amber-300 shrink-0"
                    >
                      Use Pass
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Free Entry & Real Human-vs-Human Pairing */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                  <Swords className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Step 2 · {copy.participantLabel} Entry ₹0 · Human vs Human Only</span>
                </div>
                <h2 className="text-lg font-bold text-amber-50">
                  Play Entered {copy.noun} Players (No Computer)
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-xs font-semibold text-amber-100 whitespace-nowrap shrink-0"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                    <span>Join Link Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                    <span>Share ₹0 Join Link</span>
                  </>
                )}
              </button>
            </div>

            {moradabadError && (
              <div className="p-3 rounded-lg bg-red-950/65 border border-red-400/45 text-xs text-red-100">
                {moradabadError}
              </div>
            )}

            {/* Free Entry Form */}
            <form
              onSubmit={handleParticipantEnterFree}
              className="p-4 rounded-xl bg-[#180a03] border border-amber-400/15 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-amber-200/75 block">
                    {copy.participantLabel} Name
                  </label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 rounded-lg bg-[#241005] border border-amber-400/25 text-xs text-amber-50 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-amber-200/75 block">
                    Registered {copy.noun}
                  </label>
                  <select
                    value={selectedInstitutionId}
                    onChange={(e) => {
                      setSelectedInstitutionId(e.target.value);
                      setPassCodeInput('');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#241005] border border-amber-400/25 text-xs text-amber-50 focus:outline-none focus:border-amber-400"
                  >
                    {activeLeague.institutions.length === 0 ? (
                      <option value="">Register {copy.noun.toLowerCase()} first (left)</option>
                    ) : (
                      activeLeague.institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.passCode})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-amber-200/75 block">
                    Or Pass Code
                  </label>
                  <input
                    type="text"
                    value={passCodeInput}
                    onChange={(e) => setPassCodeInput(e.target.value.toUpperCase())}
                    placeholder={copy.passPrefix}
                    className="w-full px-3 py-2 rounded-lg bg-[#241005] border border-amber-400/25 text-xs font-mono uppercase text-amber-50 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs text-amber-200/75">
                  Player Fee:{' '}
                  <strong className="text-emerald-300 font-mono">₹0 (Free)</strong> · Paid by Management
                </span>
                <button
                  type="submit"
                  disabled={activeLeague.institutions.length === 0 && !passCodeInput.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-45 text-stone-950 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {myEnrollment
                      ? `Update ${copy.participantLabel} Entry (₹0)`
                      : `Enter Moradabad ${copy.noun} League (₹0)`}
                  </span>
                </button>
              </div>
            </form>

            {/* Human Matchmaking Controls */}
            {myEnrollment && (
              <div className="p-4 rounded-xl bg-emerald-950/45 border border-emerald-400/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300">
                    Entered Free (₹0): {myEnrollment.name} · {myEnrollment.institutionName}
                  </div>
                  <div className="text-[11px] text-amber-100/80">
                    {myEnrollment.waitingForMatch
                      ? 'Waiting in live lobby — match starts automatically when another entered player joins!'
                      : `${otherOnlinePlayers.length} other entered human player(s) online right now.`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={leagueTimeControl}
                    onChange={(e) => setLeagueTimeControl(e.target.value)}
                    aria-label="League clock"
                    className="px-2.5 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs font-mono text-amber-50"
                  >
                    <option value="5+0">5+0 Blitz</option>
                    <option value="10+0">10+0 Rapid</option>
                    <option value="15+10">15+10 Rapid</option>
                  </select>

                  {myEnrollment.waitingForMatch ? (
                    <button
                      type="button"
                      onClick={() => onCancelMoradabadWait(division)}
                      className="px-3.5 py-2 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-xs font-semibold text-amber-100 whitespace-nowrap"
                    >
                      Cancel Search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onFindMoradabadMatch(division, leagueTimeControl)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold whitespace-nowrap"
                    >
                      <Swords className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Find Human Opponent</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Enrolled Human Players Roster */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-50">
                  <Users className="w-4 h-4 text-amber-300" aria-hidden="true" />
                  <span>
                    Entered Players & Standings ({activeLeague.players.length})
                  </span>
                </div>
                <span className="text-[11px] text-amber-200/70">
                  Win = 3 pts · Draw = 1 pt · Human vs Human Only
                </span>
              </div>

              {activeLeague.players.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#180a03] border border-amber-400/15 text-center text-xs text-amber-200/75 space-y-1.5">
                  <p className="font-semibold text-amber-100">
                    No players entered yet in Moradabad {copy.noun} League.
                  </p>
                  <p>
                    Register your {copy.noun.toLowerCase()} on the left (₹10,000 Management Fee), enter as a player (₹0), and share the join link with another player/tab!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto arena-scroll rounded-xl border border-amber-400/20 bg-[#180a03]">
                  <table className="w-full text-left border-collapse min-w-[520px]">
                    <thead className="sticky top-0 bg-[#241005] border-b border-amber-400/20 text-[11px] text-amber-200/75">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Rank</th>
                        <th className="py-2.5 px-3 font-medium">{copy.participantLabel}</th>
                        <th className="py-2.5 px-3 font-medium">{copy.noun} (Moradabad)</th>
                        <th className="py-2.5 px-3 font-medium text-right">W-D-L</th>
                        <th className="py-2.5 px-3 font-medium text-right">Pts</th>
                        <th className="py-2.5 px-3 font-medium text-right">Prize</th>
                        <th className="py-2.5 px-3 font-medium text-right">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-400/10 text-xs">
                      {activeLeague.players.map((p, idx) => {
                        const rank = idx + 1;
                        const isMe = p.playerId === playerId;
                        const rankPrize =
                          rank === 1
                            ? activeLeague.prizes.first
                            : rank === 2
                            ? activeLeague.prizes.second
                            : rank === 3
                            ? activeLeague.prizes.third
                            : 0;
                        return (
                          <tr
                            key={p.playerId}
                            className={isMe ? 'bg-amber-500/15 font-semibold' : 'hover:bg-amber-400/[0.04]'}
                          >
                            <td className="py-2.5 px-3 font-mono text-amber-200">#{rank}</td>
                            <td className="py-2.5 px-3 text-amber-50">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    p.online ? 'bg-emerald-400' : 'bg-stone-500'
                                  }`}
                                />
                                <span>
                                  {p.name} {isMe ? '(You)' : ''}
                                </span>
                                {p.waitingForMatch && (
                                  <span className="text-[10px] font-mono text-emerald-300">
                                    · Ready
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-amber-100/80 truncate max-w-[160px]">
                              {p.institutionName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-200/75">
                              {p.wins}-{p.draws}-{p.losses}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-50">
                              {p.points}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-300">
                              {rankPrize > 0 ? `₹${rankPrize.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {isMe ? (
                                <span className="text-[11px] text-amber-200/50">You</span>
                              ) : p.online ? (
                                <button
                                  type="button"
                                  disabled={!myEnrollment}
                                  onClick={() =>
                                    onChallengeMoradabadPlayer(
                                      division,
                                      p.playerId,
                                      leagueTimeControl
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-stone-950 text-[11px] font-bold"
                                >
                                  Play
                                </button>
                              ) : (
                                <span className="text-[11px] text-amber-200/45">Offline</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Top 3 Podium */}
              {activeLeague.players.length > 0 && activeLeague.prizePool > 0 && (
                <div className="p-4 rounded-xl bg-[#180a03] border border-amber-400/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <Trophy className="w-4 h-4" aria-hidden="true" />
                      <span>
                        Top 3 {copy.participantLabel} Winners Podium (Moradabad {copy.noun} League)
                      </span>
                    </div>

                    {!activeLeague.payoutSettled && activeLeague.recentMatches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSettleMoradabadPrizes(division)}
                        className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[11px] font-bold"
                      >
                        Finalize & Award Top 3 Prizes
                      </button>
                    )}
                    {activeLeague.payoutSettled && (
                      <span className="text-[11px] font-semibold text-emerald-300">
                        Top 3 Prizes Finalized
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[0, 1, 2].map((idx) => {
                      const winner = activeLeague.players[idx];
                      const prize =
                        idx === 0
                          ? activeLeague.prizes.first
                          : idx === 1
                          ? activeLeague.prizes.second
                          : activeLeague.prizes.third;
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#241005] border border-amber-400/20 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-amber-300">Rank #{idx + 1}</span>
                            <span className="font-mono font-bold text-emerald-300">
                              ₹{prize.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-amber-50 truncate">
                            {winner ? winner.name : 'Awaiting Player'}
                          </div>
                          <div className="text-[10px] text-amber-200/70 truncate">
                            {winner
                              ? `${winner.institutionName} · ${winner.points} pts`
                              : 'Play matches to claim rank'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Human Matches */}
              {activeLeague.recentMatches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-200">
                    Recent Completed Matches (Human vs Human)
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto arena-scroll">
                    {activeLeague.recentMatches.map((m) => (
                      <div
                        key={m.id}
                        className="px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/15 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="text-amber-100 truncate">
                          <strong>{m.whiteName}</strong> ({m.whiteInstitution}) vs{' '}
                          <strong>{m.blackName}</strong> ({m.blackInstitution})
                        </span>
                        <span className="font-mono text-amber-300 shrink-0">
                          {m.winner === 'draw'
                            ? 'Draw (½-½)'
                            : m.winner === 'w'
                            ? `${m.whiteName} Won`
                            : `${m.blackName} Won`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Brain-Booster Puzzle Trainer + Official Moradabad Promotion Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                <Brain className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Brain-Booster #{puzzleIdx + 1}</span>
                <span aria-hidden="true">·</span>
                <span>{activePuzzle.level}</span>
              </div>
              <h2 className="text-lg font-bold text-amber-50 mt-0.5">{activePuzzle.title}</h2>
            </div>

            <span className="text-xs font-mono text-amber-200 bg-[#180a03] px-2.5 py-1 rounded border border-amber-400/20">
              {activePuzzle.skillFocus}
            </span>
          </div>

          <div className="max-w-[420px] mx-auto">
            <ChessBoard
              fen={puzzleFen}
              orientation="w"
              theme={boardTheme}
              canInteract={puzzleStatus !== 'solved'}
              playerTurnColor="w"
              lastMove={null}
              isReviewing={false}
              onAttemptMove={handlePuzzleMove}
            />
          </div>

          {puzzleStatus === 'solved' ? (
            <div className="p-3.5 rounded-lg bg-emerald-950/55 border border-emerald-400/45 space-y-1">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Correct! +25 Brain Score (Total: {prefs.brainScore})</span>
              </div>
              <p className="text-xs text-amber-50">{activePuzzle.explanation}</p>
            </div>
          ) : puzzleStatus === 'wrong' ? (
            <div className="p-3.5 rounded-lg bg-red-950/65 border border-red-400/45 flex items-center justify-between gap-3">
              <p className="text-xs text-red-100">
                Not the strongest move! Reset and look for a forcing check or capture.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPuzzleFen(activePuzzle.fen);
                  setPuzzleStatus('active');
                }}
                className="px-3 py-1 rounded bg-red-500/25 hover:bg-red-500/35 text-xs font-semibold text-red-100 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-xs text-amber-200/75">
              White to move — click or drag the winning piece on the board.
            </div>
          )}

          {showHint && puzzleStatus !== 'solved' && (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/35 text-xs text-amber-100 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" aria-hidden="true" />
              <span>{activePuzzle.hint}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHint((h) => !h)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-medium text-amber-100"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPuzzleFen(activePuzzle.fen);
                  setPuzzleStatus('active');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-medium text-amber-100"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadPuzzle(puzzleIdx + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-xs font-bold"
            >
              <span>Next Puzzle</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Moradabad Promotion Notice Circular */}
        <section className="lg:col-span-6 rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Award className="w-4 h-4" aria-hidden="true" />
                <span>Moradabad Promotion Kit</span>
              </div>
              <h2 className="text-lg font-bold text-amber-50">
                {copy.noun} Notice Board Circular
              </h2>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-semibold text-amber-300"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print Notice</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#180a03] border border-amber-400/20">
            <pre className="text-xs text-amber-100 whitespace-pre-wrap font-sans leading-relaxed">
              {noticeText}
            </pre>
          </div>

          <button
            type="button"
            onClick={handleCopyNotice}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-xs font-semibold text-amber-50 transition-colors"
          >
            {copiedCircular ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                <span>Moradabad {copy.noun} Notice Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>Copy Notice for {copy.noun} WhatsApp Group</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-amber-200/75">
            <div className="p-3 rounded-lg bg-[#180a03] border border-amber-400/15">
              <div className="text-amber-100 font-semibold">Brain Score</div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-300">
                {prefs.brainScore} ({prefs.solvedIds.length}/{CAMPUS_PUZZLES.length} solved)
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#180a03] border border-amber-400/15">
              <div className="text-amber-100 font-semibold">Your Elo Rating</div>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-300">
                {playerElo} Elo
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
