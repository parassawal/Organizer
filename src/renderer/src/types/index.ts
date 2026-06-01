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
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.tif', '.heic', '.heif', '.raw', '.cr2', '.nef', '.psd', '.ai', '.eps', '.indd', '.sketch', '.fig', '.xcf', '.crw', '.orf', '.sr2', '.dng', '.arw', '.rw2', '.raf', '.jpe', '.jif', '.jfif', '.jfi'],
  videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp', '.ts', '.m2ts', '.vob', '.ogv', '.rm', '.rmvb', '.asf', '.amv', '.mxf', '.mts', '.m2v', '.m4p', '.m4b', '.m4r', '.f4v', '.f4p', '.f4a', '.f4b'],
  audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.aiff', '.alac', '.mid', '.midi', '.m3u', '.m3u8', '.ape', '.au', '.pcm', '.amr', '.cda', '.mid', '.rmi', '.mp2', '.mp1', '.mka', '.ra', '.voc'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.csv', '.md', '.epub', '.pages', '.numbers', '.key', '.tex', '.log', '.msg', '.eml', '.vcf', '.mobi', '.azw3', '.wps', '.wpd', '.oxps', '.xps', '.dot', '.dotx', '.docm', '.dotm', '.xlsm', '.xltx', '.xltm', '.xlsb', '.xlam', '.pptm', '.potx', '.potm', '.ppam', '.ppsx', '.ppsm', '.sldx', '.sldm'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso', '.dmg', '.pkg', '.tgz', '.tbz2', '.txz', '.lz', '.lzma', '.lzo', '.z', '.cab', '.arj', '.lzh', '.ace', '.uue', '.sit', '.sitx', '.hqx', '.sea', '.bin', '.macbin', '.cpt', '.pit', '.dd', '.cpio', '.shar', '.lha', '.zoo', '.ark'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.html', '.css', '.scss', '.json', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bash', '.cxx', '.cc', '.hh', '.hxx', '.m', '.mm', '.pl', '.pm', '.tcl', '.lua', '.dart', '.r', '.rmd', '.fs', '.f', '.for', '.f90', '.f95', '.ada', '.adb', '.ads', '.asm', '.s', '.vue', '.svelte', '.graphql', '.gql', '.ini', '.toml', '.env', '.bat', '.vbs', '.ps1', '.dockerfile', '.makefile', '.mk', '.pom', '.less', '.sass', '.styl', '.pug', '.ejs', '.twig', '.hbs', '.vtt', '.srt', '.sub', '.ass', '.ssa', '.sbv', '.mpsub', '.lrc', '.cap', '.smi', '.sami', '.rt', '.vdf', '.mks'],
  executables: ['.exe', '.msi', '.app', '.deb', '.rpm', '.appimage', '.bat', '.cmd', '.apk', '.ipa', '.jar', '.bin', '.run', '.out', '.com', '.gadget', '.wsf', '.cpl', '.msc', '.scr', '.sys', '.ps1', '.vbs', '.wsf', '.vbe', '.jse', '.wsh', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk', '.inf', '.reg', '.dll', '.ocx', '.ax', '.drv', '.vxd', '.cpl', '.msc', '.msp', '.mst', '.pif'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot', '.fon', '.fnt', '.pfa', '.pfb', '.afm', '.dfont', '.ttc', '.suit', '.bdf', '.pcf', '.snf', '.chr', '.vlw', '.gdr', '.fot'],
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
  },
  {
    id: 'preset-executables',
    name: 'Applications & Installers',
    enabled: true,
    priority: 7,
    conditions: [{ type: 'typeGroup', value: 'executables' }],
    destination: 'Applications',
    conditionLogic: 'OR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'preset-fonts',
    name: 'Fonts',
    enabled: true,
    priority: 8,
    conditions: [{ type: 'typeGroup', value: 'fonts' }],
    destination: 'Fonts',
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
