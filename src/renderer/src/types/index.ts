// Shared types for Organizer
export interface OrganizationRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditions: RuleCondition[]
  destination: string // relative path from watched folder, or absolute
  conditionLogic: 'AND' | 'OR'
  createdAt: string
  updatedAt: string
}

export interface RuleCondition {
  type: 'extension' | 'typeGroup' | 'namePattern' | 'sizeGreaterThan' | 'sizeLessThan' | 'dateCreated'
  value: string // e.g. ".pdf", "images", "invoice_*", "104857600" (bytes), "2026-01"
}

export type FileTypeGroup = 'images' | 'videos' | 'audio' | 'documents' | 'archives' | 'code' | 'executables' | 'fonts' | 'other'

export const FILE_TYPE_GROUPS: Record<FileTypeGroup, string[]> = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef'],
  videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.aiff'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.csv', '.md', '.epub'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.dmg', '.pkg'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash'],
  executables: ['.exe', '.msi', '.app', '.deb', '.rpm', '.appimage', '.bat', '.cmd'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
  other: []
}

export interface WatchedFolder {
  id: string
  path: string
  enabled: boolean
  ruleIds: string[] // specific rules for this folder, empty = use all rules
  addedAt: string
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  type: 'moved' | 'renamed' | 'error' | 'skipped'
  sourcePath: string
  destinationPath: string
  fileName: string
  ruleId: string
  ruleName: string
  undone: boolean
}

export interface AppSettings {
  launchAtStartup: boolean
  showNotifications: boolean
  minimizeToTray: boolean
  theme: 'dark' | 'light'
  conflictResolution: 'rename' | 'overwrite' | 'skip' | 'ask'
  stabilityDelay: number // seconds to wait before organizing
  maxLogEntries: number
  exclusionPatterns: string[]
  createSubfolders: boolean
  organizeDateFormat: 'YYYY/MM' | 'YYYY/MM/DD' | 'YYYY-MM' | 'YYYY'
}

export interface AppState {
  rules: OrganizationRule[]
  watchedFolders: WatchedFolder[]
  activityLog: ActivityLogEntry[]
  settings: AppSettings
  stats: AppStats
}

export interface AppStats {
  filesOrganizedToday: number
  filesOrganizedTotal: number
  lastResetDate: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  launchAtStartup: false,
  showNotifications: true,
  minimizeToTray: true,
  theme: 'dark',
  conflictResolution: 'rename',
  stabilityDelay: 3,
  maxLogEntries: 1000,
  exclusionPatterns: ['.DS_Store', 'Thumbs.db', 'desktop.ini', '.gitkeep', '*.tmp', '*.crdownload', '*.part'],
  createSubfolders: true,
  organizeDateFormat: 'YYYY/MM'
}

export const DEFAULT_RULES: OrganizationRule[] = [
  {
    id: 'preset-images',
    name: 'Images',
    enabled: true,
    priority: 1,
    conditions: [{ type: 'typeGroup', value: 'images' }],
    destination: 'Images',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-videos',
    name: 'Videos',
    enabled: true,
    priority: 2,
    conditions: [{ type: 'typeGroup', value: 'videos' }],
    destination: 'Videos',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-audio',
    name: 'Music',
    enabled: true,
    priority: 3,
    conditions: [{ type: 'typeGroup', value: 'audio' }],
    destination: 'Music',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-documents',
    name: 'Documents',
    enabled: true,
    priority: 4,
    conditions: [{ type: 'typeGroup', value: 'documents' }],
    destination: 'Documents',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-archives',
    name: 'Archives',
    enabled: true,
    priority: 5,
    conditions: [{ type: 'typeGroup', value: 'archives' }],
    destination: 'Archives',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-code',
    name: 'Code',
    enabled: true,
    priority: 6,
    conditions: [{ type: 'typeGroup', value: 'code' }],
    destination: 'Code',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// IPC Channel names
export const IPC_CHANNELS = {
  // Folders
  GET_WATCHED_FOLDERS: 'get-watched-folders',
  ADD_WATCHED_FOLDER: 'add-watched-folder',
  REMOVE_WATCHED_FOLDER: 'remove-watched-folder',
  TOGGLE_WATCHED_FOLDER: 'toggle-watched-folder',
  SELECT_FOLDER: 'select-folder',

  // Rules
  GET_RULES: 'get-rules',
  ADD_RULE: 'add-rule',
  UPDATE_RULE: 'update-rule',
  DELETE_RULE: 'delete-rule',
  RESET_RULES: 'reset-rules',

  // Activity
  GET_ACTIVITY_LOG: 'get-activity-log',
  CLEAR_ACTIVITY_LOG: 'clear-activity-log',
  UNDO_ACTION: 'undo-action',
  ON_FILE_ORGANIZED: 'on-file-organized',

  // Settings
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',

  // Stats
  GET_STATS: 'get-stats',

  // Control
  PAUSE_WATCHING: 'pause-watching',
  RESUME_WATCHING: 'resume-watching',
  GET_WATCHING_STATUS: 'get-watching-status',

  // Window
  MINIMIZE_TO_TRAY: 'minimize-to-tray',

  // Organize
  ORGANIZE_NOW: 'organize-now',

  // Deduplication
  SCAN_DUPLICATES: 'scan-duplicates',
  MOVE_DUPLICATES: 'move-duplicates'
} as const

export interface DuplicateFile {
  path: string
  name: string
  size: number
  folderPath: string
}

export interface DuplicateGroup {
  hash: string
  size: number
  files: DuplicateFile[]
}
