from app import db
from datetime import datetime

class ResourceCategory(db.Model):
    __tablename__ = 'resource_categories'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    icon        = db.Column(db.String(10))
    color       = db.Column(db.String(20))
    skill_tag   = db.Column(db.String(100))
    sort_order  = db.Column(db.Integer, default=0)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    resources   = db.relationship('SkillResource', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id'         : self.id,
            'name'       : self.name,
            'description': self.description,
            'icon'       : self.icon,
            'color'      : self.color,
            'skill_tag'  : self.skill_tag,
            'sort_order' : self.sort_order,
            'resource_count': len(self.resources)
        }

class SkillResource(db.Model):
    __tablename__ = 'skill_resources'
    id             = db.Column(db.Integer, primary_key=True)
    title          = db.Column(db.String(255), nullable=False)
    description    = db.Column(db.Text, nullable=False)
    content        = db.Column(db.Text)
    category_id    = db.Column(db.Integer, db.ForeignKey('resource_categories.id'))
    resource_type  = db.Column(db.Enum('pdf','video','article','guide','checklist','template','quiz'))
    skill_tags     = db.Column(db.String(255))
    difficulty     = db.Column(db.Enum('Beginner','Intermediate','Advanced'))
    duration_mins  = db.Column(db.Integer, default=0)
    file_url       = db.Column(db.String(500))
    thumbnail_url  = db.Column(db.String(500))
    uploaded_by    = db.Column(db.Integer, db.ForeignKey('users.id'))
    is_featured    = db.Column(db.Boolean, default=False)
    is_active      = db.Column(db.Boolean, default=True)
    view_count     = db.Column(db.Integer, default=0)
    download_count = db.Column(db.Integer, default=0)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uploader       = db.relationship('User', backref='uploaded_resources', lazy=True)
    ratings        = db.relationship('ResourceRating', backref='resource', lazy=True)

    def get_avg_rating(self):
        if not self.ratings: return 0
        return round(sum(r.rating for r in self.ratings) / len(self.ratings), 1)

    def get_skill_tags_list(self):
        if not self.skill_tags: return []
        return [t.strip() for t in self.skill_tags.split(',')]

    def to_dict(self, user_id=None):
        d = {
            'id'            : self.id,
            'title'         : self.title,
            'description'   : self.description,
            'content'       : self.content,
            'category_id'   : self.category_id,
            'category_name' : self.category.name if self.category else '',
            'category_icon' : self.category.icon if self.category else '',
            'category_color': self.category.color if self.category else '',
            'resource_type' : self.resource_type,
            'skill_tags'    : self.get_skill_tags_list(),
            'difficulty'    : self.difficulty,
            'duration_mins' : self.duration_mins,
            'file_url'      : self.file_url,
            'is_featured'   : self.is_featured,
            'view_count'    : self.view_count,
            'download_count': self.download_count,
            'avg_rating'    : self.get_avg_rating(),
            'rating_count'  : len(self.ratings),
            'uploaded_by_name': self.uploader.name if self.uploader else 'Unknown',
            'created_at'    : self.created_at.isoformat() if self.created_at else None
        }
        if user_id:
            from app.models.resource import ResourceBookmark, ResourceProgress
            d['is_bookmarked'] = ResourceBookmark.query.filter_by(resource_id=self.id, user_id=user_id).first() is not None
            progress = ResourceProgress.query.filter_by(resource_id=self.id, user_id=user_id).first()
            d['progress_status'] = progress.status if progress else 'not_started'
            d['progress_pct'] = progress.progress_pct if progress else 0
        return d

class ResourceRating(db.Model):
    __tablename__ = 'resource_ratings'
    id          = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('skill_resources.id'))
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'))
    rating      = db.Column(db.Integer, nullable=False)
    review      = db.Column(db.Text)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

class ResourceBookmark(db.Model):
    __tablename__ = 'resource_bookmarks'
    id          = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('skill_resources.id'))
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

class ResourceProgress(db.Model):
    __tablename__ = 'resource_progress'
    id           = db.Column(db.Integer, primary_key=True)
    resource_id  = db.Column(db.Integer, db.ForeignKey('skill_resources.id'))
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'))
    status       = db.Column(db.Enum('not_started','in_progress', 'completed'), default='not_started')
    progress_pct = db.Column(db.Integer, default=0)
    started_at   = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

class ResourceQuiz(db.Model):
    __tablename__ = 'resource_quizzes'
    id          = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('skill_resources.id'))
    question    = db.Column(db.Text, nullable=False)
    option_a    = db.Column(db.String(255))
    option_b    = db.Column(db.String(255))
    option_c    = db.Column(db.String(255))
    option_d    = db.Column(db.String(255))
    correct_ans = db.Column(db.Enum('a','b','c','d'))
    explanation = db.Column(db.Text)
    sort_order  = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id'         : self.id,
            'resource_id': self.resource_id,
            'question'   : self.question,
            'options'    : {
                'a': self.option_a,
                'b': self.option_b,
                'c': self.option_c,
                'd': self.option_d
            },
            'correct_ans': self.correct_ans,
            'explanation': self.explanation,
            'sort_order' : self.sort_order
        }
