-- ============================================================
--  Seed Script — 5 users, 50 tasks across all categories
--  Password for all users: Password123
--  Hash generated with bcrypt salt rounds 12
-- ============================================================

-- Insert 5 test users (password: Password123)
INSERT INTO users (name, email, password_hash) VALUES
    ('Alice Martin',   'alice@example.com',   '$2b$12$Lkd30tX7IR8bHv.6TCK2KuOyc4CZvdW2jwS3LsxwseS84hBsn14JO'),
    ('Bob Johnson',    'bob@example.com',     '$2b$12$Lkd30tX7IR8bHv.6TCK2KuOyc4CZvdW2jwS3LsxwseS84hBsn14JO'),
    ('Carol Williams', 'carol@example.com',   '$2b$12$Lkd30tX7IR8bHv.6TCK2KuOyc4CZvdW2jwS3LsxwseS84hBsn14JO'),
    ('David Brown',    'david@example.com',   '$2b$12$Lkd30tX7IR8bHv.6TCK2KuOyc4CZvdW2jwS3LsxwseS84hBsn14JO'),
    ('Emma Davis',     'emma@example.com',    '$2b$12$Lkd30tX7IR8bHv.6TCK2KuOyc4CZvdW2jwS3LsxwseS84hBsn14JO')
ON CONFLICT (email) DO NOTHING;

-- ─── Tasks for Alice (user 1) ─────────────────────────────────
INSERT INTO tasks (user_id, title, description, category, priority, due_date, recurring, tags, completed, sort_order)
SELECT u.id, t.title, t.description, t.category, t.priority, t.due_date::date, t.recurring, t.tags::jsonb, t.completed, t.sort_order
FROM users u, (VALUES
    ('Prepare Q2 financial report',    'Compile revenue and expenses',         'Professional',    'Critical', '2026-04-20', 'none',    '["finance","report"]',     false, 10),
    ('Team standup meeting',           'Daily sync with engineering team',     'Professional',    'Medium',   '2026-04-15', 'daily',   '["meeting","team"]',       false,  9),
    ('Review pull requests',           'Code review for sprint backlog',       'Professional',    'High',     '2026-04-16', 'none',    '["code","review"]',        false,  8),
    ('Annual physical exam',           'Schedule with Dr. Thompson',           'Health',          'High',     '2026-04-25', 'none',    '["health","doctor"]',      false,  7),
    ('Morning jog',                    '5km run in the park',                  'Health',          'Low',      '2026-04-15', 'daily',   '["exercise","fitness"]',   false,  6),
    ('Read Clean Code',                'Finish chapters 8 through 12',         'Education',       'Medium',   '2026-04-30', 'none',    '["reading","coding"]',     false,  5),
    ('Pay electricity bill',           'Due by end of month',                  'Finance',         'High',     '2026-04-30', 'monthly', '["bills","utilities"]',    false,  4),
    ('Grocery shopping',               'Restock fruits and vegetables',        'Shopping',        'Low',      '2026-04-16', 'weekly',  '["groceries","food"]',     true,   3),
    ('Plan weekend hike',              'Trail selection and gear check',        'Travel',          'Low',      '2026-04-19', 'none',    '["outdoor","hiking"]',     false,  2),
    ('Watch Dune Part 2',              'Movie night with family',              'Entertainment',   'Low',      '2026-04-18', 'none',    '["movie","family"]',       false,  1)
) AS t(title, description, category, priority, due_date, recurring, tags, completed, sort_order)
WHERE u.email = 'alice@example.com';

-- ─── Tasks for Bob (user 2) ───────────────────────────────────
INSERT INTO tasks (user_id, title, description, category, priority, due_date, recurring, tags, completed, sort_order)
SELECT u.id, t.title, t.description, t.category, t.priority, t.due_date::date, t.recurring, t.tags::jsonb, t.completed, t.sort_order
FROM users u, (VALUES
    ('Deploy new microservice',        'Push auth service to production',       'Professional',   'Critical', '2026-04-17', 'none',    '["devops","backend"]',     false, 10),
    ('Write unit tests',               'Cover edge cases for payment module',   'Professional',   'High',     '2026-04-18', 'none',    '["testing","code"]',       false,  9),
    ('Client presentation',            'Demo new dashboard features',           'Professional',   'Critical', '2026-04-15', 'none',    '["client","demo"]',        false,  8),
    ('Dentist appointment',            'Routine cleaning',                      'Health',         'Medium',   '2026-04-22', 'none',    '["health","dental"]',      false,  7),
    ('Meal prep Sunday',               'Prepare lunches for the week',          'Health',         'Medium',   '2026-04-19', 'weekly',  '["food","health"]',        false,  6),
    ('Complete AWS certification',     'Study for Solutions Architect exam',    'Education',      'High',     '2026-05-15', 'none',    '["cloud","certification"]',false,  5),
    ('Review investment portfolio',    'Check stocks and rebalance',            'Finance',        'Medium',   '2026-04-30', 'monthly', '["investing","finance"]',  false,  4),
    ('Buy birthday gift for mom',      'Check her wishlist',                    'Shopping',       'High',     '2026-04-20', 'none',    '["gift","family"]',        false,  3),
    ('Book flight to Miami',           'Summer vacation planning',              'Travel',         'Medium',   '2026-04-25', 'none',    '["travel","vacation"]',    false,  2),
    ('Gaming session with friends',    'Friday night online game',              'Entertainment',  'Low',      '2026-04-18', 'weekly',  '["gaming","social"]',      true,   1)
) AS t(title, description, category, priority, due_date, recurring, tags, completed, sort_order)
WHERE u.email = 'bob@example.com';

-- ─── Tasks for Carol (user 3) ─────────────────────────────────
INSERT INTO tasks (user_id, title, description, category, priority, due_date, recurring, tags, completed, sort_order)
SELECT u.id, t.title, t.description, t.category, t.priority, t.due_date::date, t.recurring, t.tags::jsonb, t.completed, t.sort_order
FROM users u, (VALUES
    ('Update project roadmap',         'Q3 planning for product team',          'Professional',   'High',     '2026-04-18', 'none',    '["planning","product"]',   false, 10),
    ('Conduct user interviews',        '5 interviews for UX research',          'Professional',   'High',     '2026-04-22', 'none',    '["ux","research"]',        false,  9),
    ('Write blog post on React hooks', 'Technical article for company blog',    'Professional',   'Medium',   '2026-04-28', 'none',    '["writing","react"]',      false,  8),
    ('Yoga class',                     'Tuesday evening session',               'Health',         'Medium',   '2026-04-15', 'weekly',  '["yoga","wellness"]',      true,   7),
    ('Therapy session',                'Weekly check-in',                       'Health',         'High',     '2026-04-17', 'weekly',  '["mental-health"]',        false,  6),
    ('Complete Python course',         'Finish the data science module',        'Education',      'Medium',   '2026-05-01', 'none',    '["python","data-science"]',false,  5),
    ('File tax return',                'Gather all W2 and 1099 forms',          'Finance',        'Critical', '2026-04-15', 'none',    '["taxes","finance"]',      false,  4),
    ('Order new laptop stand',         'Ergonomic upgrade for home office',     'Shopping',       'Low',      '2026-04-20', 'none',    '["office","equipment"]',   false,  3),
    ('Research Tokyo itinerary',       'Plan 10-day Japan trip',                'Travel',         'Medium',   '2026-05-10', 'none',    '["japan","travel"]',       false,  2),
    ('Start watercolor painting',      'New hobby project',                     'Entertainment',  'Low',      '2026-04-21', 'none',    '["art","hobby"]',          false,  1)
) AS t(title, description, category, priority, due_date, recurring, tags, completed, sort_order)
WHERE u.email = 'carol@example.com';

-- ─── Tasks for David (user 4) ─────────────────────────────────
INSERT INTO tasks (user_id, title, description, category, priority, due_date, recurring, tags, completed, sort_order)
SELECT u.id, t.title, t.description, t.category, t.priority, t.due_date::date, t.recurring, t.tags::jsonb, t.completed, t.sort_order
FROM users u, (VALUES
    ('Fix critical login bug',         'Null pointer on OAuth redirect',        'Professional',   'Critical', '2026-04-15', 'none',    '["bug","auth"]',           false, 10),
    ('Sprint retrospective',           'End of sprint team review',             'Professional',   'Medium',   '2026-04-17', 'biweekly','["agile","team"]',         false,  9),
    ('Update API documentation',       'Swagger docs for v2 endpoints',         'Professional',   'Medium',   '2026-04-24', 'none',    '["docs","api"]',           false,  8),
    ('Blood pressure check',           'Monthly monitoring',                    'Health',         'High',     '2026-04-20', 'monthly', '["health","monitoring"]',  false,  7),
    ('Cycling — 20km route',           'Weekend morning ride',                  'Health',         'Medium',   '2026-04-19', 'weekly',  '["cycling","fitness"]',    false,  6),
    ('Read The Pragmatic Programmer',  'Finish last 4 chapters',                'Education',      'Low',      '2026-04-30', 'none',    '["books","programming"]',  true,   5),
    ('Set up emergency fund',          'Transfer to high-yield savings',        'Finance',        'High',     '2026-04-25', 'none',    '["savings","finance"]',    false,  4),
    ('Buy standing desk',              'Research ergonomic options under $500', 'Shopping',       'Medium',   '2026-04-28', 'none',    '["office","ergonomic"]',   false,  3),
    ('Renew passport',                 'Needed for Europe trip in July',        'Travel',         'Critical', '2026-04-22', 'none',    '["passport","travel"]',    false,  2),
    ('Build home lab server',          'Set up Proxmox for self-hosting',       'Personal Project','High',    '2026-05-01', 'none',    '["homelab","linux"]',      false,  1)
) AS t(title, description, category, priority, due_date, recurring, tags, completed, sort_order)
WHERE u.email = 'david@example.com';

-- ─── Tasks for Emma (user 5) ─────────────────────────────────
INSERT INTO tasks (user_id, title, description, category, priority, due_date, recurring, tags, completed, sort_order)
SELECT u.id, t.title, t.description, t.category, t.priority, t.due_date::date, t.recurring, t.tags::jsonb, t.completed, t.sort_order
FROM users u, (VALUES
    ('Onboard new team members',       'Prepare training materials and schedule','Professional',  'High',     '2026-04-18', 'none',    '["onboarding","hr"]',      false, 10),
    ('Performance review prep',        'Self assessment and goal setting',      'Professional',   'High',     '2026-04-20', 'none',    '["review","career"]',      false,  9),
    ('Negotiate vendor contract',      'Software licenses renewal',             'Professional',   'Critical', '2026-04-16', 'none',    '["contracts","vendor"]',   false,  8),
    ('10000 steps daily',              'Use fitness tracker to monitor',        'Health',         'Medium',   '2026-04-15', 'daily',   '["fitness","walking"]',    false,  7),
    ('Prenatal vitamins reminder',     'Take with breakfast',                   'Health',         'High',     '2026-04-15', 'daily',   '["health","vitamins"]',    true,   6),
    ('Learn Spanish — Duolingo',       '15 minutes daily practice',             'Education',      'Low',      '2026-04-15', 'daily',   '["language","spanish"]',   false,  5),
    ('Review mortgage options',        'Compare 15 vs 30 year rates',           'Finance',        'High',     '2026-04-22', 'none',    '["mortgage","finance"]',   false,  4),
    ('Kids back-to-school shopping',   'Supplies list for both kids',           'Shopping',       'High',     '2026-04-21', 'none',    '["kids","school"]',        false,  3),
    ('Book family reunion venue',      'Summer gathering for 30 people',        'Family',         'Medium',   '2026-04-28', 'none',    '["family","events"]',      false,  2),
    ('Concert tickets — Taylor Swift', 'Buy before they sell out',              'Entertainment',  'Critical', '2026-04-15', 'none',    '["concert","music"]',      false,  1)
) AS t(title, description, category, priority, due_date, recurring, tags, completed, sort_order)
WHERE u.email = 'emma@example.com';

-- ─── Verify ───────────────────────────────────────────────────
SELECT u.name, u.email, COUNT(t.id) AS task_count
FROM users u
LEFT JOIN tasks t ON t.user_id = u.id
WHERE u.email IN ('alice@example.com','bob@example.com','carol@example.com','david@example.com','emma@example.com')
GROUP BY u.name, u.email
ORDER BY u.name;
