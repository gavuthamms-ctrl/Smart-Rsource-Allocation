import os

frontend_dir = r'c:\Users\ucomu\data driven vounteer coordination system\volunteer-coordination-system\backend\app\templates\pages'

def inject_in_nav(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<a href="../pages/resources.html" class="nav-link">' in content:
        return
        
    injection = '''
                <a href="../pages/resources.html" class="nav-link">
                    <span class="nav-link-icon">📚</span>
                    <span>Skill Resources</span>
                </a>'''
                
    if '<!-- Links injected by sidebar.js -->' in content:
        content = content.replace('<!-- Links injected by sidebar.js -->', 
            '<!-- Links injected by sidebar.js -->' + injection)
    elif '<!-- Content injected by sidebar.js -->' in content:
        content = content.replace('<!-- Content injected by sidebar.js -->', 
            '<!-- Content injected by sidebar.js -->' + injection)
    else:
        content = content.replace('<nav class="sidebar-nav">',
            '<nav class="sidebar-nav">' + injection)
                
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

inject_in_nav(os.path.join(frontend_dir, 'dashboard.html'))
inject_in_nav(os.path.join(frontend_dir, 'matched-tasks.html'))
inject_in_nav(os.path.join(frontend_dir, 'task-history.html'))
inject_in_nav(os.path.join(frontend_dir, 'chatbox.html'))

print('Done')
