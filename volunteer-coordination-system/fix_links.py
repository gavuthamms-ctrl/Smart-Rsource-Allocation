import os
import glob
import re

frontend_dir = r'c:\Users\ucomu\data driven vounteer coordination system\volunteer-coordination-system\backend\app\templates\pages'

def update_file(path, is_ngo):
    if not os.path.exists(path):
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    if is_ngo:
        if 'NGO Resources' not in content:
            print('Missing in', path)
            content = re.sub(
                r'(<a[^>]*href=[\'\"][^\'\"]*ngo-chatbox\.html[\'\"][^>]*>)',
                r'<a href="../pages/ngo-resources.html" class="nav-link">\n                    <span class="nav-link-icon">📚</span>\n                    <span>NGO Resources</span>\n                </a>\n                \1',
                content
            )
            
        content = re.sub(
            r'href=[\'\"]/?ngo-resources\.html[\'\"]',
            r'href="../pages/ngo-resources.html"',
            content
        )
        content = re.sub(
            r'<span class="icon">📚</span> NGO Resources',
            r'<span class="nav-link-icon">📚</span>\n                    <span>NGO Resources</span>',
            content
        )
    else:
        if 'Skill Resources' not in content:
            print('Missing in', path)
            content = re.sub(
                r'(<a[^>]*href=[\'\"][^\'\"]*profile\.html[\'\"][^>]*>)',
                r'<a href="../pages/resources.html" class="nav-link">\n                    <span class="nav-link-icon">📚</span>\n                    <span>Skill Resources</span>\n                </a>\n                \1',
                content
            )
        
        content = re.sub(
            r'href=[\'\"]/?resources\.html[\'\"]',
            r'href="../pages/resources.html"',
            content
        )
        content = re.sub(
            r'<span class="icon">📚</span>\s*<span class="label">Skill Resources</span>',
            r'<span class="nav-link-icon">📚</span>\n                    <span>Skill Resources</span>',
            content
        )

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated', path)

vol_pages = ['dashboard.html', 'matched-tasks.html', 'task-history.html', 'resources.html', 'profile.html']
ngo_pages = ['ngo-dashboard.html', 'ngo-volunteers.html', 'ngo-tasks.html', 'ngo-community.html', 'ngo-reports.html', 'ngo-resources.html', 'ngo-settings.html', 'ngo-profile.html']

for p in vol_pages:
    update_file(os.path.join(frontend_dir, p), False)

for p in ngo_pages:
    update_file(os.path.join(frontend_dir, p), True)

print("Done")
