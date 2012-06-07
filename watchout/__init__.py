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


@app.route('/')
def index():
    now = utcnow()
    stack_keys = conn.lrange('stack', 0, -1)
    stack = []
    for key in stack_keys:
        created_at = iso8601.parse_date(key[6:])
        stack.append({
            'id': key.rsplit('/', 1)[-1],
            'title': unicode(conn.get(key + '/title'), 'utf-8'),
            'context': unicode(conn.get(key + '/context'), 'utf-8'),
            'created_at': created_at,
            'elapsed': now - created_at})
    stack_top = None
    if stack:
        stack_top = stack.pop(0)
    return render_template('index.html', now=now, stack=stack, top=stack_top)


@app.route('/tasks/add')
def form_add_task():
    return render_template('add_task.html')


@app.route('/tasks', methods=['POST'])
def add_task():
    title = request.form['title']
    context = request.form.get('context', u'')
    now = utcnow()
    key = 'tasks/{0}'.format(now.isoformat())
    conn.set(key + '/title', title)
    conn.set(key + '/context', context)
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
    if conn.llen('stack') <= 0:
        abort(400)
    key = conn.lpop('stack')
    now = utcnow()
    conn.set(key + '/completed_at', now.isoformat())
    return redirect(url_for('index'))
