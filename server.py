# ==========================================================================
# SIH 2026 - AUTHORITATIVE FLASK BACKEND & SECURITY CONTROLLER
# Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College
# ==========================================================================

import os
import time
import json
import sqlite3
import hashlib
import secrets
import threading
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, make_response, Response

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

DB_PATH = 'sih_database.db'

DEFAULT_ADMIN_USER = os.environ.get('ADMIN_USERNAME', 'Vel Tech SIH')
DEFAULT_ADMIN_PASS = os.environ.get('ADMIN_PASSWORD', 'veltechsmarthack123')

SALT = b'veltech_sih_2026_salt'
def hash_password(password: str) -> str:
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), SALT, 100000).hex()

ADMIN_PASSWORD_HASH = hash_password(DEFAULT_ADMIN_PASS)

# 1. Database Setup
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Event State Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS event_state (
                id INTEGER PRIMARY KEY,
                status TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                start_timestamp REAL,
                pause_timestamp REAL,
                remaining_seconds_when_paused INTEGER,
                updated_at REAL NOT NULL
            )
        ''')
        
        # Admin Sessions Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_sessions (
                session_id TEXT PRIMARY KEY,
                created_at REAL NOT NULL,
                expires_at REAL NOT NULL,
                ip_address TEXT
            )
        ''')
        
        # Audit Logs Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                action TEXT NOT NULL,
                admin_identifier TEXT NOT NULL,
                details TEXT,
                ip_address TEXT
            )
        ''')

        # Announcements Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                heading TEXT NOT NULL,
                time_label TEXT,
                details TEXT NOT NULL,
                duration_seconds INTEGER DEFAULT 60,
                priority TEXT DEFAULT 'NORMAL',
                sound_enabled INTEGER DEFAULT 1,
                status TEXT DEFAULT 'SCHEDULED',
                scheduled_timestamp REAL,
                displayed_timestamp REAL,
                created_at REAL NOT NULL
            )
        ''')
        
        # Seed initial event state if empty
        cursor.execute('SELECT COUNT(*) FROM event_state')
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO event_state (id, status, duration_seconds, start_timestamp, pause_timestamp, remaining_seconds_when_paused, updated_at)
                VALUES (1, 'NOT_STARTED', 86400, NULL, NULL, NULL, ?)
            ''', (time.time(),))
        
        conn.commit()

init_db()

# 2. Audit Log Helper
def log_audit(action, admin_identifier, details='', ip_address=''):
    try:
        with get_db() as conn:
            conn.cursor().execute('''
                INSERT INTO audit_logs (timestamp, action, admin_identifier, details, ip_address)
                VALUES (?, ?, ?, ?, ?)
            ''', (time.time(), action, admin_identifier, details, ip_address))
            conn.commit()
    except Exception as e:
        print('Audit log error:', e)

# 3. Authentication Middleware
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get('sih_admin_session')
        if not session_id:
            return jsonify({'error': 'Unauthorized: Admin session required'}), 401
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM admin_sessions WHERE session_id = ? AND expires_at > ?', (session_id, time.time()))
            session = cursor.fetchone()
            
            if not session:
                return jsonify({'error': 'Unauthorized: Invalid or expired session'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# 4. Authoritative State Calculations
def calculate_event_state():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM event_state WHERE id = 1')
        row = cursor.fetchone()
        
        if not row:
            return None
        
        now = time.time()
        status = row['status']
        duration = row['duration_seconds']
        start_ts = row['start_timestamp']
        paused_rem = row['remaining_seconds_when_paused']
        
        remaining_seconds = duration
        elapsed_seconds = 0
        target_timestamp = None
        
        if status == 'RUNNING' and start_ts:
            elapsed_seconds = int(now - start_ts)
            remaining_seconds = max(0, duration - elapsed_seconds)
            target_timestamp = start_ts + duration
            
            if remaining_seconds <= 0:
                status = 'COMPLETED'
                cursor.execute('UPDATE event_state SET status = ? WHERE id = 1', ('COMPLETED',))
                conn.commit()
                log_audit('AUTO_COMPLETED', 'SYSTEM', '24-hour countdown finished naturally')
        elif status == 'PAUSED' and paused_rem is not None:
            remaining_seconds = paused_rem
            elapsed_seconds = duration - remaining_seconds
        elif status == 'COMPLETED':
            remaining_seconds = 0
            elapsed_seconds = duration

        progress_percent = round(min(100.0, max(0.0, (elapsed_seconds / duration) * 100.0)), 2)

        cursor.execute('''
            SELECT * FROM announcements 
            WHERE status = 'ACTIVE' AND (displayed_timestamp + duration_seconds) > ?
            ORDER BY displayed_timestamp DESC LIMIT 1
        ''', (now,))
        active_ann_row = cursor.fetchone()
        active_announcement = None
        if active_ann_row:
            active_ann = dict(active_ann_row)
            active_ann['remaining_duration'] = max(0, int((active_ann['displayed_timestamp'] + active_ann['duration_seconds']) - now))
            active_announcement = active_ann

        return {
            'status': status,
            'server_time': round(now, 3),
            'start_timestamp': round(start_ts, 3) if start_ts else None,
            'target_timestamp': round(target_timestamp, 3) if target_timestamp else None,
            'duration_seconds': duration,
            'remaining_seconds': remaining_seconds,
            'elapsed_seconds': elapsed_seconds,
            'progress_percent': progress_percent,
            'active_announcement': active_announcement
        }

# Background Scheduler Thread for Scheduled Announcements
def scheduled_announcement_worker():
    while True:
        try:
            now = time.time()
            with get_db() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id FROM announcements 
                    WHERE status = 'SCHEDULED' AND scheduled_timestamp IS NOT NULL AND scheduled_timestamp <= ?
                ''', (now,))
                due_rows = cursor.fetchall()
                for row in due_rows:
                    cursor.execute('''
                        UPDATE announcements 
                        SET status = 'ACTIVE', displayed_timestamp = ? 
                        WHERE id = ?
                    ''', (now, row['id']))
                    log_audit('AUTO_TRIGGERED_ANNOUNCEMENT', 'SCHEDULER', f'Announcement ID {row["id"]} triggered automatically')
                
                cursor.execute('''
                    UPDATE announcements 
                    SET status = 'DISPLAYED' 
                    WHERE status = 'ACTIVE' AND (displayed_timestamp + duration_seconds) <= ?
                ''', (now,))
                conn.commit()
        except Exception as e:
            print('Scheduler worker error:', e)
        time.sleep(1)

scheduler_thread = threading.Thread(target=scheduled_announcement_worker, daemon=True)
scheduler_thread.start()

# ==========================================================================
# PUBLIC API ENDPOINTS
# ==========================================================================

@app.route('/api/event/status', methods=['GET'])
def get_public_event_status():
    state = calculate_event_state()
    return jsonify(state), 200

# Public Start Endpoint: Allows initiating the event from NOT_STARTED without requiring a password!
@app.route('/api/event/public_start', methods=['POST'])
def public_start_event():
    state = calculate_event_state()
    if state['status'] != 'NOT_STARTED':
        # Already started/running/paused - return current authoritative state
        return jsonify({'success': False, 'message': 'Event countdown is already active', 'event': state}), 200

    now = time.time()
    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE event_state
            SET status = 'RUNNING', start_timestamp = ?, pause_timestamp = NULL, remaining_seconds_when_paused = NULL, updated_at = ?
            WHERE id = 1
        ''', (now, now))
        conn.commit()

    log_audit('PUBLIC_EVENT_START', 'PUBLIC_LAUNCH', '24-Hour Countdown Started from Public Interface', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/announcements/active', methods=['GET'])
def get_active_announcements():
    state = calculate_event_state()
    return jsonify({'active_announcement': state.get('active_announcement')}), 200

# Reject public write attempts on protected endpoints
@app.route('/api/event/status', methods=['PUT', 'DELETE', 'PATCH'])
def reject_public_writes():
    return jsonify({'error': 'Method Not Allowed: Public state modifications are restricted. Use /api/admin/ endpoints'}), 405

# Real-Time SSE Stream for Instant Push Updates
@app.route('/api/events/stream')
def sse_event_stream():
    def generate():
        while True:
            state = calculate_event_state()
            yield f"data: {json.dumps(state)}\n\n"
            time.sleep(1.5)
    return Response(generate(), mimetype='text/event-stream')

# ==========================================================================
# PROTECTED ADMIN AUTHENTICATION API ENDPOINTS
# ==========================================================================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    ip_addr = request.remote_addr or ''

    if username != DEFAULT_ADMIN_USER or hash_password(password) != ADMIN_PASSWORD_HASH:
        log_audit('LOGIN_FAILED', username or 'UNKNOWN', 'Invalid username or password', ip_addr)
        return jsonify({'error': 'Invalid administrator username or password'}), 401

    session_id = secrets.token_hex(32)
    created_at = time.time()
    expires_at = created_at + (12 * 3600)

    with get_db() as conn:
        conn.cursor().execute('''
            INSERT INTO admin_sessions (session_id, created_at, expires_at, ip_address)
            VALUES (?, ?, ?, ?)
        ''', (session_id, created_at, expires_at, ip_addr))
        conn.commit()

    log_audit('LOGIN_SUCCESS', username, 'Admin session established', ip_addr)

    response = make_response(jsonify({'success': True, 'username': DEFAULT_ADMIN_USER}))
    response.set_cookie('sih_admin_session', session_id, httponly=True, samesite='Lax', max_age=12*3600)
    return response, 200

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session_id = request.cookies.get('sih_admin_session')
    if session_id:
        with get_db() as conn:
            conn.cursor().execute('DELETE FROM admin_sessions WHERE session_id = ?', (session_id,))
            conn.commit()
    
    log_audit('LOGOUT', DEFAULT_ADMIN_USER, 'Session invalidated', request.remote_addr or '')
    response = make_response(jsonify({'success': True}))
    response.delete_cookie('sih_admin_session')
    return response, 200

@app.route('/api/admin/status', methods=['GET'])
@admin_required
def get_admin_status():
    state = calculate_event_state()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT timestamp, action, admin_identifier, details, ip_address FROM audit_logs ORDER BY id DESC LIMIT 15')
        logs = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute('SELECT * FROM announcements ORDER BY id DESC LIMIT 20')
        announcements = [dict(row) for row in cursor.fetchall()]
        
    return jsonify({
        'authenticated': True,
        'username': DEFAULT_ADMIN_USER,
        'event': state,
        'audit_logs': logs,
        'announcements': announcements
    }), 200

# ==========================================================================
# PROTECTED ADMIN EVENT CONTROLS
# ==========================================================================

@app.route('/api/admin/event/start', methods=['POST'])
@admin_required
def admin_start_event():
    now = time.time()
    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE event_state
            SET status = 'RUNNING', start_timestamp = ?, pause_timestamp = NULL, remaining_seconds_when_paused = NULL, updated_at = ?
            WHERE id = 1
        ''', (now, now))
        conn.commit()
        
    log_audit('EVENT_START', DEFAULT_ADMIN_USER, 'Authorized 24-Hour Countdown Initiation from Admin Panel', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/admin/event/pause', methods=['POST'])
@admin_required
def admin_pause_event():
    state = calculate_event_state()
    if state['status'] != 'RUNNING':
        return jsonify({'error': 'Cannot pause event: event is not running'}), 400
        
    now = time.time()
    remaining = state['remaining_seconds']
    
    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE event_state
            SET status = 'PAUSED', pause_timestamp = ?, remaining_seconds_when_paused = ?, updated_at = ?
            WHERE id = 1
        ''', (now, remaining, now))
        conn.commit()
        
    log_audit('EVENT_PAUSE', DEFAULT_ADMIN_USER, f'Event paused with {remaining} seconds remaining', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/admin/event/resume', methods=['POST'])
@admin_required
def admin_resume_event():
    state = calculate_event_state()
    if state['status'] != 'PAUSED':
        return jsonify({'error': 'Cannot resume event: event is not paused'}), 400
        
    now = time.time()
    remaining = state['remaining_seconds']
    duration = state['duration_seconds']
    new_start_timestamp = now - (duration - remaining)
    
    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE event_state
            SET status = 'RUNNING', start_timestamp = ?, pause_timestamp = NULL, remaining_seconds_when_paused = NULL, updated_at = ?
            WHERE id = 1
        ''', (new_start_timestamp, now))
        conn.commit()
        
    log_audit('EVENT_RESUME', DEFAULT_ADMIN_USER, 'Event resumed', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/admin/event/reset', methods=['POST'])
@admin_required
def admin_reset_event():
    now = time.time()
    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE event_state
            SET status = 'NOT_STARTED', start_timestamp = NULL, pause_timestamp = NULL, remaining_seconds_when_paused = NULL, updated_at = ?
            WHERE id = 1
        ''', (now,))
        conn.commit()
        
    log_audit('EVENT_RESET', DEFAULT_ADMIN_USER, 'Event timer reset to Pre-Launch state', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/admin/event/edit_timer', methods=['POST'])
@admin_required
def admin_edit_timer():
    data = request.get_json() or {}
    hours = int(data.get('hours', 24))
    minutes = int(data.get('minutes', 0))
    seconds = int(data.get('seconds', 0))

    new_remaining = (hours * 3600) + (minutes * 60) + seconds
    if new_remaining < 0:
        return jsonify({'error': 'Invalid remaining time'}), 400

    now = time.time()
    state = calculate_event_state()
    duration = state['duration_seconds']

    new_start_timestamp = now - (duration - new_remaining)

    with get_db() as conn:
        if state['status'] == 'PAUSED':
            conn.cursor().execute('''
                UPDATE event_state
                SET remaining_seconds_when_paused = ?, updated_at = ?
                WHERE id = 1
            ''', (new_remaining, now))
        else:
            conn.cursor().execute('''
                UPDATE event_state
                SET start_timestamp = ?, updated_at = ?
                WHERE id = 1
            ''', (new_start_timestamp, now))
        conn.commit()

    log_audit('EDIT_TIMER', DEFAULT_ADMIN_USER, f'Timer adjusted to {hours:02d}:{minutes:02d}:{seconds:02d}', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

# Announcements Management Endpoints
@app.route('/api/admin/announcements/create', methods=['POST'])
@admin_required
def admin_create_announcement():
    data = request.get_json() or {}
    heading = data.get('heading', '').strip()
    time_label = data.get('time_label', '').strip()
    details = data.get('details', '').strip()
    duration_seconds = int(data.get('duration_seconds', 60))
    priority = data.get('priority', 'NORMAL').upper()
    sound_enabled = 1 if data.get('sound_enabled', True) else 0
    display_now = data.get('display_now', True)
    scheduled_ts = data.get('scheduled_timestamp')

    if not heading or not details:
        return jsonify({'error': 'Heading and details are required'}), 400

    now = time.time()
    status = 'ACTIVE' if display_now else 'SCHEDULED'
    displayed_ts = now if display_now else None

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO announcements (heading, time_label, details, duration_seconds, priority, sound_enabled, status, scheduled_timestamp, displayed_timestamp, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (heading, time_label, details, duration_seconds, priority, sound_enabled, status, scheduled_ts, displayed_ts, now))
        conn.commit()
        ann_id = cursor.lastrowid

    action_text = 'DISPLAY_NOW' if display_now else 'SCHEDULED'
    log_audit(f'ANNOUNCEMENT_{action_text}', DEFAULT_ADMIN_USER, f'[{heading}] Priority: {priority}, Duration: {duration_seconds}s', request.remote_addr or '')
    return jsonify({'success': True, 'id': ann_id, 'event': calculate_event_state()}), 200

@app.route('/api/admin/announcements/trigger', methods=['POST'])
@admin_required
def admin_trigger_announcement():
    data = request.get_json() or {}
    ann_id = data.get('id')
    now = time.time()

    with get_db() as conn:
        conn.cursor().execute('''
            UPDATE announcements
            SET status = 'ACTIVE', displayed_timestamp = ?
            WHERE id = ?
        ''', (now, ann_id))
        conn.commit()

    log_audit('ANNOUNCEMENT_TRIGGER_NOW', DEFAULT_ADMIN_USER, f'Triggered announcement ID {ann_id}', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

@app.route('/api/admin/announcements/delete', methods=['POST'])
@admin_required
def admin_delete_announcement():
    data = request.get_json() or {}
    ann_id = data.get('id')

    with get_db() as conn:
        conn.cursor().execute('DELETE FROM announcements WHERE id = ?', (ann_id,))
        conn.commit()

    log_audit('ANNOUNCEMENT_DELETE', DEFAULT_ADMIN_USER, f'Deleted announcement ID {ann_id}', request.remote_addr or '')
    return jsonify({'success': True, 'event': calculate_event_state()}), 200

# Static file routes
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/admin')
@app.route('/admin/login')
@app.route('/admin/dashboard')
@app.route('/sih-admin')
def serve_admin():
    return send_from_directory('.', 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(filename) and os.path.isfile(filename):
        return send_from_directory('.', filename)
    basename = os.path.basename(filename)
    if os.path.exists(basename) and os.path.isfile(basename):
        return send_from_directory('.', basename)
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    print("==========================================================================")
    print(" SIH 2026 Authoritative Command Center Server on http://localhost:8080")
    print(" Public Participant Display: http://localhost:8080/")
    print(" Admin Control Panel: http://localhost:8080/admin")
    print("==========================================================================")
    app.run(host='0.0.0.0', port=8080, debug=True)
