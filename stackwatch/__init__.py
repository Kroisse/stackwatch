import iso8601
from flask import Flask, request, render_template, url_for, redirect, abort
from redis import StrictRedis

from .util import utcnow


app = Flask(__name__)
conn = StrictRedis()


def format_timedelta(value):
    hours = value.seconds
    hours, seconds = divmod(hours, 60)
    hours, minutes = divmod(hours, 60)
    result = '{0:02}:{1:02}:{2:02}'.format(hours, minutes, seconds)
    if value.days > 0:
        result = '{0} days '.format(value.days) + result
    return result
app.jinja_env.filters['timedeltaformat'] = format_timedelta


def linecount(value):
    return len(value.splitlines())
app.jinja_env.filters['linecount'] = linecount


@app.route('/')
def index():
    now = utcnow()
    stack_top = None
    key = conn.lindex('stack', 0)
    if not key and conn.exists('tasks/idle'):
        key = conn.get('tasks/idle')
    if key:
        task = load_task(key)
        task['elapsed'] = now - task['created_at']
        stack_top = task
    stack_size = max(0, conn.llen('stack') - 1)
    return render_template('index.html', now=now,
                           top=stack_top, size=stack_size)


@app.route('/tasks/push')
def form_push_task():
    return render_template('push_task.html')


@app.route('/tasks', methods=['POST'])
def push_task():
    title = request.form['title']
    context = request.form.get('context', u'')
    now = utcnow()
    key = add_task(title, created_at=now, context=context)
    if conn.llen('stack') <= 0 and conn.exists('tasks/idle'):
        conn.set(conn.get('tasks/idle') + '/completed_at', now.isoformat())
    conn.lpush('stack', key)
    conn.rpush('archive', key)
    return redirect(url_for('index'))


@app.route('/tasks/<task_id>/edit', methods=['POST'])
def edit_task(task_id):
    key = 'tasks/{0}'.format(task_id)
    if not conn.exists(key + '/context'):
        abort(404)
    context = request.form['context']
    conn.set(key + '/context', context)
    return redirect(url_for('index'))


@app.route('/tasks/pop', methods=['POST'])
def pop_task():
    stack_size = conn.llen('stack')
    if stack_size <= 0:
        abort(400)
    key = conn.lpop('stack')
    now = utcnow()
    conn.set(key + '/completed_at', now.isoformat())
    if conn.llen('stack') == 0:
        key = add_task(u'Idle', created_at=now)
        conn.set('tasks/idle', key)
    return redirect(url_for('index'))


def add_task(title, created_at=None, context=u''):
    created_at = created_at or utcnow()
    key = 'tasks/{0}'.format(created_at.isoformat())
    conn.set(key + '/title', title)
    conn.set(key + '/context', context)
    return key


def load_task(key):
    created_at = iso8601.parse_date(key[6:])
    return {'id': key.rsplit('/', 1)[-1],
            'title': unicode(conn.get(key + '/title'), 'utf-8'),
            'context': unicode(conn.get(key + '/context'), 'utf-8'),
            'created_at': created_at}
