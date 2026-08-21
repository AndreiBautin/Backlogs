import type { CategoryId } from '@/domain/categories/category-registry'
import {
  shiftDateKey,
  toDateKey,
  type DailyProgressEntry,
} from '@/domain/entities/daily-goal'
import type { Item } from '@/domain/entities/item'
import type { Priority } from '@/domain/priority/priority'
import type { Status } from '@/domain/status/status'
import type { ItemId } from '@/domain/value-objects/item-id'

/**
 * The public demo's backlog.
 *
 * Every entry here is **invented for the demo** — a plausible reading and
 * watching list assembled from well-known public works. None of it is the
 * owner's real backlog, none of it is exported from a personal device,
 * and it is checked into the repository in plain sight so anyone can
 * confirm that for themselves.
 *
 * Dates are expressed as *offsets from the moment of seeding* rather than
 * as fixed timestamps. A fixture pinned to absolute dates rots: opened a
 * year later it shows a dead streak, an empty "this month", and nothing
 * recently finished. Offsets mean the demo reads as a live backlog
 * whenever someone happens to open it, while staying fully deterministic
 * for a given `now`.
 */
interface DemoProgress {
  /** How many days before "today" the progress was logged. 0 is today. */
  readonly daysAgo: number
  readonly amount: number
}

interface DemoItemSpec {
  readonly id: string
  readonly title: string
  readonly category: CategoryId
  readonly status: Status
  readonly priority: Priority
  readonly addedDaysAgo: number
  readonly startedDaysAgo?: number
  readonly completedDaysAgo?: number
  readonly updatedDaysAgo?: number
  readonly platform?: string
  readonly estimatedLength?: string
  readonly notes?: string
  readonly tags?: readonly string[]
  readonly favorite?: boolean
  readonly dailyGoal?: { readonly amount: number; readonly unit: string }
  readonly progress?: readonly DemoProgress[]
}

/**
 * Ordered roughly as a real backlog accumulates: things in flight first,
 * then what has been finished, then what is waiting, then the shelved and
 * the abandoned, then a handful of deliberate edge cases.
 */
const DEMO_SPECS: readonly DemoItemSpec[] = [
  // ── In progress, with daily goals: this is what the Goals page is for ──
  {
    id: 'demo-001',
    title: "Baldur's Gate 3",
    category: 'games',
    status: 'currently-using',
    priority: 'high',
    addedDaysAgo: 124,
    startedDaysAgo: 41,
    platform: 'Steam',
    estimatedLength: '100 hours',
    tags: ['rpg', 'co-op'],
    favorite: true,
    notes: 'Act 2 with the same co-op group every Sunday. No rushing this one.',
    dailyGoal: { amount: 1, unit: 'quest' },
    // Nine met days ending today — the demo's healthiest streak.
    progress: Array.from({ length: 9 }, (_unused, index) => ({
      daysAgo: index,
      amount: 1,
    })),
  },
  {
    id: 'demo-002',
    title: 'The Eye of the World',
    category: 'books',
    status: 'currently-using',
    priority: 'medium',
    addedDaysAgo: 203,
    startedDaysAgo: 31,
    platform: 'Kindle',
    estimatedLength: '780 pages',
    tags: ['fantasy', 'long-haul'],
    notes: 'Book one of fourteen. Pacing myself.',
    dailyGoal: { amount: 2, unit: 'chapters' },
    // Today is started but not finished: exercises the partial-progress bar
    // and the grace day that keeps a streak alive until a day is fully missed.
    progress: [
      { daysAgo: 0, amount: 1 },
      ...Array.from({ length: 6 }, (_unused, index) => ({
        daysAgo: index + 1,
        amount: 2,
      })),
    ],
  },
  {
    id: 'demo-003',
    title: 'Severance',
    category: 'tv-shows',
    status: 'currently-using',
    priority: 'high',
    addedDaysAgo: 62,
    startedDaysAgo: 13,
    platform: 'Apple TV+',
    tags: ['sci-fi'],
    dailyGoal: { amount: 1, unit: 'episode' },
    // A gap three days back: current streak and longest streak differ.
    progress: [
      { daysAgo: 0, amount: 1 },
      { daysAgo: 1, amount: 1 },
      { daysAgo: 2, amount: 1 },
      { daysAgo: 4, amount: 1 },
      { daysAgo: 5, amount: 1 },
      { daysAgo: 6, amount: 1 },
      { daysAgo: 7, amount: 1 },
    ],
  },
  {
    id: 'demo-004',
    title: 'Vinland Saga',
    category: 'anime',
    status: 'currently-using',
    priority: 'medium',
    addedDaysAgo: 298,
    startedDaysAgo: 22,
    platform: 'Crunchyroll',
    tags: ['historical'],
    dailyGoal: { amount: 2, unit: 'episodes' },
    // Nothing logged today yet — the streak survives on the grace day.
    progress: Array.from({ length: 4 }, (_unused, index) => ({
      daysAgo: index + 1,
      amount: 2,
    })),
  },
  {
    id: 'demo-005',
    title: 'Chainsaw Man',
    category: 'manga',
    status: 'currently-using',
    priority: 'low',
    addedDaysAgo: 151,
    startedDaysAgo: 6,
    platform: 'Digital',
    dailyGoal: { amount: 3, unit: 'chapters' },
    // Deliberately empty: a goal with no progress at all, streak zero.
  },
  {
    id: 'demo-006',
    title: 'Designing Data-Intensive Applications',
    category: 'books',
    status: 'currently-using',
    priority: 'high',
    addedDaysAgo: 402,
    startedDaysAgo: 93,
    platform: 'Physical',
    estimatedLength: '590 pages',
    tags: ['engineering', 'reference'],
    notes: 'A chapter at a time, with notes. Chapter 5 took two weeks on its own.',
    dailyGoal: { amount: 1, unit: 'chapter' },
    // Sparse and honest: this is what a real long-running goal looks like.
    progress: [
      { daysAgo: 0, amount: 1 },
      { daysAgo: 7, amount: 1 },
      { daysAgo: 8, amount: 1 },
      { daysAgo: 15, amount: 1 },
      { daysAgo: 23, amount: 1 },
    ],
  },
  {
    id: 'demo-007',
    title: 'Hardcore History: Blueprint for Armageddon',
    category: 'podcasts',
    status: 'currently-using',
    priority: 'low',
    addedDaysAgo: 244,
    startedDaysAgo: 58,
    platform: 'Spotify',
    estimatedLength: '23 hours',
    tags: ['history'],
    // In progress with no daily goal: the Goals board must skip it cleanly.
  },

  // ── Finished, spread across the last few months for the stats ──
  {
    id: 'demo-008',
    title: 'Outer Wilds',
    category: 'games',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 512,
    startedDaysAgo: 104,
    completedDaysAgo: 3,
    platform: 'Steam',
    estimatedLength: '25 hours',
    tags: ['mystery', 'exploration'],
    favorite: true,
    notes:
      'The best thing I have played in years. Wish I could forget it and start over.',
  },
  {
    id: 'demo-009',
    title: 'Dune',
    category: 'books',
    status: 'completed',
    priority: 'medium',
    addedDaysAgo: 421,
    startedDaysAgo: 82,
    completedDaysAgo: 9,
    platform: 'Physical',
    tags: ['sci-fi', 'classic'],
  },
  {
    id: 'demo-010',
    title: 'The Bear — Season 3',
    category: 'tv-shows',
    status: 'completed',
    priority: 'medium',
    addedDaysAgo: 198,
    startedDaysAgo: 42,
    completedDaysAgo: 17,
    platform: 'Hulu',
  },
  {
    id: 'demo-011',
    title: 'Everything Everywhere All at Once',
    category: 'movies',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 301,
    startedDaysAgo: 25,
    completedDaysAgo: 25,
    platform: 'Netflix',
    favorite: true,
    tags: ['sci-fi'],
  },
  {
    id: 'demo-012',
    title: 'Frieren: Beyond Journey’s End',
    category: 'anime',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 265,
    startedDaysAgo: 71,
    completedDaysAgo: 34,
    platform: 'Crunchyroll',
    favorite: true,
  },
  {
    id: 'demo-013',
    title: 'Berserk — Deluxe Edition Vol. 1',
    category: 'manga',
    status: 'completed',
    priority: 'medium',
    addedDaysAgo: 355,
    startedDaysAgo: 121,
    completedDaysAgo: 48,
    platform: 'Physical',
  },
  {
    id: 'demo-014',
    title: 'CS50: Introduction to Computer Science',
    category: 'courses',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 602,
    startedDaysAgo: 205,
    completedDaysAgo: 62,
    platform: 'edX',
    estimatedLength: '12 weeks',
    tags: ['engineering'],
  },
  {
    id: 'demo-015',
    title: 'In Rainbows',
    category: 'music',
    status: 'completed',
    priority: 'low',
    addedDaysAgo: 94,
    startedDaysAgo: 76,
    completedDaysAgo: 76,
    platform: 'Spotify',
  },
  {
    id: 'demo-016',
    title: 'Portal 2',
    category: 'games',
    status: 'completed',
    priority: 'medium',
    addedDaysAgo: 703,
    startedDaysAgo: 302,
    completedDaysAgo: 97,
    platform: 'Steam',
    estimatedLength: '9 hours',
    tags: ['puzzle', 'co-op'],
  },
  {
    id: 'demo-017',
    title: 'Arcane — Season 1',
    category: 'tv-shows',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 398,
    startedDaysAgo: 152,
    completedDaysAgo: 131,
    platform: 'Netflix',
    favorite: true,
  },
  {
    id: 'demo-018',
    title: 'The Three-Body Problem',
    category: 'books',
    status: 'completed',
    priority: 'medium',
    addedDaysAgo: 521,
    startedDaysAgo: 211,
    completedDaysAgo: 162,
    platform: 'Kindle',
    tags: ['sci-fi'],
  },

  // ── Waiting: one strong candidate per category drives "Start Next" ──
  {
    id: 'demo-019',
    title: 'Disco Elysium',
    category: 'games',
    status: 'backlog',
    priority: 'high',
    addedDaysAgo: 46,
    platform: 'Steam',
    estimatedLength: '40 hours',
    tags: ['rpg', 'narrative'],
    notes: 'Everyone says to go in blind. Doing that.',
  },
  {
    id: 'demo-020',
    title: 'Hades II',
    category: 'games',
    status: 'backlog',
    priority: 'medium',
    addedDaysAgo: 21,
    platform: 'Steam',
    tags: ['roguelike'],
  },
  {
    id: 'demo-021',
    title: 'Pachinko',
    category: 'books',
    status: 'backlog',
    priority: 'high',
    addedDaysAgo: 89,
    platform: 'Kindle',
    tags: ['historical'],
  },
  {
    id: 'demo-022',
    title: 'Piranesi',
    category: 'books',
    status: 'backlog',
    priority: 'low',
    addedDaysAgo: 13,
    platform: 'Physical',
  },
  {
    id: 'demo-023',
    title: 'Shōgun',
    category: 'tv-shows',
    status: 'backlog',
    priority: 'high',
    addedDaysAgo: 31,
    platform: 'Hulu',
    tags: ['historical'],
  },
  {
    id: 'demo-024',
    title: 'Perfect Days',
    category: 'movies',
    status: 'backlog',
    priority: 'medium',
    addedDaysAgo: 15,
    platform: 'Theater',
  },
  {
    id: 'demo-025',
    title: 'Monster',
    category: 'anime',
    status: 'backlog',
    priority: 'high',
    addedDaysAgo: 56,
    platform: 'Netflix',
    estimatedLength: '74 episodes',
    tags: ['thriller'],
  },
  {
    id: 'demo-026',
    title: 'Blame!',
    category: 'manga',
    status: 'backlog',
    priority: 'someday',
    addedDaysAgo: 648,
    platform: 'Physical',
    tags: ['sci-fi'],
    notes: 'Added on a whim nearly two years ago and never opened. The honest one.',
    // The oldest unfinished item in the set — this is what the Goals page's
    // "oldest unfinished" stat and the average-backlog-age figure land on.
  },
  {
    id: 'demo-027',
    title: 'The Rest Is History',
    category: 'podcasts',
    status: 'backlog',
    priority: 'low',
    addedDaysAgo: 34,
    platform: 'Apple Podcasts',
    tags: ['history'],
  },
  {
    id: 'demo-028',
    title: 'Machine Learning Specialization',
    category: 'courses',
    status: 'backlog',
    priority: 'medium',
    addedDaysAgo: 42,
    platform: 'Coursera',
    estimatedLength: '3 months',
    tags: ['engineering'],
  },
  {
    id: 'demo-029',
    title: 'Kurzgesagt — Immune System series',
    category: 'youtube',
    status: 'backlog',
    priority: 'low',
    addedDaysAgo: 8,
    platform: 'YouTube',
    estimatedLength: '2 hours',
  },
  {
    id: 'demo-030',
    title: 'Hats',
    category: 'music',
    status: 'backlog',
    priority: 'someday',
    addedDaysAgo: 182,
    platform: 'Apple Music',
  },

  // ── Shelved and abandoned: the statuses a backlog app actually needs ──
  {
    id: 'demo-031',
    title: 'Elden Ring',
    category: 'games',
    status: 'paused',
    priority: 'medium',
    addedDaysAgo: 382,
    startedDaysAgo: 203,
    updatedDaysAgo: 71,
    platform: 'PlayStation',
    estimatedLength: '80 hours',
    tags: ['rpg', 'souls'],
    favorite: true,
    notes:
      'Stuck on Malenia. Will come back when I have a free weekend and more patience.',
  },
  {
    id: 'demo-032',
    title: 'Infinite Jest',
    category: 'books',
    status: 'paused',
    priority: 'low',
    addedDaysAgo: 561,
    startedDaysAgo: 404,
    updatedDaysAgo: 151,
    platform: 'Physical',
    notes: 'Two hundred pages in. Not saying never.',
  },
  {
    id: 'demo-033',
    title: 'The Rings of Power',
    category: 'tv-shows',
    status: 'dropped',
    priority: 'low',
    addedDaysAgo: 321,
    startedDaysAgo: 299,
    updatedDaysAgo: 281,
    platform: 'Prime Video',
    notes: 'Two episodes in. Not for me — dropping it rather than letting it sit.',
  },
  {
    id: 'demo-034',
    title: 'Hollow Knight: Silksong',
    category: 'games',
    status: 'wishlist',
    priority: 'high',
    addedDaysAgo: 26,
    platform: 'Switch',
    notes: 'Whenever it lands.',
  },
  {
    id: 'demo-035',
    title: 'NieR:Automata — Original Soundtrack',
    category: 'music',
    status: 'wishlist',
    priority: 'medium',
    addedDaysAgo: 63,
    platform: 'Spotify',
  },

  // ── Deliberate edge cases ──
  {
    // Title and category only: every optional field left unset, so the
    // sparse-item rendering path is exercised by the demo rather than
    // only by a unit test.
    id: 'demo-036',
    title: 'Blindsight',
    category: 'books',
    status: 'backlog',
    priority: 'medium',
    addedDaysAgo: 4,
  },
  {
    id: 'demo-037',
    // A long title with punctuation and an em dash, to prove truncation
    // and wrapping behave in cards, the drawer, and search results.
    title: 'Shin Megami Tensei III: Nocturne HD Remaster — Maniax Chronicle Edition',
    category: 'games',
    status: 'backlog',
    priority: 'someday',
    addedDaysAgo: 212,
    platform: 'Switch',
    tags: ['jrpg', 'backlog-forever'],
  },
  {
    id: 'demo-038',
    // Added and finished on the same day: appears in both "Recently Added"
    // and "Recently Finished", and makes the same-day date arithmetic visible.
    title: 'Look Back',
    category: 'movies',
    status: 'completed',
    priority: 'high',
    addedDaysAgo: 0,
    startedDaysAgo: 0,
    completedDaysAgo: 0,
    platform: 'Theater',
    estimatedLength: '58 minutes',
  },
]

const MS_PER_DAY = 24 * 60 * 60 * 1000

function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * MS_PER_DAY).toISOString()
}

function toProgressEntries(
  now: Date,
  progress: readonly DemoProgress[],
): DailyProgressEntry[] {
  const todayKey = toDateKey(now)
  return progress
    .map((entry) => ({
      date: shiftDateKey(todayKey, -entry.daysAgo),
      amount: entry.amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function toItem(spec: DemoItemSpec, now: Date): Item {
  // `lastUpdated` defaults to the most recent thing that happened to the
  // item — including a progress check-in, which is what the real
  // `logDailyProgress` does. Without that, an item logged this morning
  // would sort below one last touched a month ago, and "Continue" would
  // read as stale on a demo that is anything but.
  const mostRecentProgressDaysAgo = spec.progress?.length
    ? Math.min(...spec.progress.map((entry) => entry.daysAgo))
    : Number.POSITIVE_INFINITY

  const lastUpdatedDaysAgo =
    spec.updatedDaysAgo ??
    Math.min(
      mostRecentProgressDaysAgo,
      spec.completedDaysAgo ?? Number.POSITIVE_INFINITY,
      spec.startedDaysAgo ?? Number.POSITIVE_INFINITY,
      spec.addedDaysAgo,
    )

  return {
    id: spec.id as ItemId,
    title: spec.title,
    category: spec.category,
    status: spec.status,
    priority: spec.priority,
    tags: spec.tags ?? [],
    favorite: spec.favorite ?? false,
    dailyProgress: spec.progress ? toProgressEntries(now, spec.progress) : [],
    dateAdded: isoDaysAgo(now, spec.addedDaysAgo),
    lastUpdated: isoDaysAgo(now, lastUpdatedDaysAgo),
    ...(spec.platform !== undefined && { platform: spec.platform }),
    ...(spec.estimatedLength !== undefined && { estimatedLength: spec.estimatedLength }),
    ...(spec.notes !== undefined && { notes: spec.notes }),
    ...(spec.startedDaysAgo !== undefined && {
      dateStarted: isoDaysAgo(now, spec.startedDaysAgo),
    }),
    ...(spec.completedDaysAgo !== undefined && {
      dateCompleted: isoDaysAgo(now, spec.completedDaysAgo),
    }),
    ...(spec.dailyGoal !== undefined && { dailyGoal: spec.dailyGoal }),
  }
}

/** How many items the demo backlog contains. Asserted in tests so the fixture cannot silently shrink. */
export const DEMO_ITEM_COUNT = DEMO_SPECS.length

/**
 * Builds the demo backlog as of `now`. Pure and deterministic: the same
 * `now` always produces byte-identical items, which is what makes the
 * seed reproducible and its tests stable.
 */
export function createDemoItems(now: Date): Item[] {
  return DEMO_SPECS.map((spec) => toItem(spec, now))
}
