import os
import re

base_dir = 'volunteer-coordination-system/backend/app'
pages_dir = os.path.join(base_dir, 'templates/pages')
static_js_dir = os.path.join(base_dir, 'static/js/pages')
static_css_dir = os.path.join(base_dir, 'static/css/pages')

files_to_delete = [
    os.path.join(pages_dir, 'resources.html'),
    os.path.join(static_css_dir, 'resources.css'),
    os.path.join(static_js_dir, 'resources.js'),
    os.path.join(pages_dir, 'ngo-resources.html'),
    os.path.join(base_dir, 'routes/resource_routes.py'),
    os.path.join(base_dir, 'controllers/resource_controller.py'),
    os.path.join(base_dir, 'models/resource.py')
]

for f in files_to_delete:
    if os.path.exists(f):
        os.remove(f)
        print(f'Deleted: {f}')

# Update Volunteer HTMLs
vol_htmls = ['dashboard.html', 'matched-tasks.html', 'task-history.html', 'profile.html']
for html_file in vol_htmls:
    path = os.path.join(pages_dir, html_file)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to remove the <a> tag with 'resources.html' or 'Skill Resources'
        new_content = re.sub(r'\s*<a[^>]*href=[\"\'\s]*\.\./pages/resources\.html[\"\'\s]*[^>]*>.*?</a>', '', content, flags=re.DOTALL)
        
        if content != new_content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated volunteer sidebar in: {path}')

# Update NGO HTMLs
ngo_htmls = ['ngo-dashboard.html', 'ngo-volunteers.html', 'ngo-tasks.html', 'ngo-community.html', 'ngo-reports.html', 'ngo-settings.html']
for html_file in ngo_htmls:
    path = os.path.join(pages_dir, html_file)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = re.sub(r'\s*<a[^>]*href=[\"\'\s]*\.\./pages/ngo-resources\.html[\"\'\s]*[^>]*>.*?</a>', '', content, flags=re.DOTALL)
        
        if content != new_content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Updated NGO sidebar in: {path}')

# Update chatbox.js
chatbox_path = os.path.join(static_js_dir, 'chatbox.js')
if os.path.exists(chatbox_path):
    with open(chatbox_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'\s*\{\s*icon:\s*[\'\"`]📚[\'\"`],\s*text:\s*[\'\"`]Skill Resources[\'\"`],\s*href:\s*[\'\"`]resources\.html[\'\"`]\s*\},?', '', content)
    new_content = re.sub(r'\s*\{\s*icon:\s*[\'\"`]📚[\'\"`],\s*text:\s*[\'\"`]NGO Resources[\'\"`],\s*href:\s*[\'\"`]ngo-resources\.html[\'\"`]\s*\},?', '', content)
    new_content = re.sub(r',\s*\]', ']', new_content)
    
    if content != new_content:
        with open(chatbox_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated: {chatbox_path}')

# Update __init__.py
init_path = os.path.join(base_dir, '__init__.py')
if os.path.exists(init_path):
    with open(init_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        if 'from app.routes.resource_routes import resource_bp' in line:
            continue
        if 'app.register_blueprint(resource_bp, url_prefix=\'/api/resources\')' in line:
            continue
        new_lines.append(line)
        
    if len(lines) != len(new_lines):
        with open(init_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f'Updated: {init_path}')
