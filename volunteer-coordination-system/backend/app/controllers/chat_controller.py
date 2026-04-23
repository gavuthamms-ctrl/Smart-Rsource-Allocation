from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models.message import ChatRoom, Message, MessageReaction
from app.models.user import User
from app.models.volunteer import Volunteer
from app.models.community_member import CommunityMember
from app.models.organization import Organization as NGO
from app.models.activity_log import ActivityLog
from app.utils.api_response import success_response, error_response
from datetime import datetime, timedelta

def get_all_rooms():
    user_id = get_jwt_identity()

    rooms = ChatRoom.query.filter_by(
        is_active=True
    ).order_by(ChatRoom.pin_order).all()

    result = []
    for room in rooms:
        # Get last message for this room
        last_msg = Message.query.filter_by(
            room_id=room.id,
            is_deleted=False
        ).order_by(
            Message.created_at.desc()
        ).first()

        # Count unread messages (messages after user's last read time)
        # For simplicity: count messages in last 24h that are not from this user
        from datetime import datetime, timedelta
        since = datetime.utcnow() - timedelta(hours=24)
        unread = Message.query.filter(
            Message.room_id == room.id,
            Message.user_id != user_id,
            Message.created_at > since,
            Message.is_deleted == False
        ).count()

        room_dict = {
            'id'          : room.id,
            'name'        : room.name,
            'description' : room.description,
            'type'        : room.type,
            'location'    : room.location,
            'pin_order'   : room.pin_order,
            'unread'      : unread,
            'last_msg'    : '',
            'last_time'   : ''
        }

        if last_msg:
            sender = User.query.get(last_msg.user_id)
            sender_name = sender.name if sender else 'Unknown'
            msg_preview = last_msg.message[:50] + (
                '...' if len(last_msg.message) > 50 else '')
            room_dict['last_msg'] = (
                f'{sender_name}: {msg_preview}')
            room_dict['last_time'] = (
                last_msg.created_at.strftime('%I:%M %p'))

        result.append(room_dict)

    return success_response({'rooms': result})

def get_room_messages(room_id):
    user_id = get_jwt_identity()
    after   = request.args.get('after')

    query = Message.query.filter(
        Message.room_id == room_id,
        Message.is_deleted == False
    )

    if after:
        try:
            from datetime import datetime
            after_dt = datetime.fromisoformat(after)
            query = query.filter(
                Message.created_at > after_dt)
        except:
            pass

    messages = query.order_by(
        Message.created_at.asc()
    ).all()

    result = []
    for msg in messages:
        sender = User.query.get(msg.user_id)
        if not sender:
            continue

        msg_dict = {
            'id'               : msg.id,
            'room_id'          : msg.room_id,
            'user_id'          : msg.user_id,
            'sender_name'      : sender.name,
            'sender_role'      : sender.role,
            'message'          : msg.message,
            'message_type'     : msg.message_type,
            'urgency_level'    : msg.urgency_level,
            'image_url'        : msg.image_url,
            'is_edited'        : msg.is_edited,
            'reply_to_id'      : msg.reply_to_id,
            'reply_to_sender'  : None,
            'reply_to_preview' : None,
            'reactions'        : [],
            'time_display'     : msg.created_at.strftime(
                                     '%I:%M %p'),
            'date_display'     : get_date_label(
                                     msg.created_at),
            'created_at'       : msg.created_at.isoformat() + 'Z'
        }

        # Fetch reply-to message details
        if msg.reply_to_id:
            original = Message.query.get(msg.reply_to_id)
            if original:
                orig_sender = User.query.get(
                    original.user_id)
                msg_dict['reply_to_sender'] = (
                    orig_sender.name
                    if orig_sender else 'Unknown')
                msg_dict['reply_to_preview'] = (
                    original.message[:60])

        # Fetch reactions
        reactions_raw = MessageReaction.query.filter_by(
            message_id=msg.id
        ).all()

        # Group reactions by emoji
        emoji_groups = {}
        for r in reactions_raw:
            if r.emoji not in emoji_groups:
                emoji_groups[r.emoji] = {
                    'emoji'       : r.emoji,
                    'count'       : 0,
                    'user_reacted': False
                }
            emoji_groups[r.emoji]['count'] += 1
            if r.user_id == user_id:
                emoji_groups[r.emoji]['user_reacted'] = True

        msg_dict['reactions'] = list(emoji_groups.values())
        result.append(msg_dict)

    return success_response({'messages': result})

def get_date_label(dt):
    from datetime import datetime, date
    today     = date.today()
    msg_date  = dt.date()
    if msg_date == today:
        return 'Today'
    elif msg_date == today.replace(
            day=today.day - 1):
        return 'Yesterday'
    else:
        return dt.strftime('%B %d, %Y')

def send_message():
    user_id = get_jwt_identity()
    data    = request.get_json()

    # Validate required fields
    room_id      = data.get('room_id')
    message_text = data.get('message', '').strip()

    if not room_id:
        return error_response('room_id is required', 400)
    if not message_text and not data.get('image_url'):
        return error_response('message is required', 400)

    # Validate room exists
    room = ChatRoom.query.get(room_id)
    if not room or not room.is_active:
        return error_response('Room not found', 404)

    # Validate user exists
    user = User.query.get(user_id)
    if not user:
        return error_response('User not found', 404)

    # Create message
    new_msg = Message(
        room_id       = int(room_id),
        user_id       = user_id,
        message       = message_text,
        message_type  = data.get('message_type', 'text'),
        image_url     = data.get('image_url'),
        reply_to_id   = data.get('reply_to_id'),
        urgency_level = data.get('urgency_level', 'normal')
    )

    db.session.add(new_msg)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

    # Build response with full sender info
    response_msg = {
        'id'               : new_msg.id,
        'room_id'          : new_msg.room_id,
        'user_id'          : new_msg.user_id,
        'sender_name'      : user.name,
        'sender_role'      : user.role,
        'message'          : new_msg.message,
        'message_type'     : new_msg.message_type,
        'urgency_level'    : new_msg.urgency_level,
        'image_url'        : new_msg.image_url,
        'reply_to_id'      : new_msg.reply_to_id,
        'reply_to_sender'  : None,
        'reply_to_preview' : None,
        'reactions'        : [],
        'time_display'     : new_msg.created_at.strftime(
                                 '%I:%M %p'),
        'date_display'     : 'Today',
        'created_at'       : new_msg.created_at.isoformat() + 'Z'
    }

    # Fetch reply details if reply_to_id
    if new_msg.reply_to_id:
        original = Message.query.get(new_msg.reply_to_id)
        if original:
            orig_sender = User.query.get(original.user_id)
            response_msg['reply_to_sender'] = (
                orig_sender.name
                if orig_sender else 'Unknown')
            response_msg['reply_to_preview'] = (
                original.message[:60])

    # Log to activity_logs
    try:
        log = ActivityLog(
            user_id    = user_id,
            type       = 'announcement_posted'
                         if new_msg.message_type
                            == 'announcement'
                         else 'task_accepted',
            message    = f'Sent message in {room.name}',
            time_ago   = 'Just now'
        )
        db.session.add(log)
        db.session.commit()
    except:
        pass  # Non-critical, don't fail send

    return success_response(
        {'message': response_msg},
        'Message sent successfully',
        201
    )

def toggle_reaction(message_id):
    user_id    = get_jwt_identity()
    emoji      = request.get_json().get('emoji', '')

    if not emoji:
        return error_response('emoji is required', 400)

    # Check message exists
    msg = Message.query.get(message_id)
    if not msg:
        return error_response('Message not found', 404)

    # Check if user already reacted with this emoji
    existing = MessageReaction.query.filter_by(
        message_id = message_id,
        user_id    = user_id,
        emoji      = emoji
    ).first()

    if existing:
        db.session.delete(existing)
        action = 'removed'
    else:
        reaction = MessageReaction(
            message_id = message_id,
            user_id    = user_id,
            emoji      = emoji
        )
        db.session.add(reaction)
        action = 'added'

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(str(e), 500)

    # Get updated reaction counts
    all_reactions = MessageReaction.query.filter_by(
        message_id=message_id).all()
    emoji_groups = {}
    for r in all_reactions:
        if r.emoji not in emoji_groups:
            emoji_groups[r.emoji] = {
                'emoji': r.emoji,
                'count': 0,
                'user_reacted': False
            }
        emoji_groups[r.emoji]['count'] += 1
        if r.user_id == user_id:
            emoji_groups[r.emoji]['user_reacted'] = True

    return success_response({
        'action'   : action,
        'message_id': message_id,
        'reactions': list(emoji_groups.values())
    })

def get_online_members():
    users = User.query.filter_by(
        is_active=True
    ).all()

    result = []
    for u in users:
        member = {
            'id'    : u.id,
            'name'  : u.name,
            'role'  : u.role,
            'online': True  # simplified: all active = online
        }
        if u.role == 'volunteer':
            vol = Volunteer.query.filter_by(
                user_id=u.id).first()
            if vol:
                member['skills']       = vol.skills
                member['location']     = vol.location
                member['availability'] = vol.availability
        elif u.role == 'community':
            com = CommunityMember.query.filter_by(
                user_id=u.id).first()
            if com:
                member['location'] = com.city
        elif u.role == 'ngo':
            ngo = NGO.query.filter_by(
                user_id=u.id).first()
            if ngo:
                member['location']  = ngo.city
                member['ngo_name']  = ngo.ngo_name

        result.append(member)

    return success_response({'members': result})

def get_pinned_messages():
    # Get last announcement from room 3 and last urgent from room 2
    pinned = []

    announce = Message.query.filter_by(
        room_id      = 3,
        message_type = 'announcement',
        is_deleted   = False
    ).order_by(
        Message.created_at.desc()
    ).first()

    if announce:
        sender = User.query.get(announce.user_id)
        pinned.append({
            'room_name'   : 'NGO Announcements',
            'sender'      : sender.name if sender else '',
            'message'     : announce.message[:80],
            'room_id'     : 3,
            'message_id'  : announce.id
        })

    urgent = Message.query.filter_by(
        room_id      = 2,
        message_type = 'urgent_alert',
        is_deleted   = False
    ).order_by(
        Message.created_at.desc()
    ).first()

    if urgent:
        sender = User.query.get(urgent.user_id)
        pinned.append({
            'room_name'  : 'Urgent Alerts',
            'sender'     : sender.name if sender else '',
            'message'    : urgent.message[:80],
            'room_id'    : 2,
            'message_id' : urgent.id
        })

    return success_response({'pinned': pinned})
