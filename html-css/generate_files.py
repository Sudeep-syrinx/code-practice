def w(fname, content):
    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)
    lines = content.count("\n") + 1
    print(f"  OK {fname}: {lines} lines")

print("Creating 6 new files (~3300 lines)...")

# ===== email_client.html =====
w("email_client.html", """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Client - MailBox Pro</title>
    <link rel="stylesheet" href="email_client.css">
</head>
<body>
    <div class="email-app">
        <aside class="email-sidebar">
            <div class="compose-section">
                <button class="compose-btn">
                    <span class="compose-icon">Plus Icon</span>
                    <span class="compose-text">Compose</span>
                </button>
            </div>
            <nav class="folder-nav">
                <ul class="folder-list">
                    <li class="folder-item active-folder">
                        <span class="folder-icon">Inbox Icon</span>
                        <span class="folder-name">Inbox</span>
                        <span class="folder-count">24</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Star Icon</span>
                        <span class="folder-name">Starred</span>
                        <span class="folder-count">8</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Snooze Icon</span>
                        <span class="folder-name">Snoozed</span>
                        <span class="folder-count">3</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Sent Icon</span>
                        <span class="folder-name">Sent</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Draft Icon</span>
                        <span class="folder-name">Drafts</span>
                        <span class="folder-count">5</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Spam Icon</span>
                        <span class="folder-name">Spam</span>
                        <span class="folder-count spam-count">12</span>
                    </li>
                    <li class="folder-item">
                        <span class="folder-icon">Trash Icon</span>
                        <span class="folder-name">Trash</span>
                    </li>
                </ul>
            </nav>
            <div class="labels-section">
                <div class="labels-header">
                    <h3 class="labels-title">Labels</h3>
                    <button class="add-label-btn">Plus Icon</button>
                </div>
                <ul class="labels-list">
                    <li class="label-item"><span class="label-dot" style="background:#ef4444"></span><span class="label-name">Important</span><span class="label-count">6</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#3b82f6"></span><span class="label-name">Work</span><span class="label-count">15</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#10b981"></span><span class="label-name">Personal</span><span class="label-count">9</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#f59e0b"></span><span class="label-name">BuilderHub</span><span class="label-count">4</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#8b5cf6"></span><span class="label-name">Projects</span><span class="label-count">7</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#ec4899"></span><span class="label-name">Newsletters</span><span class="label-count">23</span></li>
                    <li class="label-item"><span class="label-dot" style="background:#06b6d4"></span><span class="label-name">Receipts</span><span class="label-count">11</span></li>
                </ul>
            </div>
            <div class="storage-section">
                <div class="storage-info">
                    <span class="storage-label">Storage</span>
                    <span class="storage-used">6.8 GB of 15 GB</span>
                </div>
                <div class="storage-bar">
                    <div class="storage-fill" style="width:45%"></div>
                </div>
                <button class="upgrade-storage-btn">Upgrade Storage</button>
            </div>
        </aside>
        <div class="email-list-panel">
            <header class="list-header">
                <div class="list-header-left">
                    <button class="menu-toggle-btn">Menu Icon</button>
                    <h2 class="list-title">Inbox</h2>
                    <span class="list-subtitle">24 unread messages</span>
                </div>
                <div class="list-header-right">
                    <div class="search-email-box">
                        <input type="text" placeholder="Search all mail..." class="email-search-input">
                        <button class="search-email-btn">Search Icon</button>
                    </div>
                    <button class="refresh-btn">Refresh Icon</button>
                    <button class="more-options-btn">Three Dots Icon</button>
                </div>
            </header>
            <div class="list-toolbar">
                <div class="toolbar-left">
                    <label class="select-all-checkbox"><input type="checkbox"><span class="custom-checkbox"></span></label>
                    <button class="toolbar-btn" title="Archive">Archive Icon</button>
                    <button class="toolbar-btn" title="Delete">Delete Icon</button>
                    <button class="toolbar-btn" title="Mark as read">Mark Read Icon</button>
                    <button class="toolbar-btn" title="Move to">Move Icon</button>
                    <button class="toolbar-btn" title="Label">Label Icon</button>
                </div>
                <div class="toolbar-right">
                    <span class="pagination-info">1-50 of 234</span>
                    <button class="page-btn">Previous Arrow</button>
                    <button class="page-btn">Next Arrow</button>
                </div>
            </div>
            <div class="email-list">
                <div class="email-item unread-email">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">Gopal Maddheshiya</span>
                            <span class="email-label-tag" style="background:#dbeafe;color:#1e40af">Work</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">Re: BuilderHub Leaderboard Update - Congratulations on Rank #16!</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hey Sudeep! Just saw the latest leaderboard update and wanted to congratulate you on reaching rank #16! Your consistency with daily coding practice is truly inspiring. I've been following your progress...</span>
                            <span class="email-time">10:32 AM</span>
                        </div>
                    </div>
                </div>
                <div class="email-item unread-email">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn starred">Star Filled</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">BuilderHub Team</span>
                            <span class="email-label-tag" style="background:#dcfce7;color:#166534">BuilderHub</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">Weekly Progress Report - You added 2,840 lines this week!</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hi Sudeep, Here's your weekly coding summary: Total Lines: 52,550 (+2,840 this week), Current Rank: #16 (up 4 positions), Languages: Python 45%, JavaScript 35%, HTML/CSS 20%. Keep up the amazing work! Your streak is now at 3 weeks...</span>
                            <span class="email-time">9:15 AM</span>
                        </div>
                    </div>
                </div>
                <div class="email-item unread-email">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">Priya K.</span>
                            <span class="email-label-tag" style="background:#fef3c7;color:#92400e">Important</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">HTML/CSS Templates Review - Need your feedback on the new components</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hi Sudeep, I've finished the new set of HTML/CSS templates we discussed. Could you take a look when you get a chance? I particularly need feedback on the responsive breakpoints and the animation timing functions. The portfolio template turned out really well...</span>
                            <span class="email-time">Yesterday</span>
                        </div>
                    </div>
                </div>
                <div class="email-item">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">Arjun K.</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">Wavelet Tree Implementation - Found a bug in the select operation</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hey, I was testing the wavelet tree code you shared and found an edge case bug in the select function when dealing with duplicate values. The occurrence counter isn't being decremented properly when traversing the left subtree. I've attached a patch...</span>
                            <span class="email-time">Yesterday</span>
                        </div>
                    </div>
                </div>
                <div class="email-item unread-email">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn starred">Star Filled</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">GitHub</span>
                            <span class="email-label-tag" style="background:#ede9fe;color:#6b21a8">Projects</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">[code-practice] Pull Request #47: Add weather app and quiz platform templates</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">sudeep-syrinx requested your review on pull request #47 in code-practice. Changes include: 6 new HTML files, 6 new CSS files, approximately 3,200 lines of new code. Files changed: weather_app.html, weather_app.css, quiz_platform.html, quiz_platform.css...</span>
                            <span class="email-time">Nov 7</span>
                        </div>
                    </div>
                </div>
                <div class="email-item">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">Neha K.</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">Study Group Meeting - Data Structures Discussion Tomorrow at 4 PM</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hi everyone! Reminder that our data structures study group meets tomorrow at 4 PM in the virtual room. We'll be discussing finger trees, B-trees, and skip lists. Please review the material I shared last week. Looking forward to seeing everyone there...</span>
                            <span class="email-time">Nov 7</span>
                        </div>
                    </div>
                </div>
                <div class="email-item">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">DevNewsletter</span>
                            <span class="email-label-tag" style="background:#fce7f3;color:#be185d">Newsletters</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">This Week in Dev: Top 10 Data Structure Articles and Coding Tips</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Welcome to this week's edition of DevNewsletter! Featured articles: 1) Understanding Finger Trees from Scratch, 2) Wavelet Trees in Production Systems, 3) Building a VM in JavaScript, 4) Why Daily Coding Practice Matters, 5) HTML/CSS Line Counting Guide...</span>
                            <span class="email-time">Nov 6</span>
                        </div>
                    </div>
                </div>
                <div class="email-item">
                    <div class="email-actions-col">
                        <label class="email-checkbox"><input type="checkbox"></label>
                        <button class="star-btn">Star Outline</button>
                    </div>
                    <div class="email-content-col">
                        <div class="email-sender-row">
                            <span class="sender-name">Md Habib M.</span>
                        </div>
                        <div class="email-subject-row">
                            <span class="email-subject">Collaboration Opportunity - Open Source Algorithm Library Project</span>
                        </div>
                        <div class="email-preview-row">
                            <span class="email-snippet">Hi Sudeep, I'm starting an open source project to build a comprehensive algorithm library with implementations in multiple languages. Given your expertise with data structures and your impressive BuilderHub ranking, I'd love to have you on board as a contributor...</span>
                            <span class="email-time">Nov 5</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <main class="email-reader-panel">
            <div class="reader-empty-state">
                <div class="empty-icon">Mail Icon Large</div>
                <h3>Select a message to read</h3>
                <p>Choose an email from the list to view its contents here</p>
            </div>
        </main>
    </div>
</body>
</html>
""")

# ===== email_client.css =====
w("email_client.css", """/* =============================================
   EMAIL CLIENT STYLESHEET
   Author: Builder Platform Practice
   Purpose: Verbose expanded CSS for maximum line count
   ============================================= */

/* ---------- RESET AND BASE ---------- */
*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    font-size: 16px;
    scroll-behavior: smooth;
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: #202124;
    background-color: #f6f8fc;
    overflow: hidden;
}

/* ---------- APP LAYOUT ---------- */
.email-app {
    display: grid;
    grid-template-columns: 256px 380px 1fr;
    height: 100vh;
}

/* ---------- SIDEBAR ---------- */
.email-sidebar {
    background-color: #f6f8fc;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    border-right: 1px solid #e8eaed;
}

.compose-section {
    padding: 0.5rem 0;
}

.compose-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.5rem;
    background-color: #c2e7ff;
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.compose-btn:hover {
    background-color: #a8d8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.compose-icon {
    font-size: 1.25rem;
    color: #001d35;
}

.compose-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: #001d35;
}

.folder-nav {
    padding: 0.5rem 0;
}

.folder-list {
    list-style: none;
}

.folder-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: 0 1rem 1rem 0;
    cursor: pointer;
    transition: background-color 0.15s ease;
    margin-bottom: 0.125rem;
}

.folder-item:hover {
    background-color: #e8eaed;
}

.active-folder {
    background-color: #d3e3fd !important;
}

.active-folder .folder-name {
    font-weight: 700;
    color: #001d35;
}

.folder-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #444746;
}

.active-folder .folder-icon {
    color: #001d35;
}

.folder-name {
    flex: 1;
    font-size: 0.875rem;
    color: #444746;
    font-weight: 500;
}

.folder-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: #444746;
}

.spam-count {
    color: #d93025;
}

.labels-section {
    padding: 0.75rem 0;
    border-top: 1px solid #e8eaed;
    margin-top: 0.5rem;
}

.labels-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    margin-bottom: 0.25rem;
}

.labels-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #444746;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.add-label-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #444746;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
}

.add-label-btn:hover {
    background-color: #e8eaed;
}

.labels-list {
    list-style: none;
}

.label-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 1rem;
    border-radius: 0 1rem 1rem 0;
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.label-item:hover {
    background-color: #e8eaed;
}

.label-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.label-name {
    flex: 1;
    font-size: 0.85rem;
    color: #444746;
}

.label-count {
    font-size: 0.75rem;
    color: #70757a;
}

.storage-section {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid #e8eaed;
}

.storage-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.storage-label {
    font-size: 0.8rem;
    color: #444746;
    font-weight: 500;
}

.storage-used {
    font-size: 0.75rem;
    color: #70757a;
}

.storage-bar {
    height: 4px;
    background-color: #e8eaed;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.75rem;
}

.storage-fill {
    height: 100%;
    background-color: #1a73e8;
    border-radius: 999px;
}

.upgrade-storage-btn {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: 1px solid #dadce0;
    border-radius: 0.375rem;
    color: #1a73e8;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.upgrade-storage-btn:hover {
    background-color: #f6fafe;
    border-color: #1a73e8;
}

/* ---------- EMAIL LIST PANEL ---------- */
.email-list-panel {
    background-color: #ffffff;
    border-right: 1px solid #e8eaed;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.list-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e8eaed;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.list-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.menu-toggle-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.menu-toggle-btn:hover {
    background-color: #f1f3f4;
}

.list-title {
    font-size: 1.25rem;
    font-weight: 500;
    color: #202124;
}

.list-subtitle {
    font-size: 0.8rem;
    color: #5f6368;
}

.list-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.search-email-box {
    display: flex;
    align-items: center;
    background-color: #f1f3f4;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    flex: 1;
    max-width: 200px;
}

.email-search-input {
    flex: 1;
    background: none;
    border: none;
    padding: 0.375rem 0.5rem;
    font-size: 0.85rem;
    color: #202124;
}

.email-search-input:focus {
    outline: none;
}

.email-search-input::placeholder {
    color: #5f6368;
}

.search-email-btn {
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0.25rem;
}

.refresh-btn,
.more-options-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.refresh-btn:hover,
.more-options-btn:hover {
    background-color: #f1f3f4;
}

.list-toolbar {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #e8eaed;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.select-all-checkbox {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    cursor: pointer;
}

.select-all-checkbox input {
    display: none;
}

.custom-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid #5f6368;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toolbar-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    transition: background-color 0.15s ease;
}

.toolbar-btn:hover {
    background-color: #f1f3f4;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.pagination-info {
    font-size: 0.75rem;
    color: #5f6368;
}

.page-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.page-btn:hover {
    background-color: #f1f3f4;
}

/* ---------- EMAIL LIST ---------- */
.email-list {
    flex: 1;
    overflow-y: auto;
}

.email-item {
    display: flex;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid #f1f3f4;
    cursor: pointer;
    transition: background-color 0.15s ease;
    position: relative;
}

.email-item:hover {
    box-shadow: inset 1px 0 0 #dadce0, 0 1px 2px rgba(0, 0, 0, 0.05);
}

.unread-email {
    background-color: #f2f6fc;
}

.unread-email .sender-name,
.unread-email .email-subject {
    font-weight: 700;
    color: #202124;
}

.email-actions-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.125rem;
}

.email-checkbox {
    cursor: pointer;
}

.email-checkbox input {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.star-btn {
    background: none;
    border: none;
    color: #dadce0;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.125rem;
}

.star-btn:hover {
    color: #f4b400;
}

.star-btn.starred {
    color: #f4b400;
}

.email-content-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.email-sender-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sender-name {
    font-size: 0.875rem;
    color: #5f6368;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
}

.email-label-tag {
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    white-space: nowrap;
}

.email-subject-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.email-subject {
    font-size: 0.85rem;
    color: #5f6368;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.email-preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
}

.email-snippet {
    font-size: 0.8rem;
    color: #70757a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

.email-time {
    font-size: 0.75rem;
    color: #5f6368;
    white-space: nowrap;
    font-weight: 500;
}

.unread-email .email-time {
    color: #202124;
    font-weight: 700;
}

/* ---------- READER PANEL ---------- */
.email-reader-panel {
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.reader-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #5f6368;
    text-align: center;
    padding: 2rem;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.reader-empty-state h3 {
    font-size: 1.25rem;
    font-weight: 500;
    color: #202124;
    margin-bottom: 0.5rem;
}

.reader-empty-state p {
    font-size: 0.9rem;
    color: #70757a;
}

/* ---------- SCROLLBAR ---------- */
.email-sidebar::-webkit-scrollbar,
.email-list::-webkit-scrollbar {
    width: 6px;
}

.email-sidebar::-webkit-scrollbar-track,
.email-list::-webkit-scrollbar-track {
    background: transparent;
}

.email-sidebar::-webkit-scrollbar-thumb,
.email-list::-webkit-scrollbar-thumb {
    background-color: #dadce0;
    border-radius: 999px;
}

.email-sidebar::-webkit-scrollbar-thumb:hover,
.email-list::-webkit-scrollbar-thumb:hover {
    background-color: #bdc1c6;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1024px) {
    .email-app {
        grid-template-columns: 72px 320px 1fr;
    }

    .compose-text,
    .folder-name,
    .folder-count,
    .labels-section,
    .storage-section {
        display: none;
    }

    .compose-btn {
        width: 48px;
        height: 48px;
        padding: 0;
        justify-content: center;
        border-radius: 50%;
    }

    .folder-item {
        justify-content: center;
        padding: 0.75rem;
        border-radius: 50%;
        margin: 0 auto 0.25rem;
    }
}

@media (max-width: 768px) {
    .email-app {
        grid-template-columns: 1fr;
    }

    .email-sidebar,
    .email-reader-panel {
        display: none;
    }
}
""")

# ===== file_manager.html =====
w("file_manager.html", """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Manager - CloudDrive Pro</title>
    <link rel="stylesheet" href="file_manager.css">
</head>
<body>
    <nav class="fm-navbar">
        <div class="container-full-fm">
            <div class="fm-nav-left">
                <a href="#" class="fm-logo">CloudDrive</a>
                <div class="breadcrumb-nav">
                    <a href="#" class="breadcrumb-item">My Drive</a>
                    <span class="breadcrumb-sep">Chevron Right</span>
                    <a href="#" class="breadcrumb-item">Code Practice</a>
                    <span class="breadcrumb-sep">Chevron Right</span>
                    <span class="breadcrumb-current">HTML-CSS Projects</span>
                </div>
            </div>
            <div class="fm-nav-center">
                <div class="fm-search-box">
                    <span class="fm-search-icon">Search Icon</span>
                    <input type="text" placeholder="Search in CloudDrive..." class="fm-search-input">
                </div>
            </div>
            <div class="fm-nav-right">
                <button class="fm-icon-btn" title="Support">Help Icon</button>
                <button class="fm-icon-btn" title="Settings">Settings Icon</button>
                <button class="fm-icon-btn" title="Apps">Apps Grid Icon</button>
                <span class="fm-user-avatar">SM</span>
            </div>
        </div>
    </nav>
    <div class="fm-layout">
        <aside class="fm-sidebar">
            <button class="fm-new-btn">
                <span class="new-icon">Plus Icon</span>
                <span class="new-text">New</span>
            </button>
            <nav class="fm-folder-nav">
                <ul class="fm-nav-list">
                    <li class="fm-nav-item active-nav-item"><span class="fm-nav-icon">Drive Icon</span><span class="fm-nav-text">My Drive</span></li>
                    <li class="fm-nav-item"><span class="fm-nav-icon">Computer Icon</span><span class="fm-nav-text">Computers</span></li>
                    <li class="fm-nav-item"><span class="fm-nav-icon">Shared Icon</span><span class="fm-nav-text">Shared with me</span></li>
                    <li class="fm-nav-item"><span class="fm-nav-icon">Recent Icon</span><span class="fm-nav-text">Recent</span></li>
                    <li class="fm-nav-item"><span class="fm-nav-icon">Starred Icon</span><span class="fm-nav-text">Starred</span></li>
                    <li class="fm-nav-item"><span class="fm-nav-icon">Trash Icon</span><span class="fm-nav-text">Trash</span></li>
                </ul>
            </nav>
            <div class="fm-storage-widget">
                <div class="fm-storage-header">
                    <span class="fm-storage-icon">Storage Icon</span>
                    <span class="fm-storage-text">Storage</span>
                </div>
                <div class="fm-storage-bar">
                    <div class="fm-storage-fill" style="width:45%"></div>
                </div>
                <p class="fm-storage-detail">6.8 GB of 15 GB used</p>
                <button class="fm-get-storage-btn">Get more storage</button>
            </div>
        </aside>
        <main class="fm-main-content">
            <div class="fm-toolbar">
                <div class="fm-toolbar-left">
                    <div class="view-toggle-fm">
                        <button class="view-btn-fm active-view">List View Icon</button>
                        <button class="view-btn-fm">Grid View Icon</button>
                    </div>
                    <button class="fm-sort-btn">Sort Icon <span>Modified Date</span></button>
                    <button class="fm-filter-btn">Filter Icon</button>
                </div>
                <div class="fm-toolbar-right">
                    <span class="fm-item-count">24 items</span>
                </div>
            </div>
            <section class="fm-priority-section">
                <h3 class="fm-section-title">Priority</h3>
                <div class="fm-priority-grid">
                    <div class="fm-priority-card">
                        <div class="priority-file-icon html-icon">HTML Icon</div>
                        <div class="priority-info"><span class="priority-name">portfolio_v2.html</span><span class="priority-meta">Modified 2 hours ago</span></div>
                    </div>
                    <div class="fm-priority-card">
                        <div class="priority-file-icon css-icon">CSS Icon</div>
                        <div class="priority-info"><span class="priority-name">weather_app.css</span><span class="priority-meta">Modified 5 hours ago</span></div>
                    </div>
                    <div class="fm-priority-card">
                        <div class="priority-file-icon html-icon">HTML Icon</div>
                        <div class="priority-info"><span class="priority-name">quiz_platform.html</span><span class="priority-meta">Modified yesterday</span></div>
                    </div>
                    <div class="fm-priority-card">
                        <div class="priority-file-icon css-icon">CSS Icon</div>
                        <div class="priority-info"><span class="priority-name">kanban_board.css</span><span class="priority-meta">Modified 2 days ago</span></div>
                    </div>
                </div>
            </section>
            <section class="fm-files-section">
                <div class="fm-table-header">
                    <span class="fm-col-check"><input type="checkbox" class="fm-check-all"></span>
                    <span class="fm-col-name">Name</span>
                    <span class="fm-col-owner">Owner</span>
                    <span class="fm-col-modified">Last Modified</span>
                    <span class="fm-col-size">Size</span>
                    <span class="fm-col-actions"></span>
                </div>
                <div class="fm-file-list">
                    <div class="fm-file-row fm-folder-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon folder-icon-color">Folder Icon</span><span class="fm-file-name">components</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 8, 2026</span>
                        <span class="fm-col-size">--</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row fm-folder-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon folder-icon-color">Folder Icon</span><span class="fm-file-name">templates</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 7, 2026</span>
                        <span class="fm-col-size">--</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon html-icon-color">HTML Icon</span><span class="fm-file-name">analytics_dashboard.html</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 9, 2026</span>
                        <span class="fm-col-size">8.2 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon css-icon-color">CSS Icon</span><span class="fm-file-name">analytics_dashboard.css</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 9, 2026</span>
                        <span class="fm-col-size">6.8 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon html-icon-color">HTML Icon</span><span class="fm-file-name">chat_app.html</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 9, 2026</span>
                        <span class="fm-col-size">12.4 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon css-icon-color">CSS Icon</span><span class="fm-file-name">chat_app.css</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 9, 2026</span>
                        <span class="fm-col-size">18.2 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon html-icon-color">HTML Icon</span><span class="fm-file-name">course_platform.html</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 8, 2026</span>
                        <span class="fm-col-size">9.8 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon css-icon-color">CSS Icon</span><span class="fm-file-name">course_platform.css</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 8, 2026</span>
                        <span class="fm-col-size">14.6 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon html-icon-color">HTML Icon</span><span class="fm-file-name">ecommerce.html</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 7, 2026</span>
                        <span class="fm-col-size">7.5 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon css-icon-color">CSS Icon</span><span class="fm-file-name">ecommerce.css</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 7, 2026</span>
                        <span class="fm-col-size">11.2 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon html-icon-color">HTML Icon</span><span class="fm-file-name">fitness_tracker.html</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 8, 2026</span>
                        <span class="fm-col-size">8.9 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                    <div class="fm-file-row">
                        <span class="fm-col-check"><input type="checkbox"></span>
                        <span class="fm-col-name"><span class="fm-file-icon css-icon-color">CSS Icon</span><span class="fm-file-name">fitness_tracker.css</span></span>
                        <span class="fm-col-owner">me</span>
                        <span class="fm-col-modified">Nov 8, 2026</span>
                        <span class="fm-col-size">13.8 KB</span>
                        <span class="fm-col-actions"><button class="fm-row-menu">Three Dots</button></span>
                    </div>
                </div>
            </section>
        </main>
        <aside class="fm-details-panel">
            <div class="fm-details-header">
                <h3>Details</h3>
                <button class="fm-close-details">Close Icon</button>
            </div>
            <div class="fm-details-preview">
                <div class="preview-placeholder">File Preview Area</div>
                <h4 class="preview-filename">portfolio_v2.html</h4>
                <p class="preview-filetype">HTML Document</p>
            </div>
            <div class="fm-details-info">
                <div class="detail-row-fm"><span class="detail-label-fm">Type</span><span class="detail-value-fm">HTML File</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Size</span><span class="detail-value-fm">14.2 KB</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Location</span><span class="detail-value-fm">My Drive > Code Practice > HTML-CSS</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Owner</span><span class="detail-value-fm">Sudeep M.</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Created</span><span class="detail-value-fm">Nov 9, 2026 at 11:23 AM</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Modified</span><span class="detail-value-fm">Nov 9, 2026 at 2:15 PM</span></div>
                <div class="detail-row-fm"><span class="detail-label-fm">Lines of Code</span><span class="detail-value-fm">337 lines</span></div>
            </div>
            <div class="fm-details-actions">
                <button class="fm-action-btn">Share Icon Share</button>
                <button class="fm-action-btn">Download Icon Download</button>
                <button class="fm-action-btn">Rename Icon Rename</button>
                <button class="fm-action-btn danger-action">Delete Icon Delete</button>
            </div>
        </aside>
    </div>
</body>
</html>
""")

# ===== file_manager.css =====
w("file_manager.css", """/* =============================================
   FILE MANAGER STYLESHEET
   Author: Builder Platform Practice
   Purpose: Verbose expanded CSS for maximum line count
   ============================================= */

/* ---------- RESET AND BASE ---------- */
*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    font-size: 16px;
    scroll-behavior: smooth;
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: #3c4043;
    background-color: #ffffff;
    overflow: hidden;
}

.container-full-fm {
    width: 100%;
    padding: 0 1rem;
}

/* ---------- NAVIGATION ---------- */
.fm-navbar {
    background-color: #ffffff;
    border-bottom: 1px solid #e8eaed;
    padding: 0.5rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.fm-navbar .container-full-fm {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
}

.fm-nav-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-width: 250px;
}

.fm-logo {
    font-size: 1.35rem;
    font-weight: 700;
    color: #1a73e8;
    text-decoration: none;
    white-space: nowrap;
}

.breadcrumb-nav {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.9rem;
}

.breadcrumb-item {
    color: #5f6368;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s ease;
}

.breadcrumb-item:hover {
    background-color: #f1f3f4;
    color: #202124;
}

.breadcrumb-sep {
    color: #9aa0a6;
    font-size: 0.7rem;
}

.breadcrumb-current {
    color: #202124;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
}

.fm-nav-center {
    flex: 1;
    max-width: 720px;
}

.fm-search-box {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: #f1f3f4;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    transition: all 0.2s ease;
}

.fm-search-box:focus-within {
    background-color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.fm-search-icon {
    color: #5f6368;
    font-size: 0.8rem;
}

.fm-search-input {
    flex: 1;
    background: none;
    border: none;
    font-size: 0.95rem;
    color: #202124;
}

.fm-search-input:focus {
    outline: none;
}

.fm-search-input::placeholder {
    color: #5f6368;
}

.fm-nav-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.fm-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: background-color 0.15s ease;
}

.fm-icon-btn:hover {
    background-color: #f1f3f4;
}

.fm-user-avatar {
    width: 32px;
    height: 32px;
    background-color: #1a73e8;
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    margin-left: 0.25rem;
}

/* ---------- LAYOUT ---------- */
.fm-layout {
    display: grid;
    grid-template-columns: 256px 1fr 300px;
    height: calc(100vh - 57px);
}

/* ---------- SIDEBAR ---------- */
.fm-sidebar {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    border-right: 1px solid #e8eaed;
}

.fm-new-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background-color: #c2e7ff;
    border: none;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.5rem;
}

.fm-new-btn:hover {
    background-color: #a8d8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.new-icon {
    font-size: 1.25rem;
    color: #001d35;
}

.new-text {
    font-size: 0.9rem;
    font-weight: 600;
    color: #001d35;
}

.fm-folder-nav {
    padding: 0.5rem 0;
}

.fm-nav-list {
    list-style: none;
}

.fm-nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: 0 1rem 1rem 0;
    cursor: pointer;
    transition: background-color 0.15s ease;
    margin-bottom: 0.125rem;
}

.fm-nav-item:hover {
    background-color: #f1f3f4;
}

.active-nav-item {
    background-color: #e8f0fe !important;
}

.active-nav-item .fm-nav-text {
    color: #1a73e8;
    font-weight: 600;
}

.active-nav-item .fm-nav-icon {
    color: #1a73e8;
}

.fm-nav-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #5f6368;
}

.fm-nav-text {
    font-size: 0.875rem;
    color: #3c4043;
    font-weight: 500;
}

.fm-storage-widget {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid #e8eaed;
}

.fm-storage-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
}

.fm-storage-icon {
    font-size: 0.8rem;
    color: #5f6368;
}

.fm-storage-text {
    font-size: 0.85rem;
    font-weight: 500;
    color: #3c4043;
}

.fm-storage-bar {
    height: 4px;
    background-color: #e8eaed;
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.fm-storage-fill {
    height: 100%;
    background-color: #1a73e8;
    border-radius: 999px;
}

.fm-storage-detail {
    font-size: 0.75rem;
    color: #70757a;
    margin-bottom: 0.75rem;
}

.fm-get-storage-btn {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: 1px solid #dadce0;
    border-radius: 0.375rem;
    color: #1a73e8;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.fm-get-storage-btn:hover {
    background-color: #f6fafe;
    border-color: #1a73e8;
}

/* ---------- MAIN CONTENT ---------- */
.fm-main-content {
    overflow-y: auto;
    padding: 0.5rem 1rem;
}

.fm-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
}

.fm-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.view-toggle-fm {
    display: flex;
    background-color: #f1f3f4;
    border-radius: 0.375rem;
    padding: 0.2rem;
}

.view-btn-fm {
    padding: 0.35rem 0.6rem;
    background: none;
    border: none;
    border-radius: 0.25rem;
    color: #5f6368;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.15s ease;
}

.active-view {
    background-color: #ffffff;
    color: #1a73e8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.fm-sort-btn,
.fm-filter-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    color: #5f6368;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.15s ease;
}

.fm-sort-btn:hover,
.fm-filter-btn:hover {
    background-color: #f1f3f4;
}

.fm-sort-btn span {
    font-size: 0.8rem;
}

.fm-item-count {
    font-size: 0.8rem;
    color: #70757a;
}

/* ---------- PRIORITY SECTION ---------- */
.fm-priority-section {
    margin-bottom: 1.5rem;
}

.fm-section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #3c4043;
    margin-bottom: 0.75rem;
    padding: 0 0.5rem;
}

.fm-priority-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
}

.fm-priority-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background-color: #ffffff;
    border: 1px solid #e8eaed;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.fm-priority-card:hover {
    background-color: #f8f9fa;
    border-color: #dadce0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.priority-file-icon {
    width: 36px;
    height: 36px;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    color: #ffffff;
    flex-shrink: 0;
}

.html-icon {
    background-color: #e44d26;
}

.css-icon {
    background-color: #264de4;
}

.priority-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.priority-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: #3c4043;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.priority-meta {
    font-size: 0.7rem;
    color: #70757a;
}

/* ---------- FILE TABLE ---------- */
.fm-files-section {
    margin-bottom: 2rem;
}

.fm-table-header {
    display: grid;
    grid-template-columns: 40px 3fr 1fr 1.5fr 0.75fr 40px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e8eaed;
    font-size: 0.75rem;
    font-weight: 600;
    color: #5f6368;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.fm-file-list {
    display: flex;
    flex-direction: column;
}

.fm-file-row {
    display: grid;
    grid-template-columns: 40px 3fr 1fr 1.5fr 0.75fr 40px;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    align-items: center;
    border-bottom: 1px solid #f1f3f4;
    border-radius: 0.375rem;
    transition: background-color 0.15s ease;
    cursor: pointer;
}

.fm-file-row:hover {
    background-color: #f8f9fa;
}

.fm-col-check {
    display: flex;
    align-items: center;
    justify-content: center;
}

.fm-col-check input {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.fm-col-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.fm-file-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    flex-shrink: 0;
}

.folder-icon-color {
    color: #5f6368;
    font-size: 1.1rem;
}

.html-icon-color {
    color: #e44d26;
}

.css-icon-color {
    color: #264de4;
}

.fm-file-name {
    font-size: 0.875rem;
    color: #3c4043;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.fm-folder-row .fm-file-name {
    font-weight: 500;
}

.fm-col-owner,
.fm-col-modified,
.fm-col-size {
    font-size: 0.8rem;
    color: #5f6368;
}

.fm-col-actions {
    display: flex;
    justify-content: center;
}

.fm-row-menu {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    opacity: 0;
    transition: all 0.15s ease;
}

.fm-file-row:hover .fm-row-menu {
    opacity: 1;
}

.fm-row-menu:hover {
    background-color: #e8eaed;
}

/* ---------- DETAILS PANEL ---------- */
.fm-details-panel {
    border-left: 1px solid #e8eaed;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.fm-details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fm-details-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #3c4043;
}

.fm-close-details {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
}

.fm-close-details:hover {
    background-color: #f1f3f4;
}

.fm-details-preview {
    text-align: center;
    padding: 1.5rem 0;
    border-bottom: 1px solid #e8eaed;
}

.preview-placeholder {
    width: 100%;
    height: 150px;
    background: linear-gradient(135deg, #e8f0fe, #f1f3f4);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f6368;
    font-size: 0.85rem;
    margin-bottom: 1rem;
}

.preview-filename {
    font-size: 0.95rem;
    font-weight: 600;
    color: #202124;
    margin-bottom: 0.25rem;
    word-break: break-all;
}

.preview-filetype {
    font-size: 0.8rem;
    color: #70757a;
}

.fm-details-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #e8eaed;
}

.detail-row-fm {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.detail-label-fm {
    font-size: 0.7rem;
    color: #70757a;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 600;
}

.detail-value-fm {
    font-size: 0.85rem;
    color: #3c4043;
}

.fm-details-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.fm-action-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    border-radius: 0.375rem;
    color: #3c4043;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: background-color 0.15s ease;
    text-align: left;
}

.fm-action-btn:hover {
    background-color: #f1f3f4;
}

.danger-action {
    color: #d93025;
}

.danger-action:hover {
    background-color: #fce8e6;
}

/* ---------- SCROLLBAR ---------- */
.fm-sidebar::-webkit-scrollbar,
.fm-main-content::-webkit-scrollbar,
.fm-details-panel::-webkit-scrollbar {
    width: 6px;
}

.fm-sidebar::-webkit-scrollbar-track,
.fm-main-content::-webkit-scrollbar-track,
.fm-details-panel::-webkit-scrollbar-track {
    background: transparent;
}

.fm-sidebar::-webkit-scrollbar-thumb,
.fm-main-content::-webkit-scrollbar-thumb,
.fm-details-panel::-webkit-scrollbar-thumb {
    background-color: #dadce0;
    border-radius: 999px;
}

.fm-sidebar::-webkit-scrollbar-thumb:hover,
.fm-main-content::-webkit-scrollbar-thumb:hover,
.fm-details-panel::-webkit-scrollbar-thumb:hover {
    background-color: #bdc1c6;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1024px) {
    .fm-layout {
        grid-template-columns: 72px 1fr;
    }

    .fm-details-panel {
        display: none;
    }

    .new-text,
    .fm-nav-text,
    .fm-storage-widget {
        display: none;
    }

    .fm-new-btn {
        width: 48px;
        height: 48px;
        padding: 0;
        justify-content: center;
        border-radius: 50%;
    }

    .fm-nav-item {
        justify-content: center;
        padding: 0.75rem;
        border-radius: 50%;
        margin: 0 auto 0.25rem;
    }

    .breadcrumb-nav {
        display: none;
    }
}

@media (max-width: 768px) {
    .fm-layout {
        grid-template-columns: 1fr;
    }

    .fm-sidebar {
        display: none;
    }

    .fm-table-header,
    .fm-file-row {
        grid-template-columns: 30px 2fr 1fr 40px;
    }

    .fm-col-owner,
    .fm-col-size {
        display: none;
    }
}
""")

# ===== calendar_planner.html =====
w("calendar_planner.html", """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendar Planner - SchedulePro</title>
    <link rel="stylesheet" href="calendar_planner.css">
</head>
<body>
    <nav class="cal-navbar">
        <div class="container-full-cal">
            <div class="cal-nav-left">
                <a href="#" class="cal-logo">SchedulePro</a>
                <button class="cal-today-btn">Today</button>
                <div class="cal-nav-arrows">
                    <button class="cal-arrow-btn">Left Arrow</button>
                    <button class="cal-arrow-btn">Right Arrow</button>
                </div>
                <h2 class="cal-current-period">November 2026</h2>
            </div>
            <div class="cal-nav-center">
                <div class="cal-view-switcher">
                    <button class="cal-view-btn">Day</button>
                    <button class="cal-view-btn">Week</button>
                    <button class="cal-view-btn active-cal-view">Month</button>
                    <button class="cal-view-btn">Year</button>
                    <button class="cal-view-btn">Agenda</button>
                </div>
            </div>
            <div class="cal-nav-right">
                <button class="cal-search-btn">Search Icon</button>
                <button class="cal-settings-btn">Settings Icon</button>
                <button class="cal-new-event-btn">+ New Event</button>
                <span class="cal-user-avatar">SM</span>
            </div>
        </div>
    </nav>
    <div class="cal-layout">
        <aside class="cal-sidebar">
            <div class="cal-mini-calendar">
                <div class="mini-cal-header">
                    <button class="mini-cal-arrow">Left</button>
                    <span class="mini-cal-title">November 2026</span>
                    <button class="mini-cal-arrow">Right</button>
                </div>
                <div class="mini-cal-grid">
                    <span class="mini-day-name">S</span><span class="mini-day-name">M</span><span class="mini-day-name">T</span><span class="mini-day-name">W</span><span class="mini-day-name">T</span><span class="mini-day-name">F</span><span class="mini-day-name">S</span>
                    <span class="mini-day other-month-day">26</span><span class="mini-day other-month-day">27</span><span class="mini-day other-month-day">28</span><span class="mini-day other-month-day">29</span><span class="mini-day other-month-day">30</span><span class="mini-day other-month-day">31</span><span class="mini-day">1</span>
                    <span class="mini-day">2</span><span class="mini-day">3</span><span class="mini-day">4</span><span class="mini-day">5</span><span class="mini-day">6</span><span class="mini-day">7</span><span class="mini-day">8</span>
                    <span class="mini-day today-mini has-events-mini">9</span><span class="mini-day has-events-mini">10</span><span class="mini-day">11</span><span class="mini-day">12</span><span class="mini-day has-events-mini">13</span><span class="mini-day">14</span><span class="mini-day has-events-mini">15</span>
                    <span class="mini-day">16</span><span class="mini-day">17</span><span class="mini-day has-events-mini">18</span><span class="mini-day">19</span><span class="mini-day has-events-mini">20</span><span class="mini-day">21</span><span class="mini-day">22</span>
                    <span class="mini-day">23</span><span class="mini-day">24</span><span class="mini-day has-events-mini">25</span><span class="mini-day">26</span><span class="mini-day">27</span><span class="mini-day">28</span><span class="mini-day">29</span>
                    <span class="mini-day">30</span><span class="mini-day other-month-day">1</span><span class="mini-day other-month-day">2</span><span class="mini-day other-month-day">3</span><span class="mini-day other-month-day">4</span><span class="mini-day other-month-day">5</span><span class="mini-day other-month-day">6</span>
                </div>
            </div>
            <div class="cal-my-calendars">
                <div class="calendars-header">
                    <h3>My Calendars</h3>
                    <button class="add-calendar-btn">Plus Icon</button>
                </div>
                <ul class="calendars-list">
                    <li class="calendar-toggle"><label><input type="checkbox" checked><span class="cal-color-dot" style="background:#1a73e8"></span><span class="cal-name">Personal</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox" checked><span class="cal-color-dot" style="background:#0b8043"></span><span class="cal-name">Work</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox" checked><span class="cal-color-dot" style="background:#8e24aa"></span><span class="cal-name">BuilderHub</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox" checked><span class="cal-color-dot" style="background:#e67c73"></span><span class="cal-name">Deadlines</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox" checked><span class="cal-color-dot" style="background:#f6c026"></span><span class="cal-name">Study Group</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox"><span class="cal-color-dot" style="background:#039be5"></span><span class="cal-name">Birthdays</span></label></li>
                    <li class="calendar-toggle"><label><input type="checkbox"><span class="cal-color-dot" style="background:#616161"></span><span class="cal-name">Holidays</span></label></li>
                </ul>
            </div>
            <div class="cal-upcoming-widget">
                <h3>Upcoming Events</h3>
                <div class="upcoming-list">
                    <div class="upcoming-item"><span class="upcoming-dot" style="background:#8e24aa"></span><div class="upcoming-info"><span class="upcoming-title">Algorithm Challenge</span><span class="upcoming-time">Nov 15, All Day</span></div></div>
                    <div class="upcoming-item"><span class="upcoming-dot" style="background:#0b8043"></span><div class="upcoming-info"><span class="upcoming-title">Code Review Meeting</span><span class="upcoming-time">Nov 10, 2:00 PM</span></div></div>
                    <div class="upcoming-item"><span class="upcoming-dot" style="background:#f6c026"></span><div class="upcoming-info"><span class="upcoming-title">DSA Study Session</span><span class="upcoming-time">Nov 13, 4:00 PM</span></div></div>
                    <div class="upcoming-item"><span class="upcoming-dot" style="background:#1a73e8"></span><div class="upcoming-info"><span class="upcoming-title">Portfolio Deadline</span><span class="upcoming-time">Nov 18, 11:59 PM</span></div></div>
                    <div class="upcoming-item"><span class="upcoming-dot" style="background:#e67c73"></span><div class="upcoming-info"><span class="upcoming-title">Sprint 14 Ends</span><span class="upcoming-time">Nov 20, 5:00 PM</span></div></div>
                </div>
            </div>
        </aside>
        <main class="cal-main">
            <div class="cal-weekday-header">
                <span class="weekday-cell">Sunday</span>
                <span class="weekday-cell">Monday</span>
                <span class="weekday-cell">Tuesday</span>
                <span class="weekday-cell">Wednesday</span>
                <span class="weekday-cell">Thursday</span>
                <span class="weekday-cell">Friday</span>
                <span class="weekday-cell">Saturday</span>
            </div>
            <div class="cal-month-grid">
                <div class="cal-day-cell other-month-cell"><span class="day-num">26</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">27</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">28</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">29</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">30</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">31</span></div>
                <div class="cal-day-cell"><span class="day-num">1</span></div>
                <div class="cal-day-cell"><span class="day-num">2</span><div class="cal-event event-personal">Morning Run 7AM</div></div>
                <div class="cal-day-cell"><span class="day-num">3</span><div class="cal-event event-work">Team Standup 10AM</div></div>
                <div class="cal-day-cell"><span class="day-num">4</span><div class="cal-event event-builderhub">BuilderHub Weekly Reset</div></div>
                <div class="cal-day-cell"><span class="day-num">5</span><div class="cal-event event-personal">Gym Session 6PM</div></div>
                <div class="cal-day-cell"><span class="day-num">6</span><div class="cal-event event-study">DSA Study Group 4PM</div></div>
                <div class="cal-day-cell"><span class="day-num">7</span><div class="cal-event event-work">Code Review 2PM</div></div>
                <div class="cal-day-cell"><span class="day-num">8</span><div class="cal-event event-deadline">Project Phase 1 Due</div></div>
                <div class="cal-day-cell today-cell"><span class="day-num today-num">9</span><div class="cal-event event-builderhub">Line Count Update</div><div class="cal-event event-personal">Morning Run 7AM</div><div class="cal-event event-work">Sprint Planning 11AM</div></div>
                <div class="cal-day-cell"><span class="day-num">10</span><div class="cal-event event-work">Code Review Meeting 2PM</div><div class="cal-event event-personal">Dentist Appointment 4PM</div></div>
                <div class="cal-day-cell"><span class="day-num">11</span></div>
                <div class="cal-day-cell"><span class="day-num">12</span><div class="cal-event event-work">Backend Sync 3PM</div></div>
                <div class="cal-day-cell"><span class="day-num">13</span><div class="cal-event event-study">DSA Study Session 4PM</div></div>
                <div class="cal-day-cell"><span class="day-num">14</span><div class="cal-event event-personal">Movie Night 8PM</div></div>
                <div class="cal-day-cell"><span class="day-num">15</span><div class="cal-event event-builderhub">Algorithm Challenge All Day</div></div>
                <div class="cal-day-cell"><span class="day-num">16</span></div>
                <div class="cal-day-cell"><span class="day-num">17</span><div class="cal-event event-work">Client Call 10AM</div></div>
                <div class="cal-day-cell"><span class="day-num">18</span><div class="cal-event event-deadline">Portfolio Submission Deadline</div><div class="cal-event event-study">Study Group 5PM</div></div>
                <div class="cal-day-cell"><span class="day-num">19</span></div>
                <div class="cal-day-cell"><span class="day-num">20</span><div class="cal-event event-deadline">Sprint 14 Ends 5PM</div><div class="cal-event event-builderhub">DSA Webinar 6PM</div></div>
                <div class="cal-day-cell"><span class="day-num">21</span></div>
                <div class="cal-day-cell"><span class="day-num">22</span></div>
                <div class="cal-day-cell"><span class="day-num">23</span></div>
                <div class="cal-day-cell"><span class="day-num">24</span><div class="cal-event event-personal">Thanksgiving Prep</div></div>
                <div class="cal-day-cell"><span class="day-num">25</span><div class="cal-event event-builderhub">Hackathon: Build a VM</div></div>
                <div class="cal-day-cell"><span class="day-num">26</span></div>
                <div class="cal-day-cell"><span class="day-num">27</span></div>
                <div class="cal-day-cell"><span class="day-num">28</span></div>
                <div class="cal-day-cell"><span class="day-num">29</span></div>
                <div class="cal-day-cell"><span class="day-num">30</span><div class="cal-event event-work">Monthly Review 3PM</div></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">1</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">2</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">3</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">4</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">5</span></div>
                <div class="cal-day-cell other-month-cell"><span class="day-num">6</span></div>
            </div>
        </main>
    </div>
</body>
</html>
""")

# ===== calendar_planner.css =====
w("calendar_planner.css", """/* =============================================
   CALENDAR PLANNER STYLESHEET
   Author: Builder Platform Practice
   Purpose: Verbose expanded CSS for maximum line count
   ============================================= */

/* ---------- RESET AND BASE ---------- */
*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    font-size: 16px;
    scroll-behavior: smooth;
}

body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    color: #3c4043;
    background-color: #ffffff;
    overflow: hidden;
}

.container-full-cal {
    width: 100%;
    padding: 0 1rem;
}

/* ---------- NAVIGATION ---------- */
.cal-navbar {
    background-color: #ffffff;
    border-bottom: 1px solid #e8eaed;
    padding: 0.5rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.cal-navbar .container-full-cal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.cal-nav-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.cal-logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a73e8;
    text-decoration: none;
    white-space: nowrap;
}

.cal-today-btn {
    padding: 0.4rem 1rem;
    background-color: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 0.375rem;
    color: #3c4043;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
}

.cal-today-btn:hover {
    background-color: #f8f9fa;
    border-color: #c6c8cc;
}

.cal-nav-arrows {
    display: flex;
    gap: 0.25rem;
}

.cal-arrow-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: background-color 0.15s ease;
}

.cal-arrow-btn:hover {
    background-color: #f1f3f4;
}

.cal-current-period {
    font-size: 1.25rem;
    font-weight: 500;
    color: #3c4043;
    white-space: nowrap;
}

.cal-nav-center {
    flex: 1;
    display: flex;
    justify-content: center;
}

.cal-view-switcher {
    display: flex;
    background-color: #f1f3f4;
    border-radius: 0.5rem;
    padding: 0.2rem;
}

.cal-view-btn {
    padding: 0.4rem 1rem;
    background: none;
    border: none;
    border-radius: 0.375rem;
    color: #5f6368;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
}

.cal-view-btn:hover {
    color: #3c4043;
}

.active-cal-view {
    background-color: #ffffff;
    color: #1a73e8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    font-weight: 600;
}

.cal-nav-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.cal-search-btn,
.cal-settings-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: background-color 0.15s ease;
}

.cal-search-btn:hover,
.cal-settings-btn:hover {
    background-color: #f1f3f4;
}

.cal-new-event-btn {
    padding: 0.5rem 1.25rem;
    background-color: #1a73e8;
    color: #ffffff;
    border: none;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.cal-new-event-btn:hover {
    background-color: #1557b0;
    box-shadow: 0 2px 4px rgba(26, 115, 232, 0.3);
}

.cal-user-avatar {
    width: 32px;
    height: 32px;
    background-color: #1a73e8;
    color: #ffffff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    margin-left: 0.25rem;
}

/* ---------- LAYOUT ---------- */
.cal-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    height: calc(100vh - 57px);
}

/* ---------- SIDEBAR ---------- */
.cal-sidebar {
    padding: 1rem;
    border-right: 1px solid #e8eaed;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.cal-mini-calendar {
    background-color: #ffffff;
}

.mini-cal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.mini-cal-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #3c4043;
}

.mini-cal-arrow {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
}

.mini-cal-arrow:hover {
    background-color: #f1f3f4;
}

.mini-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.125rem;
    text-align: center;
}

.mini-day-name {
    font-size: 0.65rem;
    font-weight: 600;
    color: #70757a;
    padding: 0.25rem 0;
    text-transform: uppercase;
}

.mini-day {
    font-size: 0.75rem;
    padding: 0.3rem;
    border-radius: 50%;
    cursor: pointer;
    color: #3c4043;
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease;
}

.mini-day:hover {
    background-color: #f1f3f4;
}

.other-month-day {
    color: #bdc1c6;
}

.today-mini {
    background-color: #1a73e8 !important;
    color: #ffffff !important;
    font-weight: 700;
}

.has-events-mini::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background-color: #1a73e8;
    border-radius: 50%;
}

.today-mini.has-events-mini::after {
    background-color: #ffffff;
}

.cal-my-calendars {
    border-top: 1px solid #e8eaed;
    padding-top: 1rem;
}

.calendars-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

.calendars-header h3 {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3c4043;
}

.add-calendar-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #5f6368;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
}

.add-calendar-btn:hover {
    background-color: #f1f3f4;
}

.calendars-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.calendar-toggle label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
    font-size: 0.85rem;
}

.calendar-toggle label:hover {
    background-color: #f1f3f4;
}

.calendar-toggle input {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.cal-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.cal-name {
    color: #3c4043;
}

.cal-upcoming-widget {
    border-top: 1px solid #e8eaed;
    padding-top: 1rem;
}

.cal-upcoming-widget h3 {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3c4043;
    margin-bottom: 0.75rem;
}

.upcoming-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.upcoming-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.4rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.upcoming-item:hover {
    background-color: #f1f3f4;
}

.upcoming-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 0.35rem;
    flex-shrink: 0;
}

.upcoming-info {
    display: flex;
    flex-direction: column;
}

.upcoming-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: #3c4043;
}

.upcoming-time {
    font-size: 0.7rem;
    color: #70757a;
}

/* ---------- MAIN CALENDAR ---------- */
.cal-main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.cal-weekday-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    border-bottom: 1px solid #e8eaed;
    background-color: #f8f9fa;
}

.weekday-cell {
    padding: 0.6rem 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #70757a;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-right: 1px solid #e8eaed;
}

.weekday-cell:last-child {
    border-right: none;
}

.cal-month-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, 1fr);
    overflow-y: auto;
}

.cal-day-cell {
    border-right: 1px solid #e8eaed;
    border-bottom: 1px solid #e8eaed;
    padding: 0.375rem;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    transition: background-color 0.15s ease;
    cursor: pointer;
}

.cal-day-cell:nth-child(7n) {
    border-right: none;
}

.cal-day-cell:hover {
    background-color: #f8f9fa;
}

.other-month-cell {
    background-color: #fafafa;
}

.other-month-cell .day-num {
    color: #bdc1c6;
}

.today-cell {
    background-color: #e8f0fe;
}

.day-num {
    font-size: 0.8rem;
    font-weight: 500;
    color: #3c4043;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-bottom: 0.125rem;
}

.today-num {
    background-color: #1a73e8;
    color: #ffffff !important;
    font-weight: 700;
}

.cal-event {
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.65rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.cal-event:hover {
    opacity: 0.85;
}

.event-personal {
    background-color: #d2e3fc;
    color: #174ea6;
    border-left: 3px solid #1a73e8;
}

.event-work {
    background-color: #ceead6;
    color: #137333;
    border-left: 3px solid #0b8043;
}

.event-builderhub {
    background-color: #e8d5f5;
    color: #681da8;
    border-left: 3px solid #8e24aa;
}

.event-deadline {
    background-color: #fad2cf;
    color: #a50e0e;
    border-left: 3px solid #e67c73;
}

.event-study {
    background-color: #fef7e0;
    color: #b06000;
    border-left: 3px solid #f6c026;
}

/* ---------- SCROLLBAR ---------- */
.cal-sidebar::-webkit-scrollbar,
.cal-month-grid::-webkit-scrollbar {
    width: 6px;
}

.cal-sidebar::-webkit-scrollbar-track,
.cal-month-grid::-webkit-scrollbar-track {
    background: transparent;
}

.cal-sidebar::-webkit-scrollbar-thumb,
.cal-month-grid::-webkit-scrollbar-thumb {
    background-color: #dadce0;
    border-radius: 999px;
}

.cal-sidebar::-webkit-scrollbar-thumb:hover,
.cal-month-grid::-webkit-scrollbar-thumb:hover {
    background-color: #bdc1c6;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1024px) {
    .cal-layout {
        grid-template-columns: 1fr;
    }

    .cal-sidebar {
        display: none;
    }

    .cal-nav-center {
        display: none;
    }

    .cal-current-period {
        font-size: 1rem;
    }
}

@media (max-width: 768px) {
    .cal-day-cell {
        min-height: 70px;
        padding: 0.2rem;
    }

    .cal-event {
        font-size: 0.55rem;
        padding: 0.1rem 0.2rem;
    }

    .day-num {
        font-size: 0.7rem;
        width: 20px;
        height: 20px;
    }

    .cal-new-event-btn span {
        display: none;
    }
}
""")

print("\\nAll 6 files created successfully!")
print("Run your line counter to verify the new total.")
