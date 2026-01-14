# Repo Radar: UX Design Specification

## Overview

Repo Radar is a repository discovery and monitoring application that helps developers track GitHub repositories they care about. This document captures the agreed-upon UX decisions for the application's navigation, interaction patterns, and core features.

---

## Core Concepts

### Mental Model

The application supports three distinct user activities:

1. **Browsing starred repos** — Viewing repositories the user has already starred on GitHub
2. **Exploring new repos** — Discovering repositories across GitHub
3. **Monitoring repos on radar** — Actively tracking metrics and activity for select repositories

The key distinction is between passive bookmarking (stars) and active observation (radar). A star means "I want to remember this exists." Adding to radar means "I want to actively monitor what's happening here."

### Radars

A radar is a user-created collection for organizing tracked repositories. Users can create multiple radars to group repos by purpose (e.g., "Open Source Projects," "Work Tools," "Learning Resources").

**Limits:**
- Maximum 5 radars per user
- Maximum 25 repos per radar
- Maximum 50 repos total across all radars

A repository can belong to multiple radars simultaneously.

---

## Navigation Structure

### Header

A slim header bar remains above the sidebar/main content area on all screen sizes. The header contains:

- App logo/name (left)
- Help button (right)
- User avatar (right)
- Sign out button (right)

The header does not contain primary navigation—that lives in the sidebar.

### Sidebar (Desktop)

The primary navigation is a left sidebar containing:

```
┌──────────────────┐
│                  │
│  ☆ My Stars      │
│  🔭 Explore      │
│                  │
│  ─────────────   │
│  MY RADARS (3/5) │
│                  │
│  ◎ Open Source   │
│  ◎ Education     │
│  ◎ Work Tools    │
│                  │
│  + New Radar     │
│                  │
└──────────────────┘
```

**Sections:**
1. **Fixed navigation items:** My Stars, Explore
2. **User-created radars:** List with count indicator showing usage against limit
3. **Actions:** "+ New Radar" button

### Responsive Behavior

| Breakpoint | Sidebar Behavior |
|------------|------------------|
| Desktop (≥1024px) | Always visible, collapsible via toggle |
| Tablet (768–1023px) | Collapsed by default, hamburger opens as overlay |
| Mobile (<768px) | Hidden, hamburger opens full-height drawer overlay |

### Mobile Header

```
┌─────────────────────────────┐
│ ☰   My Stars           👤   │
└─────────────────────────────┘
```

- ☰ Hamburger icon opens navigation drawer
- Title shows current view (My Stars, Explore, or radar name)
- 👤 User avatar (tapping opens sign out menu)

### Mobile Navigation Drawer

On mobile, tapping the hamburger icon slides in a full-height drawer from the left. The drawer contains the same content as the desktop sidebar. Closing the drawer: tap outside, swipe left, or tap a navigation item (which navigates and closes).

---

## URL Structure

### Repository Detail Pages

Repository URLs use the GitHub numeric ID as the stable identifier:

```
/repo/{github-repo-id}
```

Example: `/repo/515187740`

**Rationale:** GitHub allows users to rename repositories and transfer ownership. The `owner/repo-name` combination can change, but the numeric `id` field from GitHub's API remains stable. Using the ID as the sole identifier ensures links never break.

**Implementation notes:**
- Store the GitHub numeric `id` in the database as the foreign key for all repo references
- The detail page fetches current repo metadata (including current owner/name) from the API

### Routes

```
/               — Home (login page for unauthenticated users)
/stars          — My Stars view (default after login)
/explore        — Explore view
/radar/{id}     — Individual radar view (using internal radar ID)
/repo/{id}      — Repository detail page (using GitHub numeric ID)
```

**Authentication flow:**
- Unauthenticated users see the home/login page at `/`
- After login, users are redirected to `/stars`
- The `/stars` view is sorted by "recently starred" by default

---

## Repository Cards

### Card Design

All repository cards share the same visual design across My Stars, Explore, and Radar views. Consistency in card appearance reduces cognitive load.

```
┌─────────────────────────────────────────┐
│  owner/repo-name               ◎    ★   │
│  Repository description text here       │
│                                         │
│  ⭐ 1.2k (+2.5% this month)             │
│  📂 Open issues: 42                     │
│  🍴 234   TypeScript                    │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │react│ │hooks│ │ui   │               │
│  └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────┘
```

**Elements (additive to current design):**
- Repository full name (owner/repo-name)
- Radar icon (◎ or ◉) — *new*
- Star icon (☆ or ★)
- Description
- Star count with growth rate percentage
- Open issues count
- Fork count and primary language
- Topics/tags (up to 3, with "+N more" indicator)

### Icon States

**Radar icon:**
| State | Icon | Appearance |
|-------|------|------------|
| Not on any radar | ◎ | Outline only, muted color |
| On 1+ radars | ◉ | Filled, accent color |

**Star icon:**
| State | Icon | Appearance |
|-------|------|------------|
| Not starred | ☆ | Outline only |
| Starred | ★ | Filled, yellow/gold |

### Radar Icon Animation

When a user adds a repo to a radar, the icon animates with a single radar sweep (a line rotating 360° around the concentric circles) before settling into the filled state. This reinforces the "radar" metaphor and provides satisfying feedback. This animation is part of the MVP.

### Card Click Behavior

Clicking anywhere on a card (except the radar or star icons) navigates to the repository detail page within the app. This behavior is consistent across all views.

---

## Shared Page Component

The My Stars, Explore, and Radar views all display repository cards using the same underlying component. Rather than creating separate page components, a single `RepositoryList` component handles all three views with different props:

| View | Data Source | Sort Options | Search Behavior |
|------|-------------|--------------|-----------------|
| My Stars | User's GitHub starred repos | Recently Starred, Recently Updated, Most Stars | Collapsible |
| Explore | GitHub search API | Best Match, Recently Updated, Most Stars, Most Forks, Help Wanted | Always visible |
| Radar | Repos in specific radar | TBD | Collapsible |

This approach reduces code duplication and ensures consistent behavior across views.

---

## Search Behavior

Search behaves differently depending on the current view:

### Explore View
Search is **always visible** as a prominent input field. This is the discovery view where search is core functionality.

### My Stars & Radar Views
Search is **collapsible by default**, displaying only:
- A search icon (🔍)
- A keyboard shortcut hint: `⌘K`

**Collapsed state:**
```
┌──────────────────────────────────────────┐
│  Open Source          12/25 repos   🔍 ⌘K │
└──────────────────────────────────────────┘
```

**Expanded state** (after clicking icon or pressing ⌘K):
```
┌──────────────────────────────────────────┐
│  Open Source          12/25 repos        │
│  ┌────────────────────────────────┐      │
│  │ 🔍 Search repos...           ✕ │      │
│  └────────────────────────────────┘      │
└──────────────────────────────────────────┘
```

Press `Escape` or click ✕ to collapse back.

**Rationale:**
| View | Search Behavior | Rationale |
|------|-----------------|-----------|
| Explore | Always visible | Discovery view—search is core functionality, users expect it prominently |
| My Stars | Collapsible | Useful for power users with many stars, but not essential for everyone |
| Radar pages | Collapsible | Max 25 repos, most users can scan visually, but nice to have for quick filtering |

---

## Adding Repos to Radars

### Desktop: Dropdown

Clicking the radar icon (◎/◉) on a card opens a dropdown menu positioned near the icon.

```
┌─────────────────────────┐
│ Add to Radar            │
│ ───────────────────────│
│ ☐ Open Source           │
│ ☑ Education             │
│ ☐ Work Tools            │
│                         │
│ ┌─────────────────────┐ │
│ │ + Create new radar  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Dropdown contents:**
- Header: "Add to Radar"
- Checkboxes for each existing radar (checked if repo is already on that radar)
- "+ Create new radar" button/input at the bottom

**Creating a new radar inline:**

When the user clicks "+ Create new radar," the button transforms into a text input field:

```
┌─────────────────────────┐
│ Add to Radar            │
│ ─────────────────────── │
│ ☐ Open Source           │
│ ☑ Education             │
│ ☐ Work Tools            │
│                         │
│ ┌─────────────────────┐ │
│ │ New radar name...   │ │
│ └─────────────────────┘ │
│         [Cancel] [Create]│
└─────────────────────────┘
```

On submit, the new radar is created and automatically checked (the current repo is added to it). The new radar also appears in the sidebar.

### Mobile: Bottom Sheet

On mobile, tapping the radar icon opens a bottom sheet that slides up from the bottom of the screen.

```
┌─────────────────────────────┐
│                             │
│     [Main content           │
│      dimmed]                │
│                             │
├─────────────────────────────┤
│  Add to Radar               │
│  ─────────────────────────  │
│  ☐ Open Source              │
│  ☑ Education                │
│  ☐ Work Tools               │
│                             │
│  + Create New Radar         │
│                             │
│         [Done]              │
└─────────────────────────────┘
```

The bottom sheet follows the same interaction patterns as the desktop dropdown, including inline radar creation.

### Limit Handling

**When a radar is at its repo limit (25):**
- The checkbox for that radar is disabled
- Tooltip on hover/tap: "This radar has reached its limit (25 repos)"

**When total repos across all radars is at limit (50):**
- All unchecked checkboxes are disabled
- Message displayed: "You've reached your total repo limit (50). Remove repos from other radars to add more."

**When user has 5 radars:**
- "+ Create new radar" button is disabled
- Tooltip: "You've reached your radar limit (5). Delete a radar to create a new one."

---

## Radar Management

### Radar Context Menu

A three-dot menu (⋮) provides "Rename" and "Delete" actions for each radar. The menu is accessible in two locations:

#### 1. Sidebar (next to radar name)

The ⋮ icon appears next to each radar name in the sidebar when the radar item has focus. "Focus" means:

- **Keyboard:** User has tabbed to the radar item
- **Mouse:** User is hovering over the radar item
- **Mobile:** Long-press on the radar item reveals the ⋮ menu

The icon is not visible by default on desktop when the item is not focused—this keeps the sidebar clean. But it must be keyboard-accessible, so tabbing to a radar item reveals the menu trigger.

#### 2. Radar page header

When viewing a radar, the page header displays the radar name and a ⋮ menu. This menu is **always visible** (not hidden behind hover/focus) since it's the primary location for managing the radar you're currently viewing.

```
┌────────────────────────────────────────────┐
│  Open Source          12/25 repos       ⋮  │
└────────────────────────────────────────────┘
```

This applies to both desktop and mobile.

#### Menu contents

Both menus offer the same options:

- **Rename** — allows inline editing of the radar name
- **Delete** — opens a confirmation dialog before deleting

#### Delete confirmation dialog

```
┌─────────────────────────────────────────┐
│  Delete "Open Source"?                  │
│                                         │
│  This will remove the radar and stop    │
│  tracking metrics for its repos.        │
│                                         │
│  Your repos are not affected—they will  │
│  remain on any other radars and their   │
│  starred status won't change.           │
│                                         │
│              [Cancel]  [Delete]         │
└─────────────────────────────────────────┘
```

#### Accessibility requirements

- Menu trigger must be focusable via keyboard (Tab)
- Menu must be operable via keyboard (Enter to open, arrow keys to navigate, Enter to select, Escape to close)
- Focus states must be visually distinct

### Editing Radar Name

Clicking the radar name in the header (or selecting "Rename" from the context menu) makes it editable inline. Press Enter or click away to save. Press Escape to cancel.

---

## Repository Detail Page

### Access

Every repository has a detail page, accessible by clicking a repo card from any view (My Stars, Explore, or any Radar).

### Content

**For all repos:**
- Full repository information (name, description, owner, language, license)
- Link to GitHub (external)
- Star/unstar action
- Add to radar action
- Basic stats (stars, forks, watchers, open issues count)

**For repos on at least one radar (additional content):**
- Metrics dashboard with tracked data:
  - Issue with the most comments
  - Oldest open issue
  - Newest issue
  - Last commit date/info
  - Count of "help wanted" labeled issues
  - Activity trends over time
- List of which radars this repo belongs to

**For repos not on any radar:**
- Prompt to add to radar: "Add this repo to a radar to track detailed metrics"
- If user is at their limit, the "Add to Radar" button is disabled with tooltip explaining why

---

## Radar Views

### Radar Page

When a user clicks a radar in the sidebar, the main content area shows that radar's contents.

**Header:**
- Radar name (editable inline — click to edit)
- Repo count: "12/25 repos"
- Context menu (⋮) with Rename and Delete options

**Content:**
- Grid/list of repo cards for all repos in this radar
- Empty state if no repos (see Empty States section)

---

## Empty States

### No Radars Yet

*Displayed when the user has not created any radars.*

**Sidebar:**
```
MY RADARS (0/5)

Create your first radar to start
tracking repo metrics.

[+ Create Radar]
```

### Empty Radar

*Displayed when viewing a radar that has no repos.*

```
┌─────────────────────────────────────────┐
│                                         │
│     ◎                                   │
│                                         │
│  No repos on this radar yet             │
│                                         │
│  Add repos from My Stars or Explore     │
│  to start tracking their metrics.       │
│                                         │
│  [Go to My Stars]    [Explore Repos]    │
│                                         │
└─────────────────────────────────────────┘
```

### No Starred Repos

*Displayed in My Stars when the user has no GitHub stars.*

```
┌─────────────────────────────────────────┐
│                                         │
│     ☆                                   │
│                                         │
│  No starred repos yet                   │
│                                         │
│  Star repos on GitHub, and they'll      │
│  appear here for easy access.           │
│                                         │
│  [Explore Repos]                        │
│                                         │
└─────────────────────────────────────────┘
```

### No Search Results

*Displayed when a search or filter returns no results.*

```
┌─────────────────────────────────────────┐
│                                         │
│     🔍                                  │
│                                         │
│  No repos found                         │
│                                         │
│  Try adjusting your search or filters.  │
│                                         │
│  [Clear Filters]                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Creating a New Radar

### From Sidebar

Clicking "+ New Radar" in the sidebar opens a simple modal/dialog:

```
┌─────────────────────────────────────────┐
│  Create New Radar                       │
│  ─────────────────────────────────────  │
│                                         │
│  Name                                   │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Cancel]  [Create]         │
└─────────────────────────────────────────┘
```

On creation, the user is navigated to the new (empty) radar view.

### From Add-to-Radar Dropdown/Sheet

As described above, users can also create a radar inline while adding a repo. This flow keeps the user in context and immediately adds the current repo to the new radar.

---

## Future Considerations

The following items are out of scope for this document but may be addressed in future iterations:

- Settings page and account management
- Specific metrics to display and how they're calculated
- API integration and data fetching strategy
- Sharing radars (public links, team collaboration)
- Radar templates
- Alerts and notifications per radar
- Aggregate views across radars
- Premium tiers with higher limits

---

## Summary of Key Decisions

| Decision | Choice |
|----------|--------|
| Header | Slim bar with user info, help, sign out (above sidebar) |
| Primary navigation | Sidebar (collapsible) |
| Mobile navigation | Hamburger drawer + bottom sheet for actions |
| Repo identifier | GitHub numeric ID (stable across renames) |
| URL structure | `/repo/{id}` (ID only, no owner/name) |
| Default route after login | `/stars` (sorted by recently starred) |
| Card click behavior | Navigates to internal detail page (consistent) |
| Card elements | Additive—keeps topics, growth rate, open issues |
| Radar icon states | Outline (◎) vs filled (◉) |
| Radar icon animation | Radar sweep on add (MVP) |
| Add-to-radar interaction | Dropdown (desktop) / Bottom sheet (mobile) |
| New radar creation | Inline within dropdown/sheet, or via sidebar |
| Radar management | Context menu (⋮) with Rename/Delete |
| Limits | 5 radars, 25 repos/radar, 50 total repos |
| Radar membership | Repos can belong to multiple radars |
| Search (Explore) | Always visible |
| Search (My Stars, Radars) | Collapsible with ⌘K shortcut |
| Shared component | RepositoryList used for all views with different props |
| Detail page | Canonical regardless of entry point; metrics shown only for repos on radar |
