import os

path = r'c:\Users\ucomu\data driven vounteer coordination system\volunteer-coordination-system\backend\app\templates\pages\ngo-chatbox.html'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    injection = '''
                <a href="../pages/ngo-resources.html" class="nav-link">
                    <span class="nav-link-icon">📚</span>
                    <span>NGO Resources</span>
                </a>'''
                    
    if '<nav class="sidebar-nav">' in content and 'ngo-resources.html' not in content:
        content = content.replace('<nav class="sidebar-nav">', '<nav class="sidebar-nav">' + injection)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
            
print('Done')
