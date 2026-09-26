export interface SystemService {
  name: string;
  status: 'PASS' | 'WARNING' | 'NOT_INSTALLED';
  version?: string;
  description: string;
  details?: string;
}

export interface CustomRegexRule {
  id: string;
  name: string;
  pattern: string;
  action: 'WARNING' | 'BLOCK';
  reason?: string;
  suggestedAction?: string;
}

export interface CampaignProfile {
  id: string;
  name: string;
  isCustom?: boolean;
  allowedTerms: string[];
  prohibitedTerms: string[];
  requiredTerms: string[];
  prohibitedClaimTypes: string[];
  customRules: string[];
  regexRules?: CustomRegexRule[];
}

export interface ProjectMetadata {
  id: string;
  title: string;
  createdAt: string;
  sourceType: string;
  sourceUrl?: string;
  sourceFilename: string;
  sourcePath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  userPrompt?: string;
  campaignProfileId?: string;
}

export interface ComplianceViolation {
  matchedText: string;
  matchedRule: string;
  severity: 'BLOCK' | 'WARNING';
  reason: string;
  suggestedAction: string;
}

export interface ComplianceResult {
  status: 'PASS' | 'WARNING' | 'BLOCK';
  violations: ComplianceViolation[];
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface CandidateClip {
  id: string;
  title: string;
  summary: string;
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  words: WordTimestamp[];
  completeThought: {
    completeThoughtScore: number;
    boundaryReason: string;
    recommendedStart: number;
    recommendedEnd: number;
    hasDanglingOpening: boolean;
    hasMidSentenceStart: boolean;
    hasAbruptEnding: boolean;
  };
  scores: {
    topicRelevance: number;
    hookStrength: number;
    completeThought: number;
    informationDensity: number;
    audioQuality: number;
    visualInterest: number;
    faceActivity: number;
    handMovement: number;
    bodyMovement: number;
    speakerActivity: number;
    finalScore: number;
  };
  compliance: ComplianceResult;
  suggestedHooks: string[];
  selectedHook?: string;
  reframeMode: 'FACE' | 'FACE_PLUS_HANDS' | 'TWO_SPEAKER' | 'FULL_PERSON' | 'MANUAL';
  captionStyle: 'CLEAN' | 'BOLD' | 'MINIMAL' | 'PODCAST' | 'KARAOKE';
  crop?: { x: number; y: number; width: number; height: number; center_x?: number };
  renderedFilename?: string;
  renderStatus?: 'PENDING' | 'RENDERING' | 'DONE' | 'FAILED';
}

export interface JobProgress {
  id: string;
  projectId: string;
  type: string;
  state: string;
  progressPercent: number;
  currentStep: string;
  error?: string;
  logs: string[];
}
