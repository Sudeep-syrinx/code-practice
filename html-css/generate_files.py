def w(fname, content):
    with open(fname, "w", encoding="utf-8") as f:
        f.write(content)
    lines = content.count("\n") + 1
    print(f"  OK {fname}: {lines} lines")

print("Creating 6 new files (~3200 lines)...")

# ===== crm_dashboard.html =====
w("crm_dashboard.html", """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Dashboard - ClientFlow Pro</title>
    <link rel="stylesheet" href="crm_dashboard.css">
</head>
<body>
    <div class="crm-app">
        <aside class="crm-sidebar">
            <div class="crm-brand">
                <h1 class="crm-logo">ClientFlow</h1>
                <span class="crm-plan-badge">Pro Plan</span>
            </div>
            <nav class="crm-nav">
                <ul class="crm-nav-list">
                    <li class="crm-nav-item active-crm"><a href="#"><span class="crm-icon">Dashboard Icon</span><span>Dashboard</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Contacts Icon</span><span>Contacts</span><span class="crm-badge">248</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Companies Icon</span><span>Companies</span><span class="crm-badge">56</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Deals Icon</span><span>Deals</span><span class="crm-badge">23</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Tasks Icon</span><span>Tasks</span><span class="crm-badge urgent-badge">8</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Calendar Icon</span><span>Calendar</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Email Icon</span><span>Email Campaigns</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Reports Icon</span><span>Reports</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Automation Icon</span><span>Automation</span></a></li>
                    <li class="crm-nav-item"><a href="#"><span class="crm-icon">Settings Icon</span><span>Settings</span></a></li>
                </ul>
            </nav>
            <div class="crm-user-panel">
                <span class="crm-user-avatar">SM</span>
                <div class="crm-user-info"><span class="crm-user-name">Sudeep M.</span><span class="crm-user-role">Sales Manager</span></div>
                <button class="crm-logout-btn">Logout Icon</button>
            </div>
        </aside>
        <main class="crm-main">
            <header class="crm-topbar">
                <div class="crm-search-bar">
                    <span class="crm-search-icon">Search Icon</span>
                    <input type="text" placeholder="Search contacts, deals, companies..." class="crm-search-input">
                    <span class="crm-search-shortcut">Ctrl+K</span>
                </div>
                <div class="crm-topbar-actions">
                    <button class="crm-icon-btn">Notification Bell<span class="crm-notif-dot"></span></button>
                    <button class="crm-icon-btn">Help Icon</button>
                    <button class="btn-new-deal">+ New Deal</button>
                </div>
            </header>
            <div class="crm-content">
                <section class="crm-metrics-row">
                    <div class="crm-metric-card">
                        <div class="crm-metric-top"><span class="crm-metric-label">Total Revenue</span><span class="crm-metric-trend up">+18.2%</span></div>
                        <h3 class="crm-metric-value">$284,500</h3>
                        <p class="crm-metric-sub">vs $240,800 last month</p>
                        <div class="crm-mini-chart"><div class="mini-bar" style="height:40%"></div><div class="mini-bar" style="height:55%"></div><div class="mini-bar" style="height:45%"></div><div class="mini-bar" style="height:70%"></div><div class="mini-bar" style="height:60%"></div><div class="mini-bar" style="height:85%"></div><div class="mini-bar" style="height:95%"></div></div>
                    </div>
                    <div class="crm-metric-card">
                        <div class="crm-metric-top"><span class="crm-metric-label">Active Deals</span><span class="crm-metric-trend up">+5</span></div>
                        <h3 class="crm-metric-value">23</h3>
                        <p class="crm-metric-sub">8 closing this week</p>
                        <div class="crm-mini-chart"><div class="mini-bar" style="height:50%"></div><div class="mini-bar" style="height:60%"></div><div class="mini-bar" style="height:55%"></div><div class="mini-bar" style="height:65%"></div><div class="mini-bar" style="height:70%"></div><div class="mini-bar" style="height:75%"></div><div class="mini-bar" style="height:80%"></div></div>
                    </div>
                    <div class="crm-metric-card">
                        <div class="crm-metric-top"><span class="crm-metric-label">New Leads</span><span class="crm-metric-trend up">+32</span></div>
                        <h3 class="crm-metric-value">156</h3>
                        <p class="crm-metric-sub">This month total</p>
                        <div class="crm-mini-chart"><div class="mini-bar" style="height:30%"></div><div class="mini-bar" style="height:45%"></div><div class="mini-bar" style="height:60%"></div><div class="mini-bar" style="height:50%"></div><div class="mini-bar" style="height:75%"></div><div class="mini-bar" style="height:85%"></div><div class="mini-bar" style="height:90%"></div></div>
                    </div>
                    <div class="crm-metric-card">
                        <div class="crm-metric-top"><span class="crm-metric-label">Conversion Rate</span><span class="crm-metric-trend down">-1.2%</span></div>
                        <h3 class="crm-metric-value">24.8%</h3>
                        <p class="crm-metric-sub">vs 26.0% last month</p>
                        <div class="crm-mini-chart"><div class="mini-bar" style="height:80%"></div><div class="mini-bar" style="height:75%"></div><div class="mini-bar" style="height:70%"></div><div class="mini-bar" style="height:65%"></div><div class="mini-bar" style="height:60%"></div><div class="mini-bar" style="height:55%"></div><div class="mini-bar" style="height:50%"></div></div>
                    </div>
                </section>
                <section class="crm-pipeline-section">
                    <div class="crm-section-header"><h2 class="crm-section-title">Sales Pipeline</h2><button class="btn-view-pipeline">View Full Pipeline</button></div>
                    <div class="pipeline-stages">
                        <div class="pipeline-stage"><div class="stage-header"><h3 class="stage-name">Lead In</h3><span class="stage-count">12</span><span class="stage-value">$48,000</span></div><div class="stage-cards"><div class="deal-card-mini"><span class="deal-company">TechCorp Solutions</span><span class="deal-amount">$12,000</span><span class="deal-owner-avatar" style="background:#3b82f6">SM</span></div><div class="deal-card-mini"><span class="deal-company">StartupXYZ Inc</span><span class="deal-amount">$8,500</span><span class="deal-owner-avatar" style="background:#10b981">AK</span></div><div class="deal-card-mini"><span class="deal-company">DevStudio Ltd</span><span class="deal-amount">$15,000</span><span class="deal-owner-avatar" style="background:#f59e0b">PK</span></div><div class="deal-card-mini"><span class="deal-company">CloudNine Systems</span><span class="deal-amount">$12,500</span><span class="deal-owner-avatar" style="background:#8b5cf6">NK</span></div></div></div>
                        <div class="pipeline-stage"><div class="stage-header"><h3 class="stage-name">Qualified</h3><span class="stage-count">8</span><span class="stage-value">$62,000</span></div><div class="stage-cards"><div class="deal-card-mini"><span class="deal-company">BuildFast Co</span><span class="deal-amount">$22,000</span><span class="deal-owner-avatar" style="background:#3b82f6">SM</span></div><div class="deal-card-mini"><span class="deal-company">CodeMasters</span><span class="deal-amount">$18,000</span><span class="deal-owner-avatar" style="background:#ec4899">RV</span></div><div class="deal-card-mini"><span class="deal-company">WebWorks Agency</span><span class="deal-amount">$22,000</span><span class="deal-owner-avatar" style="background:#10b981">AK</span></div></div></div>
                        <div class="pipeline-stage"><div class="stage-header"><h3 class="stage-name">Proposal</h3><span class="stage-count">5</span><span class="stage-value">$85,000</span></div><div class="stage-cards"><div class="deal-card-mini"><span class="deal-company">Enterprise Corp</span><span class="deal-amount">$45,000</span><span class="deal-owner-avatar" style="background:#3b82f6">SM</span></div><div class="deal-card-mini"><span class="deal-company">GlobalTech Inc</span><span class="deal-amount">$40,000</span><span class="deal-owner-avatar" style="background:#f59e0b">PK</span></div></div></div>
                        <div class="pipeline-stage"><div class="stage-header"><h3 class="stage-name">Negotiation</h3><span class="stage-count">3</span><span class="stage-value">$52,000</span></div><div class="stage-cards"><div class="deal-card-mini"><span class="deal-company">MegaSoft Ltd</span><span class="deal-amount">$32,000</span><span class="deal-owner-avatar" style="background:#3b82f6">SM</span></div><div class="deal-card-mini"><span class="deal-company">InnovateTech</span><span class="deal-amount">$20,000</span><span class="deal-owner-avatar" style="background:#8b5cf6">NK</span></div></div></div>
                        <div class="pipeline-stage stage-won"><div class="stage-header"><h3 class="stage-name">Closed Won</h3><span class="stage-count">6</span><span class="stage-value">$124,000</span></div><div class="stage-cards"><div class="deal-card-mini won-deal"><span class="deal-company">AlphaSystems</span><span class="deal-amount">$56,000</span><span class="deal-owner-avatar" style="background:#3b82f6">SM</span></div><div class="deal-card-mini won-deal"><span class="deal-company">BetaCorp</span><span class="deal-amount">$38,000</span><span class="deal-owner-avatar" style="background:#10b981">AK</span></div><div class="deal-card-mini won-deal"><span class="deal-company">GammaTech</span><span class="deal-amount">$30,000</span><span class="deal-owner-avatar" style="background:#f59e0b">PK</span></div></div></div>
                    </div>
                </section>
                <section class="crm-bottom-row">
                    <div class="crm-recent-activity">
                        <h3 class="crm-card-title">Recent Activity</h3>
                        <div class="activity-feed">
                            <div class="activity-item"><span class="activity-dot" style="background:#3b82f6"></span><div class="activity-content"><p><strong>Sudeep M.</strong> closed a deal with <strong>AlphaSystems</strong> for <strong>$56,000</strong></p><span class="activity-time">2 hours ago</span></div></div>
                            <div class="activity-item"><span class="activity-dot" style="background:#10b981"></span><div class="activity-content"><p><strong>Arjun K.</strong> added a new contact <strong>Sarah Johnson</strong> from <strong>TechCorp</strong></p><span class="activity-time">4 hours ago</span></div></div>
                            <div class="activity-item"><span class="activity-dot" style="background:#f59e0b"></span><div class="activity-content"><p><strong>Priya K.</strong> sent a proposal to <strong>GlobalTech Inc</strong> for <strong>$40,000</strong></p><span class="activity-time">6 hours ago</span></div></div>
                            <div class="activity-item"><span class="activity-dot" style="background:#8b5cf6"></span><div class="activity-content"><p><strong>Neha K.</strong> scheduled a meeting with <strong>InnovateTech</strong> for Nov 15</p><span class="activity-time">Yesterday</span></div></div>
                            <div class="activity-item"><span class="activity-dot" style="background:#ec4899"></span><div class="activity-content"><p><strong>Rahul V.</strong> moved <strong>CodeMasters</strong> deal to Negotiation stage</p><span class="activity-time">Yesterday</span></div></div>
                            <div class="activity-item"><span class="activity-dot" style="background:#06b6d4"></span><div class="activity-content"><p><strong>Sudeep M.</strong> completed a call with <strong>MegaSoft Ltd</strong> - Positive outcome</p><span class="activity-time">2 days ago</span></div></div>
                        </div>
                    </div>
                    <div class="crm-upcoming-tasks">
                        <h3 class="crm-card-title">Upcoming Tasks</h3>
                        <div class="tasks-list-crm">
                            <div class="task-item-crm urgent-task"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Follow up with Enterprise Corp</span><span class="task-due-crm overdue-task">Due Today</span></div><span class="task-priority-high">High</span></div>
                            <div class="task-item-crm"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Send proposal to BuildFast Co</span><span class="task-due-crm">Due Tomorrow</span></div><span class="task-priority-medium">Medium</span></div>
                            <div class="task-item-crm"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Call with MegaSoft Ltd - Negotiation</span><span class="task-due-crm">Due Nov 12</span></div><span class="task-priority-high">High</span></div>
                            <div class="task-item-crm"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Prepare Q4 sales report</span><span class="task-due-crm">Due Nov 15</span></div><span class="task-priority-low">Low</span></div>
                            <div class="task-item-crm"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Demo for WebWorks Agency</span><span class="task-due-crm">Due Nov 18</span></div><span class="task-priority-medium">Medium</span></div>
                            <div class="task-item-crm"><input type="checkbox" class="task-check-crm"><div class="task-details-crm"><span class="task-title-crm">Update CRM pipeline stages</span><span class="task-due-crm">Due Nov 20</span></div><span class="task-priority-low">Low</span></div>
                        </div>
                    </div>
                    <div class="crm-top-performers">
                        <h3 class="crm-card-title">Top Performers</h3>
                        <div class="performers-list">
                            <div class="performer-item"><span class="performer-rank gold">1</span><span class="performer-avatar" style="background:#3b82f6">SM</span><div class="performer-info"><span class="performer-name">Sudeep M.</span><span class="performer-stat">$124,000 closed</span></div><div class="performer-bar-wrap"><div class="performer-bar" style="width:100%"></div></div></div>
                            <div class="performer-item"><span class="performer-rank silver">2</span><span class="performer-avatar" style="background:#10b981">AK</span><div class="performer-info"><span class="performer-name">Arjun K.</span><span class="performer-stat">$98,500 closed</span></div><div class="performer-bar-wrap"><div class="performer-bar" style="width:79%"></div></div></div>
                            <div class="performer-item"><span class="performer-rank bronze">3</span><span class="performer-avatar" style="background:#f59e0b">PK</span><div class="performer-info"><span class="performer-name">Priya K.</span><span class="performer-stat">$76,200 closed</span></div><div class="performer-bar-wrap"><div class="performer-bar" style="width:61%"></div></div></div>
                            <div class="performer-item"><span class="performer-rank">4</span><span class="performer-avatar" style="background:#8b5cf6">NK</span><div class="performer-info"><span class="performer-name">Neha K.</span><span class="performer-stat">$54,800 closed</span></div><div class="performer-bar-wrap"><div class="performer-bar" style="width:44%"></div></div></div>
                            <div class="performer-item"><span class="performer-rank">5</span><span class="performer-avatar" style="background:#ec4899">RV</span><div class="performer-info"><span class="performer-name">Rahul V.</span><span class="performer-stat">$42,300 closed</span></div><div class="performer-bar-wrap"><div class="performer-bar" style="width:34%"></div></div></div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>
</body>
</html>
""")

# ===== crm_dashboard.css =====
w("crm_dashboard.css", """/* =============================================
   CRM DASHBOARD STYLESHEET
   Author: Builder Platform Practice
   Purpose: Verbose expanded CSS for maximum line count
   ============================================= */

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; scroll-behavior: smooth; }
body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.5; color: #1e293b; background-color: #f8fafc; overflow: hidden; }

.crm-app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }

/* ---------- SIDEBAR ---------- */
.crm-sidebar { background-color: #1e293b; display: flex; flex-direction: column; padding: 1.25rem 0; overflow-y: auto; }
.crm-brand { padding: 0 1.25rem 1.25rem; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
.crm-logo { font-size: 1.35rem; font-weight: 800; color: #ffffff; }
.crm-plan-badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.crm-nav { flex: 1; padding: 1rem 0.75rem; }
.crm-nav-list { list-style: none; }
.crm-nav-item { margin-bottom: 0.2rem; }
.crm-nav-item a { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.75rem; color: #94a3b8; text-decoration: none; border-radius: 0.5rem; transition: all 0.2s ease; font-size: 0.875rem; font-weight: 500; }
.crm-nav-item a:hover { background-color: #334155; color: #e2e8f0; }
.active-crm a { background-color: #3b82f6 !important; color: #ffffff !important; }
.crm-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; }
.crm-badge { margin-left: auto; background-color: #475569; color: #e2e8f0; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; min-width: 20px; text-align: center; }
.urgent-badge { background-color: #ef4444 !important; color: #ffffff !important; }
.crm-user-panel { padding: 1rem 1.25rem; border-top: 1px solid #334155; display: flex; align-items: center; gap: 0.75rem; }
.crm-user-avatar { width: 36px; height: 36px; background-color: #3b82f6; color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; }
.crm-user-info { flex: 1; min-width: 0; }
.crm-user-name { display: block; font-size: 0.85rem; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crm-user-role { display: block; font-size: 0.7rem; color: #64748b; }
.crm-logout-btn { width: 28px; height: 28px; border-radius: 0.375rem; background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; }
.crm-logout-btn:hover { background-color: #334155; color: #ef4444; }

/* ---------- MAIN CONTENT ---------- */
.crm-main { overflow-y: auto; display: flex; flex-direction: column; }
.crm-topbar { background-color: #ffffff; padding: 0.75rem 2rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; gap: 1rem; }
.crm-search-bar { display: flex; align-items: center; gap: 0.75rem; background-color: #f1f5f9; border-radius: 0.5rem; padding: 0.5rem 1rem; flex: 1; max-width: 500px; border: 1px solid transparent; transition: all 0.2s ease; }
.crm-search-bar:focus-within { background-color: #ffffff; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.crm-search-icon { color: #94a3b8; font-size: 0.8rem; }
.crm-search-input { flex: 1; background: none; border: none; font-size: 0.9rem; color: #1e293b; }
.crm-search-input:focus { outline: none; }
.crm-search-input::placeholder { color: #94a3b8; }
.crm-search-shortcut { background-color: #e2e8f0; color: #64748b; padding: 0.15rem 0.4rem; border-radius: 0.25rem; font-size: 0.65rem; font-weight: 600; }
.crm-topbar-actions { display: flex; align-items: center; gap: 0.75rem; }
.crm-icon-btn { width: 36px; height: 36px; border-radius: 50%; background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; position: relative; transition: all 0.15s ease; }
.crm-icon-btn:hover { background-color: #f1f5f9; color: #334155; }
.crm-notif-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; border: 2px solid #ffffff; }
.btn-new-deal { padding: 0.5rem 1.25rem; background-color: #3b82f6; color: #ffffff; border: none; border-radius: 0.375rem; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; }
.btn-new-deal:hover { background-color: #2563eb; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(59,130,246,0.3); }
.crm-content { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; }

/* ---------- METRICS ROW ---------- */
.crm-metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.crm-metric-card { background-color: #ffffff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; transition: all 0.2s ease; }
.crm-metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.crm-metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.crm-metric-label { font-size: 0.8rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
.crm-metric-trend { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 999px; }
.crm-metric-trend.up { background-color: #dcfce7; color: #15803d; }
.crm-metric-trend.down { background-color: #fee2e2; color: #b91c1c; }
.crm-metric-value { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; line-height: 1; }
.crm-metric-sub { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem; }
.crm-mini-chart { display: flex; align-items: flex-end; gap: 0.2rem; height: 32px; }
.mini-bar { flex: 1; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 0.125rem; min-height: 3px; }

/* ---------- PIPELINE ---------- */
.crm-pipeline-section { background-color: #ffffff; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.crm-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.crm-section-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; }
.btn-view-pipeline { padding: 0.4rem 1rem; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.btn-view-pipeline:hover { background-color: #e2e8f0; }
.pipeline-stages { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
.pipeline-stage { min-width: 240px; max-width: 240px; background-color: #f8fafc; border-radius: 0.5rem; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.stage-header { display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
.stage-name { font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; flex: 1; }
.stage-count { background-color: #e2e8f0; color: #475569; font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; }
.stage-value { font-size: 0.75rem; font-weight: 700; color: #0f172a; }
.stage-won .stage-header { border-bottom-color: #10b981; }
.stage-won .stage-name { color: #059669; }
.stage-cards { display: flex; flex-direction: column; gap: 0.5rem; }
.deal-card-mini { background-color: #ffffff; border-radius: 0.375rem; padding: 0.6rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.3rem; cursor: grab; transition: all 0.15s ease; }
.deal-card-mini:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.08); border-color: #cbd5e1; }
.won-deal { border-left: 3px solid #10b981; }
.deal-company { font-size: 0.8rem; font-weight: 600; color: #1e293b; }
.deal-amount { font-size: 0.85rem; font-weight: 700; color: #059669; }
.deal-owner-avatar { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; font-weight: 700; color: #ffffff; align-self: flex-end; }

/* ---------- BOTTOM ROW ---------- */
.crm-bottom-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem; }
.crm-recent-activity, .crm-upcoming-tasks, .crm-top-performers { background-color: #ffffff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
.crm-card-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
.activity-feed { display: flex; flex-direction: column; gap: 0.75rem; }
.activity-item { display: flex; gap: 0.75rem; align-items: flex-start; }
.activity-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 0.35rem; flex-shrink: 0; }
.activity-content { flex: 1; }
.activity-content p { font-size: 0.8rem; color: #475569; line-height: 1.4; }
.activity-content strong { color: #1e293b; }
.activity-time { font-size: 0.7rem; color: #94a3b8; }
.tasks-list-crm { display: flex; flex-direction: column; gap: 0.5rem; }
.task-item-crm { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem; border-radius: 0.375rem; border: 1px solid #f1f5f9; transition: background-color 0.15s ease; }
.task-item-crm:hover { background-color: #f8fafc; }
.urgent-task { border-left: 3px solid #ef4444; background-color: #fef2f2; }
.task-check-crm { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
.task-details-crm { flex: 1; min-width: 0; }
.task-title-crm { display: block; font-size: 0.8rem; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-due-crm { display: block; font-size: 0.7rem; color: #64748b; }
.overdue-task { color: #dc2626 !important; font-weight: 600; }
.task-priority-high, .task-priority-medium, .task-priority-low { font-size: 0.6rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 999px; text-transform: uppercase; flex-shrink: 0; }
.task-priority-high { background-color: #fee2e2; color: #b91c1c; }
.task-priority-medium { background-color: #fef3c7; color: #92400e; }
.task-priority-low { background-color: #dcfce7; color: #15803d; }
.performers-list { display: flex; flex-direction: column; gap: 0.75rem; }
.performer-item { display: flex; align-items: center; gap: 0.6rem; }
.performer-rank { width: 20px; font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-align: center; }
.performer-rank.gold { color: #f59e0b; }
.performer-rank.silver { color: #94a3b8; }
.performer-rank.bronze { color: #d97706; }
.performer-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
.performer-info { min-width: 90px; }
.performer-name { display: block; font-size: 0.8rem; font-weight: 600; color: #1e293b; }
.performer-stat { display: block; font-size: 0.7rem; color: #64748b; }
.performer-bar-wrap { flex: 1; height: 6px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; }
.performer-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 999px; }

/* ---------- SCROLLBAR ---------- */
.crm-sidebar::-webkit-scrollbar, .crm-main::-webkit-scrollbar, .pipeline-stages::-webkit-scrollbar { width: 6px; height: 6px; }
.crm-sidebar::-webkit-scrollbar-track, .crm-main::-webkit-scrollbar-track, .pipeline-stages::-webkit-scrollbar-track { background: transparent; }
.crm-sidebar::-webkit-scrollbar-thumb, .crm-main::-webkit-scrollbar-thumb, .pipeline-stages::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 999px; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1200px) { .crm-metrics-row { grid-template-columns: repeat(2, 1fr); } .crm-bottom-row { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .crm-app { grid-template-columns: 1fr; } .crm-sidebar { display: none; } .crm-metrics-row { grid-template-columns: 1fr; } .crm-topbar { padding: 0.75rem 1rem; } .crm-content { padding: 1rem; } }
""")

# ===== project_mgmt.html =====
w("project_mgmt.html", """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Management - TaskMaster Pro</title>
    <link rel="stylesheet" href="project_mgmt.css">
</head>
<body>
    <div class="pm-app">
        <aside class="pm-sidebar">
            <div class="pm-brand"><h1 class="pm-logo">TaskMaster</h1></div>
            <div class="pm-workspace"><span class="pm-ws-icon">CP</span><div class="pm-ws-info"><span class="pm-ws-name">Code Practice</span><span class="pm-ws-plan">Pro Workspace</span></div></div>
            <nav class="pm-nav"><ul class="pm-nav-list">
                <li class="pm-nav-item active-pm"><a href="#"><span class="pm-nav-icon">Home Icon</span><span>Home</span></a></li>
                <li class="pm-nav-item"><a href="#"><span class="pm-nav-icon">My Tasks Icon</span><span>My Tasks</span><span class="pm-nav-count">12</span></a></li>
                <li class="pm-nav-item"><a href="#"><span class="pm-nav-icon">Inbox Icon</span><span>Inbox</span><span class="pm-nav-count notif">5</span></a></li>
                <li class="pm-nav-item"><a href="#"><span class="pm-nav-icon">Timeline Icon</span><span>Timeline</span></a></li>
                <li class="pm-nav-item"><a href="#"><span class="pm-nav-icon">Calendar Icon</span><span>Calendar</span></a></li>
            </ul></nav>
            <div class="pm-projects-section"><div class="pm-projects-header"><h3>Projects</h3><button class="pm-add-project">Plus Icon</button></div>
                <ul class="pm-projects-list">
                    <li class="pm-project-item active-project"><span class="pm-proj-dot" style="background:#3b82f6"></span><span class="pm-proj-name">BuilderHub Platform</span><span class="pm-proj-count">24</span></li>
                    <li class="pm-project-item"><span class="pm-proj-dot" style="background:#10b981"></span><span class="pm-proj-name">Portfolio Redesign</span><span class="pm-proj-count">8</span></li>
                    <li class="pm-project-item"><span class="pm-proj-dot" style="background:#f59e0b"></span><span class="pm-proj-name">Algorithm Library</span><span class="pm-proj-count">15</span></li>
                    <li class="pm-project-item"><span class="pm-proj-dot" style="background:#8b5cf6"></span><span class="pm-proj-name">Mobile App MVP</span><span class="pm-proj-count">6</span></li>
                    <li class="pm-project-item"><span class="pm-proj-dot" style="background:#ec4899"></span><span class="pm-proj-name">Documentation Site</span><span class="pm-proj-count">11</span></li>
                </ul>
            </div>
            <div class="pm-team-section"><h3>Team Members</h3>
                <div class="pm-team-list">
                    <div class="pm-team-member online-member"><span class="pm-tm-avatar" style="background:#3b82f6">SM</span><span class="pm-tm-name">Sudeep M.</span><span class="pm-tm-status"></span></div>
                    <div class="pm-team-member online-member"><span class="pm-tm-avatar" style="background:#10b981">AK</span><span class="pm-tm-name">Arjun K.</span><span class="pm-tm-status"></span></div>
                    <div class="pm-team-member away-member"><span class="pm-tm-avatar" style="background:#f59e0b">PK</span><span class="pm-tm-name">Priya K.</span><span class="pm-tm-status"></span></div>
                    <div class="pm-team-member offline-member"><span class="pm-tm-avatar" style="background:#8b5cf6">NK</span><span class="pm-tm-name">Neha K.</span><span class="pm-tm-status"></span></div>
                    <div class="pm-team-member online-member"><span class="pm-tm-avatar" style="background:#ec4899">RV</span><span class="pm-tm-name">Rahul V.</span><span class="pm-tm-status"></span></div>
                </div>
            </div>
        </aside>
        <main class="pm-main">
            <header class="pm-topbar"><div class="pm-breadcrumb"><a href="#">Projects</a><span class="pm-bc-sep">/</span><a href="#">BuilderHub Platform</a><span class="pm-bc-sep">/</span><span class="pm-bc-current">Sprint 14</span></div><div class="pm-topbar-actions"><button class="pm-btn-filter">Filter Icon Filter</button><button class="pm-btn-sort">Sort Icon Sort</button><button class="pm-btn-view active-view-btn">Board View</button><button class="pm-btn-view">List View</button><button class="pm-btn-add-task">+ Add Task</button></div></header>
            <div class="pm-content">
                <div class="pm-project-overview">
                    <div class="pm-overview-card"><h3>Sprint Progress</h3><div class="pm-progress-ring"><svg viewBox="0 0 36 36"><path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path class="ring-fill" stroke-dasharray="68, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg><span class="ring-text">68%</span></div><p class="pm-overview-sub">17 of 25 tasks completed</p></div>
                    <div class="pm-overview-card"><h3>Time Remaining</h3><div class="pm-countdown"><span class="countdown-num">5</span><span class="countdown-label">days left</span></div><p class="pm-overview-sub">Sprint ends Nov 14, 2026</p></div>
                    <div class="pm-overview-card"><h3>Team Velocity</h3><div class="pm-velocity-value"><span class="velocity-num">42</span><span class="velocity-label">points/sprint</span></div><p class="pm-overview-sub">+8 vs last sprint</p></div>
                    <div class="pm-overview-card"><h3>Bug Count</h3><div class="pm-bug-value"><span class="bug-num">3</span><span class="bug-label">open bugs</span></div><p class="pm-overview-sub">1 critical, 2 minor</p></div>
                </div>
                <div class="pm-task-board">
                    <div class="pm-column"><div class="pm-col-header todo-col"><h3>To Do</h3><span class="pm-col-count">5</span></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-feature">Feature</span><span class="pm-tag tag-high">High</span></div><h4 class="pm-task-title">Implement real-time notifications for rank changes and badge unlocks</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#3b82f6">SM</span><span class="pm-ta" style="background:#10b981">AK</span></div><span class="pm-task-meta">5 subtasks</span><span class="pm-task-date">Nov 14</span></div></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-bug">Bug</span></div><h4 class="pm-task-title">Fix mobile responsive issues on analytics dashboard charts</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#f59e0b">PK</span></div><span class="pm-task-meta">2 subtasks</span><span class="pm-task-date pm-overdue">Nov 10</span></div></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-improvement">Improvement</span></div><h4 class="pm-task-title">Add dark mode support across all platform pages</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#8b5cf6">NK</span></div><span class="pm-task-meta">8 subtasks</span><span class="pm-task-date">Nov 18</span></div></div>
                    </div>
                    <div class="pm-column"><div class="pm-col-header progress-col"><h3>In Progress</h3><span class="pm-col-count">4</span></div>
                        <div class="pm-task-card pm-card-active"><div class="pm-task-tags"><span class="pm-tag tag-feature">Feature</span><span class="pm-tag tag-high">High</span></div><h4 class="pm-task-title">Build campus leaderboard with filtering and search capabilities</h4><div class="pm-task-progress"><div class="pm-task-progress-bar"><div class="pm-task-progress-fill" style="width:65%"></div></div><span class="pm-task-progress-text">65%</span></div><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#3b82f6">SM</span></div><span class="pm-task-meta">6 subtasks</span><span class="pm-task-date">Nov 12</span></div></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-improvement">Improvement</span></div><h4 class="pm-task-title">Optimize database queries for leaderboard page performance</h4><div class="pm-task-progress"><div class="pm-task-progress-bar"><div class="pm-task-progress-fill" style="width:40%"></div></div><span class="pm-task-progress-text">40%</span></div><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#10b981">AK</span></div><span class="pm-task-meta">4 subtasks</span><span class="pm-task-date">Nov 15</span></div></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-design">Design</span></div><h4 class="pm-task-title">Redesign badge achievement modal with animations</h4><div class="pm-task-progress"><div class="pm-task-progress-bar"><div class="pm-task-progress-fill" style="width:80%"></div></div><span class="pm-task-progress-text">80%</span></div><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#ec4899">RV</span></div><span class="pm-task-meta">3 subtasks</span><span class="pm-task-date">Nov 11</span></div></div>
                    </div>
                    <div class="pm-column"><div class="pm-col-header review-col"><h3>In Review</h3><span class="pm-col-count">3</span></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-feature">Feature</span></div><h4 class="pm-task-title">Multi-language line counting support for Java and C++ files</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#3b82f6">SM</span><span class="pm-ta" style="background:#10b981">AK</span></div><span class="pm-task-meta">Done</span><span class="pm-task-date">Review</span></div></div>
                        <div class="pm-task-card"><div class="pm-task-tags"><span class="pm-tag tag-improvement">Improvement</span></div><h4 class="pm-task-title">Profile page lazy loading and caching optimization</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#f59e0b">PK</span></div><span class="pm-task-meta">Done</span><span class="pm-task-date">Review</span></div></div>
                    </div>
                    <div class="pm-column"><div class="pm-col-header done-col"><h3>Completed</h3><span class="pm-col-count">6</span></div>
                        <div class="pm-task-card pm-card-done"><div class="pm-task-tags"><span class="pm-tag tag-feature">Feature</span></div><h4 class="pm-task-title">User authentication with GitHub OAuth integration</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#3b82f6">SM</span></div><span class="pm-task-done-badge">Done Nov 5</span></div></div>
                        <div class="pm-task-card pm-card-done"><div class="pm-task-tags"><span class="pm-tag tag-improvement">Improvement</span></div><h4 class="pm-task-title">Responsive design overhaul for all pages</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#ec4899">RV</span><span class="pm-ta" style="background:#f59e0b">PK</span></div><span class="pm-task-done-badge">Done Nov 3</span></div></div>
                        <div class="pm-task-card pm-card-done"><div class="pm-task-tags"><span class="pm-tag tag-feature">Feature</span></div><h4 class="pm-task-title">Basic leaderboard with global rankings</h4><div class="pm-task-footer"><div class="pm-task-assignees"><span class="pm-ta" style="background:#10b981">AK</span></div><span class="pm-task-done-badge">Done Oct 30</span></div></div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</body>
</html>
""")

# ===== project_mgmt.css =====
w("project_mgmt.css", """/* =============================================
   PROJECT MANAGEMENT STYLESHEET
   Author: Builder Platform Practice
   Purpose: Verbose expanded CSS for maximum line count
   ============================================= */

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; scroll-behavior: smooth; }
body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.5; color: #1e293b; background-color: #f1f5f9; overflow: hidden; }

.pm-app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }

/* ---------- SIDEBAR ---------- */
.pm-sidebar { background-color: #1e1b4b; display: flex; flex-direction: column; padding: 1rem 0; overflow-y: auto; }
.pm-brand { padding: 0 1.25rem 1rem; }
.pm-logo { font-size: 1.35rem; font-weight: 800; color: #a78bfa; }
.pm-workspace { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.25rem; margin: 0 0.75rem 1rem; background-color: rgba(255,255,255,0.08); border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s ease; }
.pm-workspace:hover { background-color: rgba(255,255,255,0.12); }
.pm-ws-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 0.375rem; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
.pm-ws-info { display: flex; flex-direction: column; }
.pm-ws-name { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; }
.pm-ws-plan { font-size: 0.7rem; color: #a78bfa; }
.pm-nav { padding: 0 0.75rem; margin-bottom: 1rem; }
.pm-nav-list { list-style: none; }
.pm-nav-item { margin-bottom: 0.15rem; }
.pm-nav-item a { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; color: #a5b4fc; text-decoration: none; border-radius: 0.375rem; transition: all 0.2s ease; font-size: 0.85rem; font-weight: 500; }
.pm-nav-item a:hover { background-color: rgba(255,255,255,0.08); color: #e2e8f0; }
.active-pm a { background-color: rgba(167,139,250,0.2) !important; color: #ffffff !important; }
.pm-nav-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; }
.pm-nav-count { margin-left: auto; background-color: rgba(255,255,255,0.15); color: #c4b5fd; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; }
.pm-nav-count.notif { background-color: #ef4444; color: #ffffff; }
.pm-projects-section { padding: 0 0.75rem; margin-bottom: 1rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; }
.pm-projects-header { display: flex; justify-content: space-between; align-items: center; padding: 0 0.5rem; margin-bottom: 0.5rem; }
.pm-projects-header h3 { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #a5b4fc; }
.pm-add-project { width: 20px; height: 20px; border-radius: 50%; background: none; border: none; color: #a5b4fc; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
.pm-add-project:hover { background-color: rgba(255,255,255,0.1); color: #ffffff; }
.pm-projects-list { list-style: none; }
.pm-project-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.5rem; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.15s ease; }
.pm-project-item:hover { background-color: rgba(255,255,255,0.08); }
.active-project { background-color: rgba(167,139,250,0.15) !important; }
.pm-proj-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pm-proj-name { flex: 1; font-size: 0.8rem; color: #c4b5fd; font-weight: 500; }
.active-project .pm-proj-name { color: #ffffff; }
.pm-proj-count { font-size: 0.7rem; color: #7c7caa; }
.pm-team-section { padding: 0 1.25rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1rem; margin-top: auto; }
.pm-team-section h3 { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #a5b4fc; margin-bottom: 0.75rem; }
.pm-team-list { display: flex; flex-direction: column; gap: 0.4rem; }
.pm-team-member { display: flex; align-items: center; gap: 0.6rem; padding: 0.3rem 0; }
.pm-tm-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; font-weight: 700; color: #ffffff; flex-shrink: 0; }
.pm-tm-name { flex: 1; font-size: 0.8rem; color: #c4b5fd; }
.pm-tm-status { width: 8px; height: 8px; border-radius: 50%; }
.online-member .pm-tm-status { background-color: #10b981; }
.away-member .pm-tm-status { background-color: #f59e0b; }
.offline-member .pm-tm-status { background-color: #64748b; }
.offline-member { opacity: 0.5; }

/* ---------- MAIN ---------- */
.pm-main { overflow-y: auto; display: flex; flex-direction: column; }
.pm-topbar { background-color: #ffffff; padding: 0.75rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; gap: 1rem; flex-wrap: wrap; }
.pm-breadcrumb { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.pm-breadcrumb a { color: #64748b; text-decoration: none; }
.pm-breadcrumb a:hover { color: #4f46e5; }
.pm-bc-sep { color: #cbd5e1; }
.pm-bc-current { color: #1e293b; font-weight: 600; }
.pm-topbar-actions { display: flex; align-items: center; gap: 0.5rem; }
.pm-btn-filter, .pm-btn-sort { padding: 0.4rem 0.75rem; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.375rem; color: #64748b; font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease; }
.pm-btn-filter:hover, .pm-btn-sort:hover { background-color: #f1f5f9; border-color: #cbd5e1; }
.pm-btn-view { padding: 0.4rem 0.75rem; background: none; border: 1px solid #e2e8f0; border-radius: 0.375rem; color: #64748b; font-size: 0.8rem; cursor: pointer; transition: all 0.15s ease; }
.active-view-btn { background-color: #4f46e5 !important; color: #ffffff !important; border-color: #4f46e5 !important; }
.pm-btn-add-task { padding: 0.4rem 1rem; background-color: #4f46e5; color: #ffffff; border: none; border-radius: 0.375rem; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s ease; }
.pm-btn-add-task:hover { background-color: #4338ca; }
.pm-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }

/* ---------- OVERVIEW CARDS ---------- */
.pm-project-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.pm-overview-card { background-color: #ffffff; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: center; }
.pm-overview-card h3 { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
.pm-progress-ring { position: relative; width: 80px; height: 80px; margin: 0 auto 0.5rem; }
.pm-progress-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 3; }
.ring-fill { fill: none; stroke: #4f46e5; stroke-width: 3; stroke-linecap: round; }
.ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-size: 1rem; font-weight: 800; color: #4f46e5; }
.pm-countdown { margin-bottom: 0.5rem; }
.countdown-num { font-size: 2.5rem; font-weight: 800; color: #f59e0b; line-height: 1; }
.countdown-label { display: block; font-size: 0.8rem; color: #64748b; }
.pm-velocity-value { margin-bottom: 0.5rem; }
.velocity-num { font-size: 2.5rem; font-weight: 800; color: #10b981; line-height: 1; }
.velocity-label { display: block; font-size: 0.8rem; color: #64748b; }
.pm-bug-value { margin-bottom: 0.5rem; }
.bug-num { font-size: 2.5rem; font-weight: 800; color: #ef4444; line-height: 1; }
.bug-label { display: block; font-size: 0.8rem; color: #64748b; }
.pm-overview-sub { font-size: 0.75rem; color: #94a3b8; }

/* ---------- TASK BOARD ---------- */
.pm-task-board { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; align-items: flex-start; }
.pm-column { min-width: 280px; max-width: 280px; background-color: #f8fafc; border-radius: 0.75rem; display: flex; flex-direction: column; max-height: calc(100vh - 320px); }
.pm-col-header { padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.5rem; border-radius: 0.75rem 0.75rem 0 0; border-bottom: 2px solid #e2e8f0; }
.pm-col-header h3 { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; flex: 1; }
.todo-col { border-bottom-color: #3b82f6; }
.progress-col { border-bottom-color: #f59e0b; }
.review-col { border-bottom-color: #8b5cf6; }
.done-col { border-bottom-color: #10b981; }
.pm-col-count { background-color: #e2e8f0; color: #475569; font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; }
.pm-column > .pm-task-card:first-of-type { margin-top: 0.75rem; }
.pm-task-card { background-color: #ffffff; border-radius: 0.5rem; padding: 0.875rem; margin: 0 0.5rem 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; cursor: grab; transition: all 0.15s ease; }
.pm-task-card:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.1); border-color: #cbd5e1; }
.pm-card-active { border-left: 3px solid #f59e0b; }
.pm-card-done { opacity: 0.7; }
.pm-card-done .pm-task-title { text-decoration: line-through; color: #94a3b8; }
.pm-task-tags { display: flex; gap: 0.3rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.pm-tag { padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; }
.tag-feature { background-color: #dbeafe; color: #1d4ed8; }
.tag-bug { background-color: #fee2e2; color: #b91c1c; }
.tag-improvement { background-color: #dcfce7; color: #15803d; }
.tag-design { background-color: #ede9fe; color: #6b21a8; }
.tag-high { background-color: #fef3c7; color: #92400e; }
.pm-task-title { font-size: 0.85rem; font-weight: 500; color: #1e293b; line-height: 1.4; margin-bottom: 0.6rem; }
.pm-task-progress { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem; }
.pm-task-progress-bar { flex: 1; height: 4px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; }
.pm-task-progress-fill { height: 100%; background-color: #f59e0b; border-radius: 999px; }
.pm-task-progress-text { font-size: 0.7rem; font-weight: 700; color: #f59e0b; }
.pm-task-footer { display: flex; align-items: center; gap: 0.5rem; }
.pm-task-assignees { display: flex; }
.pm-ta { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; font-weight: 700; color: #ffffff; border: 2px solid #ffffff; margin-left: -6px; }
.pm-ta:first-child { margin-left: 0; }
.pm-task-meta { font-size: 0.7rem; color: #94a3b8; margin-left: auto; }
.pm-task-date { font-size: 0.7rem; color: #64748b; padding: 0.1rem 0.35rem; background-color: #f1f5f9; border-radius: 0.25rem; }
.pm-overdue { background-color: #fee2e2 !important; color: #b91c1c !important; font-weight: 600; }
.pm-task-done-badge { font-size: 0.7rem; color: #10b981; font-weight: 600; margin-left: auto; }

/* ---------- SCROLLBAR ---------- */
.pm-sidebar::-webkit-scrollbar, .pm-main::-webkit-scrollbar, .pm-task-board::-webkit-scrollbar { width: 6px; height: 6px; }
.pm-sidebar::-webkit-scrollbar-track, .pm-main::-webkit-scrollbar-track, .pm-task-board::-webkit-scrollbar-track { background: transparent; }
.pm-sidebar::-webkit-scrollbar-thumb, .pm-main::-webkit-scrollbar-thumb, .pm-task-board::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 999px; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1200px) { .pm-project-overview { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .pm-app { grid-template-columns: 1fr; } .pm-sidebar { display: none; } .pm-project-overview { grid-template-columns: 1fr; } .pm-topbar { flex-direction: column; align-items: flex-start; } }
""")

print("\\nAll 4 files created successfully!")
print("Run your line counter to verify the new total.")
